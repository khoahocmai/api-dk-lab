import type { EnvironmentItem, EnvironmentVariable, KeyValueRow } from '../types'

export type TemplateTokenType = 'text' | 'variable' | 'path_variable'

export interface TemplateToken {
  type: TemplateTokenType
  raw: string
  varName: string
}

export interface VariableDetail {
  name: string
  rawToken?: string
  type: 'environment' | 'path'
  exists: boolean
  enabled: boolean
  secret?: boolean
  value: string
  scopeName: string
  variable?: EnvironmentVariable | null
}

const TEMPLATE_REGEX = /{{\s*([^{}\s]+)\s*}}/g

/**
 * Parses a string containing template variables (e.g. {{Domain}}/api/users)
 * and optionally path variables (:param_name) into tokens.
 */
export function parseTemplateTokens(
  input: string,
  supportPathVariables: boolean = false,
): TemplateToken[] {
  if (!input) return []

  if (!supportPathVariables) {
    const tokens: TemplateToken[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    TEMPLATE_REGEX.lastIndex = 0

    while ((match = TEMPLATE_REGEX.exec(input)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          type: 'text',
          raw: input.substring(lastIndex, match.index),
          varName: '',
        })
      }

      tokens.push({
        type: 'variable',
        raw: match[0],
        varName: match[1],
      })

      lastIndex = TEMPLATE_REGEX.lastIndex
    }

    if (lastIndex < input.length) {
      tokens.push({
        type: 'text',
        raw: input.substring(lastIndex),
        varName: '',
      })
    }

    return tokens
  }

  // When supportPathVariables is true: split URL at query/hash boundary
  const queryIndex = input.indexOf('?')
  const hashIndex = input.indexOf('#')
  const splitIndex =
    queryIndex !== -1 && hashIndex !== -1
      ? Math.min(queryIndex, hashIndex)
      : queryIndex !== -1
        ? queryIndex
        : hashIndex

  const pathPart = splitIndex === -1 ? input : input.slice(0, splitIndex)
  const queryPart = splitIndex === -1 ? '' : input.slice(splitIndex)

  const tokens: TemplateToken[] = []

  // Matches either {{variable}} or :path_variable preceded by / or start of line
  const combinedRegex = /({{\s*([^{}\s]+)\s*}})|(?:(?<=\/|^)(:([a-zA-Z0-9_]+))(?=[/?#]|$))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = combinedRegex.exec(pathPart)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        raw: pathPart.substring(lastIndex, match.index),
        varName: '',
      })
    }

    if (match[1]) {
      // {{variable}}
      tokens.push({
        type: 'variable',
        raw: match[1],
        varName: match[2],
      })
    } else if (match[3]) {
      // :path_variable
      tokens.push({
        type: 'path_variable',
        raw: match[3],
        varName: match[4],
      })
    }

    lastIndex = combinedRegex.lastIndex
  }

  if (lastIndex < pathPart.length) {
    tokens.push({
      type: 'text',
      raw: pathPart.substring(lastIndex),
      varName: '',
    })
  }

  // Tokenize query/hash part (only environment variables {{var}})
  if (queryPart) {
    const envRegex = /{{\s*([^{}\s]+)\s*}}/g
    let queryLastIndex = 0
    let queryMatch: RegExpExecArray | null

    while ((queryMatch = envRegex.exec(queryPart)) !== null) {
      if (queryMatch.index > queryLastIndex) {
        tokens.push({
          type: 'text',
          raw: queryPart.substring(queryLastIndex, queryMatch.index),
          varName: '',
        })
      }
      tokens.push({
        type: 'variable',
        raw: queryMatch[0],
        varName: queryMatch[1],
      })
      queryLastIndex = envRegex.lastIndex
    }

    if (queryLastIndex < queryPart.length) {
      tokens.push({
        type: 'text',
        raw: queryPart.substring(queryLastIndex),
        varName: '',
      })
    }
  }

  return tokens
}

/**
 * Retrieves environment variable detail (existence, scope, value, secret flag)
 * from the currently active environment.
 */
export function getVariableDetail(
  varName: string,
  environment?: EnvironmentItem | null,
): VariableDetail {
  if (!environment || !varName) {
    return {
      name: varName,
      type: 'environment',
      exists: false,
      enabled: false,
      secret: false,
      value: '',
      scopeName: environment ? environment.name : 'No Environment',
      variable: null,
    }
  }

  const trimmed = varName.trim().toLowerCase()
  const found = environment.variables.find(
    (v) => v.key.trim().toLowerCase() === trimmed,
  )

  if (!found) {
    return {
      name: varName,
      type: 'environment',
      exists: false,
      enabled: false,
      secret: false,
      value: '',
      scopeName: environment.name,
      variable: null,
    }
  }

  return {
    name: found.key || varName,
    type: 'environment',
    exists: true,
    enabled: found.enabled,
    secret: Boolean(found.secret),
    value: found.value ?? '',
    scopeName: environment.name,
    variable: found,
  }
}

/**
 * Retrieves path variable detail from the active request's pathVariables list.
 */
export function getPathVariableDetail(
  varName: string,
  pathVariables?: KeyValueRow[] | null,
): VariableDetail {
  const cleanKey = varName.startsWith(':') ? varName.slice(1) : varName
  const found = (pathVariables || []).find(
    (pv) => pv.key.trim().toLowerCase() === cleanKey.trim().toLowerCase(),
  )

  if (!found) {
    return {
      name: cleanKey,
      rawToken: `:${cleanKey}`,
      type: 'path',
      exists: true,
      enabled: true,
      value: '',
      scopeName: 'Path Variable (Params)',
      variable: null,
    }
  }

  return {
    name: found.key || cleanKey,
    rawToken: `:${found.key || cleanKey}`,
    type: 'path',
    exists: true,
    enabled: found.enabled !== false,
    value: found.value ?? '',
    scopeName: 'Path Variable (Params)',
    variable: null,
  }
}
