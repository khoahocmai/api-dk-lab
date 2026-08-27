import {
  buildClientSchema,
  getIntrospectionQuery,
  getNamedType,
  IntrospectionQuery,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  parse,
  type DocumentNode,
  type GraphQLInputType,
  type GraphQLOutputType,
  type SelectionSetNode,
} from 'graphql'
import type { EnvironmentItem, GraphField, GraphInputField, GraphOutputField } from '../types'
import { capitalize, sanitizeVariableName } from '../utils/formatters'
import { sendHttpRequest } from './httpService'
import { resolveTemplates } from './templateService'

export function getIntrospectionEndpointAndHeaders(activeEnvironment?: EnvironmentItem | null): {
  resolvedUrl: string
  headers: Record<string, string>
} {
  // 1. Luôn lấy Domain từ Environment đang kích hoạt
  const domainVar = activeEnvironment?.variables.find(
    (v) => v.enabled && v.key.trim().toLowerCase() === 'domain',
  )?.value?.trim()

  const rawUrl = domainVar
    ? `${domainVar.replace(/\/+$/, '')}/graphql`
    : '{{Domain}}/graphql'

  // 2. Resolve template sang URL thực tế
  let resolvedUrl = resolveTemplates(rawUrl, activeEnvironment).trim()
  if (resolvedUrl && !resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
    resolvedUrl = `http://${resolvedUrl}`
  }

  // 3. Lấy Token Authorization từ Environment (nếu có)
  const tokenVar = activeEnvironment?.variables.find(
    (v) =>
      v.enabled &&
      (v.key.trim().toLowerCase() === 'token' || v.key.trim().toLowerCase() === 'authorization'),
  )?.value?.trim()

  const resolvedToken = tokenVar ? resolveTemplates(tokenVar, activeEnvironment).trim() : ''

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(resolvedToken
      ? {
          Authorization: resolvedToken.toLowerCase().startsWith('bearer ')
            ? resolvedToken
            : `Bearer ${resolvedToken}`,
        }
      : {}),
  }

  return { resolvedUrl, headers }
}

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

export function outputFieldsForType(
  type: GraphQLOutputType,
  depth = 0,
  seen = new Set<string>(),
): GraphOutputField[] {
  if (depth > 6) return []
  const namedType = getNamedType(type)
  if (!namedType) return []
  if ((!isObjectType(namedType) && !isInterfaceType(namedType)) || seen.has(namedType.name)) {
    return []
  }

  const nextSeen = new Set(seen)
  nextSeen.add(namedType.name)

  try {
    const fieldMap = namedType.getFields()
    if (!fieldMap) return []

    return Object.values(fieldMap).map((field) => {
      const isScalar = isLeafGraphqlOutput(field.type)
      const isList =
        isListType(field.type) ||
        (isNonNullType(field.type) && isListType(field.type.ofType))

      let subFields: GraphOutputField[] | undefined
      if (!isScalar) {
        subFields = outputFieldsForType(field.type, depth + 1, nextSeen)
      }

      return {
        name: field.name,
        typeLabel: String(field.type),
        isScalar,
        isList,
        fields: subFields && subFields.length > 0 ? subFields : undefined,
      }
    })
  } catch {
    return []
  }
}

export function selectionFieldsForOutputType(type: GraphQLOutputType): string[] {
  const namedType = getNamedType(type)
  if (!namedType || (!isObjectType(namedType) && !isInterfaceType(namedType))) return []

  try {
    const scalarFields = Object.values(namedType.getFields())
      .filter((field) => isLeafGraphqlOutput(field.type))
      .map((field) => field.name)

    const preferredOrder = ['id', 'code', 'name', 'title', 'total', 'message', 'status', 'success', 'createdAt', 'updatedAt']
    return scalarFields
      .sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a)
        const bIndex = preferredOrder.indexOf(b)
        if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex
        if (aIndex >= 0) return -1
        if (bIndex >= 0) return 1
        return a.localeCompare(b)
      })
      .slice(0, 2)
  } catch {
    return []
  }
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
      outputFields: outputFieldsForType(field.type),
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

