import type { AuthConfig, EnvironmentItem, KeyValueRow, RequestItem } from '../types'
import { normalizeHeaders } from '../utils/formatters'

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function resolveTemplates(input: string, environment?: EnvironmentItem | null): string {
  if (!environment || !input) return input

  let output = input
  environment.variables
    .filter((item) => item.enabled && item.key.trim())
    .forEach((item) => {
      const pattern = new RegExp(`{{\\s*${escapeRegExp(item.key)}\\s*}}`, 'g')
      output = output.replace(pattern, item.value ?? '')
    })

  return output
}

export function resolveHeadersList(
  headersList: KeyValueRow[],
  headersText: string,
  environment?: EnvironmentItem | null,
): Record<string, string> {
  const result: Record<string, string> = {}

  if (headersList && headersList.length > 0) {
    headersList
      .filter((h) => h.enabled && h.key.trim() !== '')
      .forEach((h) => {
        const resolvedKey = resolveTemplates(h.key.trim(), environment)
        const resolvedVal = resolveTemplates(h.value, environment)
        if (resolvedKey) {
          result[resolvedKey] = resolvedVal
        }
      })
    return result
  }

  // Fallback to JSON headersText
  try {
    return normalizeHeaders(resolveTemplates(headersText, environment))
  } catch {
    return {}
  }
}

/**
 * Injects Authorization header from AuthConfig if configured.
 */
export function injectAuthToHeaders(
  headers: Record<string, string>,
  auth: AuthConfig,
  environment?: EnvironmentItem | null,
): Record<string, string> {
  const finalHeaders = { ...headers }

  if (auth.type === 'bearer' && auth.bearerToken.trim()) {
    const token = resolveTemplates(auth.bearerToken.trim(), environment)
    finalHeaders['Authorization'] = `Bearer ${token}`
  } else if (auth.type === 'basic') {
    const username = resolveTemplates(auth.basicUsername, environment)
    const password = resolveTemplates(auth.basicPassword, environment)
    if (username || password) {
      try {
        const encoded = btoa(`${username}:${password}`)
        finalHeaders['Authorization'] = `Basic ${encoded}`
      } catch {
        // ignore
      }
    }
  } else if (
    auth.type === 'apiKey' &&
    auth.apiKeyAddTo === 'header' &&
    auth.apiKeyName.trim()
  ) {
    const key = resolveTemplates(auth.apiKeyName.trim(), environment)
    const value = resolveTemplates(auth.apiKeyValue, environment)
    finalHeaders[key] = value
  }

  return finalHeaders
}

/**
 * Injects API Key query param to URL if configured for query.
 */
export function injectAuthToUrl(
  url: string,
  auth: AuthConfig,
  environment?: EnvironmentItem | null,
): string {
  if (auth.type === 'apiKey' && auth.apiKeyAddTo === 'query' && auth.apiKeyName.trim()) {
    const key = resolveTemplates(auth.apiKeyName.trim(), environment)
    const val = resolveTemplates(auth.apiKeyValue, environment)
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(val)}`
  }
  return url
}

export function getHostSafely(url: string): string {
  try {
    const normalized = url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`
    return new URL(normalized).host
  } catch {
    return ''
  }
}

export function hasAuthorizationHeader(
  headersText: string,
  headersList: KeyValueRow[] | undefined,
  auth: AuthConfig | undefined,
  environment: EnvironmentItem | null,
): boolean {
  if (auth && (auth.type === 'bearer' || auth.type === 'basic')) {
    return true
  }

  if (headersList && headersList.length > 0) {
    return headersList.some(
      (h) => h.enabled && h.key.trim().toLowerCase() === 'authorization',
    )
  }

  try {
    const headers = normalizeHeaders(resolveTemplates(headersText, environment))
    return Object.keys(headers).some((key) => key.toLowerCase() === 'authorization')
  } catch {
    return headersText.toLowerCase().includes('authorization')
  }
}

export function shouldWarnDomainMismatch(
  tab: RequestItem | undefined,
  environment: EnvironmentItem | null,
): boolean {
  if (!tab || !environment) return false

  const finalUrl = resolveTemplates(tab.url, environment)
  const targetHost = getHostSafely(finalUrl)
  const domainValue =
    environment.variables.find((item) => item.enabled && item.key.toLowerCase() === 'domain')
      ?.value ?? ''
  const envHost = getHostSafely(domainValue)

  return Boolean(
    targetHost &&
      envHost &&
      targetHost !== envHost &&
      hasAuthorizationHeader(tab.headersText, tab.headersList, tab.auth, environment),
  )
}
