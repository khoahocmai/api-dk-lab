import type { EnvironmentItem, EnvironmentVariable } from '../types'

export interface TemplateToken {
  type: 'text' | 'variable'
  raw: string
  varName: string
}

export interface VariableDetail {
  name: string
  exists: boolean
  enabled: boolean
  secret: boolean
  value: string
  scopeName: string
  variable: EnvironmentVariable | null
}

const TEMPLATE_REGEX = /{{\s*([^{}\s]+)\s*}}/g

/**
 * Parses a string containing template variables (e.g. {{Domain}}/api/users)
 * into text and variable tokens.
 */
export function parseTemplateTokens(input: string): TemplateToken[] {
  if (!input) return []

  const tokens: TemplateToken[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  // Reset regex state
  TEMPLATE_REGEX.lastIndex = 0

  while ((match = TEMPLATE_REGEX.exec(input)) !== null) {
    // Push preceding text token if any
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        raw: input.substring(lastIndex, match.index),
        varName: '',
      })
    }

    // Push variable token
    tokens.push({
      type: 'variable',
      raw: match[0],
      varName: match[1],
    })

    lastIndex = TEMPLATE_REGEX.lastIndex
  }

  // Push trailing text token if any
  if (lastIndex < input.length) {
    tokens.push({
      type: 'text',
      raw: input.substring(lastIndex),
      varName: '',
    })
  }

  return tokens
}

/**
 * Retrieves variable detail (existence, scope, value, secret flag)
 * from the currently active environment.
 */
export function getVariableDetail(
  varName: string,
  environment?: EnvironmentItem | null,
): VariableDetail {
  if (!environment || !varName) {
    return {
      name: varName,
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
    exists: true,
    enabled: found.enabled,
    secret: Boolean(found.secret),
    value: found.value ?? '',
    scopeName: environment.name,
    variable: found,
  }
}