export function getGraphArgKey(kind: 'query' | 'mutation', fieldName: string, argName: string): string {
  return `${kind}:${fieldName}:arg:${argName}`
}

export function getGraphInputFieldKey(
  kind: 'query' | 'mutation',
  fieldName: string,
  argName: string,
  inputFieldName: string,
): string {
  return `${kind}:${fieldName}:arg:${argName}:input:${inputFieldName}`
}

export function getGraphOutputFieldKey(
  kind: 'query' | 'mutation',
  fieldName: string,
  path: string,
): string {
  return `${kind}:${fieldName}:out:${path}`
}

export interface SelectionTree {
  [key: string]: SelectionTree | null
}

export function pathsToSelectionTree(paths: string[]): SelectionTree {
  const root: SelectionTree = {}
  for (const path of paths) {
    const parts = path.split('.')
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (i === parts.length - 1) {
        if (!current[part]) {
          current[part] = null
        }
      } else {
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {}
        }
        current = current[part] as SelectionTree
      }
    }
  }
  return root
}

export function formatSelectionTree(tree: SelectionTree, indent = '    '): string[] {
  const lines: string[] = []
  for (const [key, children] of Object.entries(tree)) {
    if (!children || Object.keys(children).length === 0) {
      lines.push(`${indent}${key}`)
    } else {
      const subLines = formatSelectionTree(children, `${indent}  `)
      lines.push(`${indent}${key} {\n${subLines.join('\n')}\n${indent}}`)
    }
  }
  return lines
}

