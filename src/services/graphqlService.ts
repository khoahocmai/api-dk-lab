import {
  buildClientSchema,
  getIntrospectionQuery,
  getNamedType,
  IntrospectionQuery,
  isEnumType,
  isInputObjectType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  type GraphQLInputType,
  type GraphQLOutputType,
} from 'graphql'
import type { GraphField, GraphInputField } from '../types'
import { capitalize, sanitizeVariableName } from '../utils/formatters'
import { sendHttpRequest } from './httpService'

export function emptyValueForInputType(type: GraphQLInputType, seen = new Set<string>()): unknown {
  if (isNonNullType(type)) return emptyValueForInputType(type.ofType, seen)
  if (isListType(type)) return []

  const namedType = getNamedType(type)

  if (isInputObjectType(namedType)) {
    if (seen.has(namedType.name)) return {}

    const nextSeen = new Set(seen)
    nextSeen.add(namedType.name)

    return Object.fromEntries(
      Object.values(namedType.getFields()).map((field) => [
        field.name,
        emptyValueForInputType(field.type, nextSeen),
      ]),
    )
  }

  if (isEnumType(namedType)) return ''
  if (isScalarType(namedType)) {
    switch (namedType.name) {
      case 'Boolean':
        return false
      case 'Int':
      case 'Float':
        return 0
      case 'JSON':
      case 'JSONObject':
        return {}
      case 'ID':
      case 'String':
      case 'Date':
      case 'DateTime':
      case 'Time':
        return ''
      default:
        return null
    }
  }

  return null
}

export function inputFieldsForType(type: GraphQLInputType, seen = new Set<string>()): GraphInputField[] {
  const namedType = getNamedType(type)
  if (!isInputObjectType(namedType) || seen.has(namedType.name)) return []

  const nextSeen = new Set(seen)
  nextSeen.add(namedType.name)

  return Object.values(namedType.getFields()).map((field) => ({
    name: field.name,
    typeLabel: String(field.type),
    emptyValue: emptyValueForInputType(field.type, nextSeen),
  }))
}

export function isLeafGraphqlOutput(type: GraphQLOutputType): boolean {
  const namedType = getNamedType(type)
  return isScalarType(namedType) || isEnumType(namedType)
}

export function selectionFieldsForOutputType(type: GraphQLOutputType): string[] {
  const namedType = getNamedType(type)
  if (!isObjectType(namedType)) return []

  const scalarFields = Object.values(namedType.getFields())
    .filter((field) => isLeafGraphqlOutput(field.type))
    .map((field) => field.name)

  const preferredOrder = ['id', 'code', 'name', 'title', 'message', 'status', 'success', 'createdAt', 'updatedAt']
  return scalarFields
    .sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a)
      const bIndex = preferredOrder.indexOf(b)
      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex
      if (aIndex >= 0) return -1
      if (bIndex >= 0) return 1
      return a.localeCompare(b)
    })
    .slice(0, 16)
}

export function extractGraphFields(schemaData: IntrospectionQuery): {
  queryFields: GraphField[]
  mutationFields: GraphField[]
} {
  const schema = buildClientSchema(schemaData)
  const queryType = schema.getQueryType()
  const mutationType = schema.getMutationType()

  const mapFields = (typeObj: unknown): GraphField[] => {
    if (!typeObj || !isObjectType(typeObj)) return []

    return Object.values(typeObj.getFields()).map((field) => ({
      name: field.name,
      typeLabel: String(field.type),
      args: field.args?.map((arg) => ({
        name: arg.name,
        typeLabel: String(arg.type),
        emptyValue: emptyValueForInputType(arg.type),
        inputFields: inputFieldsForType(arg.type),
      })) ?? [],
      selectionFields: selectionFieldsForOutputType(field.type),
      isScalarResult: isLeafGraphqlOutput(field.type),
    }))
  }

  return {
    queryFields: mapFields(queryType),
    mutationFields: mapFields(mutationType),
  }
}

export function getGraphFieldKey(kind: 'query' | 'mutation', fieldName: string): string {
  return `${kind}:${fieldName}`
}

export function buildGraphOperationFromFields(
  kind: 'query' | 'mutation',
  fields: GraphField[],
): {
  query: string
  variables: Record<string, unknown>
} {
  if (!fields.length) {
    return {
      query: '',
      variables: {},
    }
  }

  const usedVariableNames = new Set<string>()
  const variables: Record<string, unknown> = {}
  const variableDefinitions: string[] = []

  const lines = fields.map((field) => {
    const argParts = field.args.map((arg) => {
      const baseName = fields.length === 1 ? arg.name : `${field.name}${capitalize(arg.name)}`
      let variableName = sanitizeVariableName(baseName)
      let index = 2
      while (usedVariableNames.has(variableName)) {
        variableName = `${sanitizeVariableName(baseName)}${index}`
        index += 1
      }

      usedVariableNames.add(variableName)
      variables[variableName] = arg.emptyValue
      variableDefinitions.push(`$${variableName}: ${arg.typeLabel}`)
      return `${arg.name}: $${variableName}`
    })

    const argsText = argParts.length ? `(${argParts.join(', ')})` : ''

    if (field.isScalarResult) return `  ${field.name}${argsText}`

    const selection = field.selectionFields.length ? field.selectionFields : ['__typename']
    return `  ${field.name}${argsText} {\n${selection.map((item) => `    ${item}`).join('\n')}\n  }`
  })

  const operationName = fields.length === 1 ? capitalize(fields[0].name) : `Generated${capitalize(kind)}`
  const definitions = variableDefinitions.length ? `(${variableDefinitions.join(', ')})` : ''

  return {
    query: `${kind} ${operationName}${definitions} {\n${lines.join('\n')}\n}`,
    variables,
  }
}

export async function fetchGraphQLSchema(
  url: string,
  headers: Record<string, string>,
): Promise<{
  queryFields: GraphField[]
  mutationFields: GraphField[]
}> {
  const result = await sendHttpRequest({
    method: 'POST',
    url,
    headers,
    data: { query: getIntrospectionQuery() },
    timeout: 30000,
  })

  if (result.error) {
    throw new Error(result.error)
  }

  const payload = result.data as { data?: IntrospectionQuery; errors?: Array<{ message?: string }> } | undefined
  if (payload?.errors?.length) {
    throw new Error(payload.errors[0]?.message || 'Không load được schema')
  }

  if (!payload?.data) {
    throw new Error('Dữ liệu Schema không hợp lệ')
  }

  return extractGraphFields(payload.data)
}