export function buildGraphOperationFromFields(
  kind: 'query' | 'mutation',
  fields: GraphField[],
  selectedKeys?: string[] | Set<string>,
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

  const keySet = selectedKeys
    ? selectedKeys instanceof Set
      ? selectedKeys
      : new Set(selectedKeys)
    : null

  const usedVariableNames = new Set<string>()
  const variables: Record<string, unknown> = {}
  const variableDefinitions: string[] = []

  const lines = fields.map((field) => {
    // An argument is included if:
    // 1. keySet is null (default mode: include primary args, omit bulky optional filters), OR
    // 2. The argument itself is in keySet, OR
    // 3. For object arguments with inputFields, at least one child input field is in keySet
    const applicableArgs = field.args.filter((arg) => {
      if (!keySet) {
        const isRequired = arg.typeLabel.includes('!')
        const isFilter = arg.name.toLowerCase().includes('filter') || arg.name.toLowerCase().includes('where')
        if (isFilter && !isRequired) return false
        return true
      }
      const argKey = getGraphArgKey(kind, field.name, arg.name)
      if (keySet.has(argKey)) return true
      if (arg.inputFields.length > 0) {
        return arg.inputFields.some((inf) =>
          keySet.has(getGraphInputFieldKey(kind, field.name, arg.name, inf.name)),
        )
      }
      return false
    })

    const argParts = applicableArgs.map((arg) => {
      const baseName = fields.length === 1 ? arg.name : `${field.name}${capitalize(arg.name)}`
      let variableName = sanitizeVariableName(baseName)
      let index = 2
      while (usedVariableNames.has(variableName)) {
        variableName = `${sanitizeVariableName(baseName)}${index}`
        index += 1
      }

      usedVariableNames.add(variableName)

      let varValue = arg.emptyValue

      // If this is an object argument with child input fields:
      if (arg.inputFields.length > 0) {
        if (keySet) {
          const selectedInputFields = arg.inputFields.filter((inf) => {
            const infKey = getGraphInputFieldKey(kind, field.name, arg.name, inf.name)
            return keySet.has(infKey)
          })

          if (selectedInputFields.length > 0) {
            // Build object containing ONLY the selected child fields
            const filteredObj: Record<string, unknown> = {}
            selectedInputFields.forEach((inf) => {
              filteredObj[inf.name] = inf.emptyValue
            })
            varValue = filteredObj
          } else if (keySet.has(getGraphArgKey(kind, field.name, arg.name))) {
            // Parent argument explicitly checked: pick at most 2 basic fields
            const preferredFields = ['page', 'pageSize', 'limit', 'offset', 'skip', 'take']
            const sortedFields = [...arg.inputFields].sort((a, b) => {
              const aIndex = preferredFields.indexOf(a.name)
              const bIndex = preferredFields.indexOf(b.name)
              if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex
              if (aIndex >= 0) return -1
              if (bIndex >= 0) return 1
              return 0
            })
            const topFields = sortedFields.slice(0, 2)
            const filteredObj: Record<string, unknown> = {}
            topFields.forEach((inf) => {
              filteredObj[inf.name] = inf.emptyValue
            })
            varValue = filteredObj
          }
        } else {
          // Default mode (e.g. quick insert): pick at most 2 basic fields
          const preferredFields = ['page', 'pageSize', 'limit', 'offset', 'skip', 'take']
          const sortedFields = [...arg.inputFields].sort((a, b) => {
            const aIndex = preferredFields.indexOf(a.name)
            const bIndex = preferredFields.indexOf(b.name)
            if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex
            if (aIndex >= 0) return -1
            if (bIndex >= 0) return 1
            return 0
          })
          const topFields = sortedFields.slice(0, 2)
          const filteredObj: Record<string, unknown> = {}
          topFields.forEach((inf) => {
            filteredObj[inf.name] = inf.emptyValue
          })
          varValue = filteredObj
        }
      }

      variables[variableName] = varValue
      variableDefinitions.push(`$${variableName}: ${arg.typeLabel}`)
      return `${arg.name}: $${variableName}`
    })

    const argsText = argParts.length ? `(${argParts.join(', ')})` : ''

    if (field.isScalarResult) return `  ${field.name}${argsText}`

    // Build selection set from selected output field paths if present
    let selectionLines: string[] = []
    if (keySet) {
      const outPrefix = `${kind}:${field.name}:out:`
      const selectedOutPaths = Array.from(keySet)
        .filter((k) => k.startsWith(outPrefix))
        .map((k) => k.slice(outPrefix.length))

      if (selectedOutPaths.length > 0) {
        const tree = pathsToSelectionTree(selectedOutPaths)
        selectionLines = formatSelectionTree(tree, '    ')
      }
    }

    if (selectionLines.length === 0) {
      const defaultSelection = field.selectionFields.length ? field.selectionFields : ['__typename']
      selectionLines = defaultSelection.map((item) => `    ${item}`)
    }

    return `  ${field.name}${argsText} {\n${selectionLines.join('\n')}\n  }`
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

export function deepMergePreserveVariables(
  currentVars: unknown,
  newVars: unknown,
): unknown {
  if (typeof newVars !== 'object' || newVars === null || Array.isArray(newVars)) {
    if (currentVars !== undefined && currentVars !== null) {
      return currentVars
    }
    return newVars
  }

  const currentObj =
    typeof currentVars === 'object' && currentVars !== null && !Array.isArray(currentVars)
      ? (currentVars as Record<string, unknown>)
      : {}

  const newObj = newVars as Record<string, unknown>
  const result: Record<string, unknown> = {}

  for (const [key, val] of Object.entries(newObj)) {
    if (key in currentObj) {
      result[key] = deepMergePreserveVariables(currentObj[key], val)
    } else {
      result[key] = val
    }
  }

  return result
}

function extractOutputPathsFromSelectionSet(
  selectionSet: SelectionSetNode,
  currentPath = '',
): string[] {
  const paths: string[] = []
  for (const selection of selectionSet.selections) {
    if (selection.kind === 'Field') {
      const fieldName = selection.name.value
      if (fieldName === '__typename') continue
      const fullPath = currentPath ? `${currentPath}.${fieldName}` : fieldName
      paths.push(fullPath)
      if (selection.selectionSet && selection.selectionSet.selections.length > 0) {
        paths.push(...extractOutputPathsFromSelectionSet(selection.selectionSet, fullPath))
      }
    }
  }
  return paths
}

export function parseRelaxedJSON(jsonString: string): unknown {
  if (!jsonString || !jsonString.trim()) return {}
  // Sanitize trailing commas before closing braces/brackets
  const sanitized = jsonString.replace(/,(\s*[}\]])/g, '$1').trim()
  return JSON.parse(sanitized)
}

export function extractVariablePathsFromJSON(jsonString: string): Set<string> | null {
  if (!jsonString || !jsonString.trim()) {
    return new Set<string>()
  }

  let parsed: unknown
  try {
    parsed = parseRelaxedJSON(jsonString)
  } catch {
    // ⚠️ QUAN TRỌNG: Return null on syntax error so we don't wipe out existing selection while user types
    return null
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return new Set<string>()
  }

  const paths = new Set<string>()

  const traverse = (obj: Record<string, unknown>, currentPath = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key
      paths.add(fullPath)

      // Traverse deeper for plain nested objects (skip arrays and primitives)
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        traverse(value as Record<string, unknown>, fullPath)
      }
    }
  }

  traverse(parsed as Record<string, unknown>)
  return paths
}

export function extractOutputPathsFromQuery(gqlQuery: string): {
  kind: 'query' | 'mutation'
  fieldName: string
  outputPaths: Set<string>
} | null {
  if (!gqlQuery || !gqlQuery.trim()) return null

  let doc: DocumentNode
  try {
    doc = parse(gqlQuery)
  } catch {
    // Return null on syntax error while typing
    return null
  }

  for (const def of doc.definitions) {
    if (def.kind !== 'OperationDefinition') continue
    const kind: 'query' | 'mutation' = def.operation === 'mutation' ? 'mutation' : 'query'

    if (!def.selectionSet) continue

    for (const selection of def.selectionSet.selections) {
      if (selection.kind !== 'Field') continue
      const fieldName = selection.name.value
      if (fieldName === '__typename') continue

      const outputPaths = new Set<string>()
      if (selection.selectionSet) {
        const paths = extractOutputPathsFromSelectionSet(selection.selectionSet)
        paths.forEach((p) => outputPaths.add(p))
      }

      return { kind, fieldName, outputPaths }
    }
  }

  return null
}

export function computeReverseSyncKeys(
  currentKeys: string[],
  gqlQuery: string,
  gqlVariables: string,
  availableFields: {
    queryFields: GraphField[]
    mutationFields: GraphField[]
  },
  graphqlRootField?: string,
): string[] {
  const queryInfo = extractOutputPathsFromQuery(gqlQuery)
  const varPaths = extractVariablePathsFromJSON(gqlVariables)

  // If both query and variables have syntax errors or empty, keep current keys
  if (queryInfo === null && varPaths === null) {
    return currentKeys
  }

  // Determine current active kind and field
  const kind: 'query' | 'mutation' = queryInfo?.kind || 'query'
  const fieldsList =
    kind === 'mutation' ? availableFields.mutationFields : availableFields.queryFields

  let fieldName = graphqlRootField || queryInfo?.fieldName || ''
  if (!fieldName && currentKeys.length > 0) {
    // Fallback: extract fieldName from existing root key (e.g. 'query:orderPaginationList')
    const rootKey = currentKeys.find(
      (k) => k.startsWith(`${kind}:`) && !k.includes(':arg:') && !k.includes(':out:'),
    )
    if (rootKey) {
      fieldName = rootKey.split(':')[1] || ''
    }
  }

  const fieldSchema = fieldsList.find(
    (f) => f.name.toLowerCase() === fieldName.toLowerCase(),
  )
  const resolvedFieldName = fieldSchema ? fieldSchema.name : fieldName

  if (!resolvedFieldName) {
    return currentKeys
  }

  const rootFieldKey = getGraphFieldKey(kind, resolvedFieldName)

  // Start building nextKeys
  const nextKeys = new Set<string>()
  nextKeys.add(rootFieldKey)

  // 1. Output keys (Return fields):
  if (queryInfo !== null) {
    // Query parsed successfully: use freshly extracted output paths
    for (const outPath of queryInfo.outputPaths) {
      nextKeys.add(getGraphOutputFieldKey(kind, resolvedFieldName, outPath))
    }
  } else {
    // Query had syntax error while typing: preserve existing output keys
    const outPrefix = `${kind}:${resolvedFieldName}:out:`
    for (const key of currentKeys) {
      if (key.startsWith(outPrefix)) {
        nextKeys.add(key)
      }
    }
  }

  // 2. Input keys (Arguments & Child Input Fields):
  if (varPaths !== null) {
    // Variables parsed successfully: extract inputs strictly based on existing paths in JSON
    if (fieldSchema) {
      fieldSchema.args.forEach((arg) => {
        const exactArg = arg.name
        const prefixedArg = `${resolvedFieldName}${capitalize(arg.name)}`

        const argKey = getGraphArgKey(kind, resolvedFieldName, arg.name)

        if (arg.inputFields.length > 0) {
          let checkedChildCount = 0

          arg.inputFields.forEach((inf) => {
            const path1 = `${exactArg}.${inf.name}`
            const path2 = `${prefixedArg}.${inf.name}`

            if (varPaths.has(path1) || varPaths.has(path2)) {
              checkedChildCount += 1
              nextKeys.add(
                getGraphInputFieldKey(kind, resolvedFieldName, arg.name, inf.name),
              )
            }
          })

          if (checkedChildCount > 0 && checkedChildCount === arg.inputFields.length) {
            nextKeys.add(argKey)
          }
        } else {
          // Scalar / flat argument
          if (varPaths.has(exactArg) || varPaths.has(prefixedArg)) {
            nextKeys.add(argKey)
          }
        }
      })
    }
  } else {
    // Variables had syntax error while typing: preserve existing argument / input keys
    const argPrefix = `${kind}:${resolvedFieldName}:arg:`
    for (const key of currentKeys) {
      if (key.startsWith(argPrefix)) {
        nextKeys.add(key)
      }
    }
  }

  return Array.from(nextKeys)
}

export function extractGraphQLRootInfo(request?: {
  graphqlRootField?: string
  gqlQuery?: string
  name?: string
} | null): { rootFieldName: string; kind: 'QUERY' | 'MUTATION' } {
  if (!request) {
    return { rootFieldName: '', kind: 'QUERY' }
  }

  let rootFieldName = request.graphqlRootField?.trim() || ''
  let kind: 'QUERY' | 'MUTATION' = 'QUERY'

  const queryText = request.gqlQuery?.trim() || ''

  if (queryText) {
    const queryInfo = extractOutputPathsFromQuery(queryText)
    if (queryInfo) {
      if (!rootFieldName) {
        rootFieldName = queryInfo.fieldName
      }
      kind = queryInfo.kind === 'mutation' ? 'MUTATION' : 'QUERY'
    } else {
      if (/\bmutation\b/i.test(queryText)) {
        kind = 'MUTATION'
      } else {
        kind = 'QUERY'
      }

      if (!rootFieldName) {
        const match = queryText.match(/\{\s*(?:#[^\n]*\n\s*)*([a-zA-Z0-9_]+)/)
        if (match && match[1] && !['query', 'mutation', 'subscription'].includes(match[1].toLowerCase())) {
          rootFieldName = match[1]
        }
      }
    }
  }

  if (!rootFieldName && request.name) {
    const trimmedName = request.name.trim()
    if (/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmedName)) {
      rootFieldName = trimmedName
    }
  }

  return { rootFieldName, kind }
}
