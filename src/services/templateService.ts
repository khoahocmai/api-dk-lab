import type { AuthConfig, EnvironmentItem, KeyValueRow, RequestItem } from '../types'
import { createId, normalizeHeaders } from '../utils/formatters'

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function resolveTemplates(input: string, environment?: EnvironmentItem | null): string {
  if (!input || typeof input !== 'string' || !environment || !Array.isArray(environment.variables)) {
    return input
  }

  let result = input
  let iterations = 0
  const maxIterations = 5

  while (iterations < maxIterations && result.includes('{{')) {
    let replacedAny = false
    const nextResult = result.replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (match, varName) => {
      const trimmedVar = varName.trim().toLowerCase()
      const foundVar = environment.variables.find(
        (v) => v.enabled && v.key.trim().toLowerCase() === trimmedVar,
      )
      if (foundVar && foundVar.value !== undefined) {
        replacedAny = true
        return String(foundVar.value)
      }
      return match
    })

    result = nextResult
    if (!replacedAny) break
    iterations++
  }

  return result
}

export const resolveTemplateVariables = resolveTemplates

/**
 * Normalizes a Bearer token value by prepending 'Bearer ' if not already present.
 * If tokenValue is empty or whitespace, returns an empty string.
 * Preserves existing 'Bearer ' prefix (case-insensitive).
 */
export function formatBearerHeader(tokenValue: string): string {
  if (!tokenValue || !tokenValue.trim()) return ''
  const trimmed = tokenValue.trim()
  // Nếu chuỗi đã bắt đầu bằng "Bearer " (không phân biệt hoa thường), giữ nguyên
  if (/^Bearer\s+/i.test(trimmed)) {
    return trimmed
  }
  // Nếu chưa có, tự động thêm tiền tố "Bearer "
  return `Bearer ${trimmed}`
}

/**
 * Extracts path variable keys from the path part of a URL (tokens starting with :).
 * e.g., "https://api.com/users/:userId/orders/:orderId" -> ["userId", "orderId"]
 */
export function extractPathKeys(url: string): string[] {
  if (!url || !url.includes(':')) return []

  const queryIndex = url.indexOf('?')
  const hashIndex = url.indexOf('#')
  const splitIndex =
    queryIndex !== -1 && hashIndex !== -1
      ? Math.min(queryIndex, hashIndex)
      : queryIndex !== -1
        ? queryIndex
        : hashIndex

  const pathPart = splitIndex === -1 ? url : url.slice(0, splitIndex)

  const regex = /(?:\/|^):([a-zA-Z0-9_]+)(?=[/?#]|$)/g
  const keys: string[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(pathPart)) !== null) {
    if (match[1] && !keys.includes(match[1])) {
      keys.push(match[1])
    }
  }

  return keys
}

/**
 * Synchronizes path variables from URL with existing path variables array,
 * preserving existing values, descriptions, and IDs.
 */
export function syncPathVariables(
  url: string,
  existingPathVars: KeyValueRow[] = [],
): KeyValueRow[] {
  const keys = extractPathKeys(url)
  if (keys.length === 0) return []

  const existingMap = new Map<string, KeyValueRow>()
  ;(existingPathVars || []).forEach((pv) => {
    if (pv.key) {
      existingMap.set(pv.key, pv)
    }
  })

  return keys.map((key) => {
    const existing = existingMap.get(key)
    if (existing) {
      return {
        ...existing,
        key,
      }
    }
    return {
      id: createId(),
      key,
      value: '',
      enabled: true,
      description: '',
    }
  })
}

/**
 * Resolves path variables in a URL by replacing :key tokens with their values.
 */
export function resolvePathVariables(
  url: string,
  pathVariables?: KeyValueRow[] | null,
  environment?: EnvironmentItem | null,
): string {
  if (!pathVariables || pathVariables.length === 0 || !url.includes(':')) {
    return url
  }

  const queryIndex = url.indexOf('?')
  const hashIndex = url.indexOf('#')
  const splitIndex =
    queryIndex !== -1 && hashIndex !== -1
      ? Math.min(queryIndex, hashIndex)
      : queryIndex !== -1
        ? queryIndex
        : hashIndex

  let pathPart = splitIndex === -1 ? url : url.slice(0, splitIndex)
  const restPart = splitIndex === -1 ? '' : url.slice(splitIndex)

  for (const pv of pathVariables) {
    if (pv.key && pv.enabled !== false) {
      const resolvedVal = resolveTemplates(pv.value || '', environment)
      if (resolvedVal) {
        const regex = new RegExp(`:${escapeRegExp(pv.key)}(?=[/?#]|$)`, 'g')
        pathPart = pathPart.replace(regex, encodeURIComponent(resolvedVal))
      }
    }
  }

  return `${pathPart}${restPart}`
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

  // Case-insensitive removal helper to eliminate duplicate header keys
  const removeHeaderCaseInsensitive = (name: string) => {
    const lower = name.toLowerCase()
    Object.keys(finalHeaders).forEach((k) => {
      if (k.toLowerCase() === lower) {
        delete finalHeaders[k]
      }
    })
  }

  const authType = String(auth?.type || '').toLowerCase()

  if (authType === 'bearer' && auth.bearerToken?.trim()) {
    removeHeaderCaseInsensitive('Authorization')
    const token = resolveTemplates(auth.bearerToken.trim(), environment)
    finalHeaders['Authorization'] = formatBearerHeader(token)
  } else if (authType === 'basic') {
    removeHeaderCaseInsensitive('Authorization')
    const username = resolveTemplates(auth.basicUsername || '', environment)
    const password = resolveTemplates(auth.basicPassword || '', environment)
    if (username || password) {
      try {
        const encoded = btoa(`${username}:${password}`)
        finalHeaders['Authorization'] = `Basic ${encoded}`
      } catch {
        // ignore
      }
    }
  } else if (
    authType === 'apikey' &&
    auth.apiKeyAddTo === 'header' &&
    auth.apiKeyName?.trim()
  ) {
    const key = resolveTemplates(auth.apiKeyName.trim(), environment)
    removeHeaderCaseInsensitive(key)
    const value = resolveTemplates(auth.apiKeyValue || '', environment)
    finalHeaders[key] = value
  }

  return finalHeaders
}

/**
 * Computes Postman-style auto-generated / system headers for UI display.
 */
export function getAutoGeneratedHeaders(
  request: RequestItem,
  environment?: EnvironmentItem | null,
): KeyValueRow[] {
  const list: KeyValueRow[] = []

  // 1. Host
  let hostVal = '<calculated when request is sent>'
  try {
    if (request.url) {
      const urlWithPathVars = resolvePathVariables(
        request.url,
        request.pathVariables,
        environment,
      )
      const resolved = resolveTemplates(urlWithPathVars, environment)
      const normalized =
        resolved.startsWith('http://') || resolved.startsWith('https://')
          ? resolved
          : `http://${resolved}`
      const h = new URL(normalized).host
      if (h && !h.includes('{{')) {
        hostVal = h
      }
    }
  } catch {
    // fallback
  }
  list.push({
    id: 'auto-header-host',
    key: 'Host',
    value: hostVal,
    description: 'Calculated host from request URL',
    enabled: true,
  })

  // 2. User-Agent
  list.push({
    id: 'auto-header-ua',
    key: 'User-Agent',
    value: 'APILabRuntime/1.0',
    description: 'Default client user agent',
    enabled: true,
  })

  // 3. Accept
  list.push({
    id: 'auto-header-accept',
    key: 'Accept',
    value: '*/*',
    description: 'Accept any MIME type',
    enabled: true,
  })

  // 4. Accept-Encoding
  list.push({
    id: 'auto-header-ae',
    key: 'Accept-Encoding',
    value: 'gzip, deflate, br',
    description: 'Supported response encodings',
    enabled: true,
  })

  // 5. Connection
  list.push({
    id: 'auto-header-conn',
    key: 'Connection',
    value: 'keep-alive',
    description: 'Keep connection alive',
    enabled: true,
  })

  // 6. Content-Type (based on Body type)
  if (request.mode === 'GRAPHQL') {
    list.push({
      id: 'auto-header-ct',
      key: 'Content-Type',
      value: 'application/json',
      description: 'Auto-generated from GraphQL Body',
      enabled: true,
    })
  } else if (request.bodyType && request.bodyType !== 'none') {
    let ct = ''
    if (request.bodyType === 'json') ct = 'application/json'
    else if (request.bodyType === 'x-www-form-urlencoded') ct = 'application/x-www-form-urlencoded'
    else if (request.bodyType === 'form-data') ct = 'multipart/form-data; boundary=<calculated when request is sent>'
    else if (request.bodyType === 'raw') ct = 'text/plain'

    if (ct) {
      list.push({
        id: 'auto-header-ct',
        key: 'Content-Type',
        value: ct,
        description: `Auto-generated from Body (${request.bodyType})`,
        enabled: true,
      })
    }
  }

  // 7. Authorization (based on Auth type)
  const authType = String(request.auth?.type || '').toLowerCase()
  if (request.auth && authType !== 'none') {
    if (authType === 'bearer') {
      const rawToken = request.auth.bearerToken?.trim() || ''
      const tokenDisplay = rawToken
        ? formatBearerHeader(rawToken)
        : 'Bearer <token>'
      list.push({
        id: 'auto-header-auth',
        key: 'Authorization',
        value: tokenDisplay,
        description: 'Auto-generated from Auth (Bearer Token)',
        enabled: true,
      })
    } else if (authType === 'basic') {
      const u = request.auth.basicUsername || ''
      const p = request.auth.basicPassword || ''
      let val = 'Basic <credentials>'
      if (u || p) {
        if (!u.includes('{{') && !p.includes('{{')) {
          try {
            val = `Basic ${btoa(`${u}:${p}`)}`
          } catch {
            val = 'Basic <credentials>'
          }
        } else {
          val = `Basic <${u || 'user'}:${p ? '••••••' : ''}>`
        }
      }
      list.push({
        id: 'auto-header-auth',
        key: 'Authorization',
        value: val,
        description: 'Auto-generated from Auth (Basic Auth)',
        enabled: true,
      })
    } else if (
      authType === 'apikey' &&
      request.auth.apiKeyAddTo === 'header' &&
      request.auth.apiKeyName?.trim()
    ) {
      list.push({
        id: 'auto-header-auth',
        key: request.auth.apiKeyName.trim(),
        value: request.auth.apiKeyValue || '',
        description: 'Auto-generated from Auth (API Key)',
        enabled: true,
      })
    }
  }

  return list
}

/**
 * Builds the final merged headers for sending requests or generating cURL/code.
 * Auto-generated headers are merged with User headers, where User headers have HIGHEST priority.
 */
export function buildFinalHeaders(
  request: RequestItem,
  environment?: EnvironmentItem | null,
): Record<string, string> {
  const headers: Record<string, string> = {}

  const setHeaderCaseInsensitive = (name: string, value: string) => {
    const lower = name.toLowerCase()
    Object.keys(headers).forEach((k) => {
      if (k.toLowerCase() === lower) {
        delete headers[k]
      }
    })
    headers[name] = value
  }

  // 1. Base default headers
  setHeaderCaseInsensitive('Accept', '*/*')
  setHeaderCaseInsensitive('Accept-Encoding', 'gzip, deflate, br')
  setHeaderCaseInsensitive('Connection', 'keep-alive')
  setHeaderCaseInsensitive('User-Agent', 'APILabRuntime/1.0')

  // 2. Content-Type from Body
  if (request.mode === 'GRAPHQL') {
    setHeaderCaseInsensitive('Content-Type', 'application/json')
  } else if (request.bodyType && request.bodyType !== 'none') {
    if (request.bodyType === 'json') setHeaderCaseInsensitive('Content-Type', 'application/json')
    else if (request.bodyType === 'x-www-form-urlencoded')
      setHeaderCaseInsensitive('Content-Type', 'application/x-www-form-urlencoded')
    else if (request.bodyType === 'form-data') {
      // NOTE: Do NOT set Content-Type: multipart/form-data here.
      // Multipart requests require a boundary parameter that must be generated dynamically by FormData/engine at runtime.
    } else if (request.bodyType === 'raw') setHeaderCaseInsensitive('Content-Type', 'text/plain')
  }

  // 3. Auth Header from Auth Tab (if configured)
  const reqAuthType = String(request.auth?.type || '').toLowerCase()
  if (request.auth && reqAuthType !== 'none') {
    if (reqAuthType === 'bearer' && request.auth.bearerToken?.trim()) {
      const token = resolveTemplates(request.auth.bearerToken.trim(), environment)
      setHeaderCaseInsensitive('Authorization', formatBearerHeader(token))
    } else if (reqAuthType === 'basic') {
      const username = resolveTemplates(request.auth.basicUsername || '', environment)
      const password = resolveTemplates(request.auth.basicPassword || '', environment)
      if (username || password) {
        try {
          setHeaderCaseInsensitive('Authorization', `Basic ${btoa(`${username}:${password}`)}`)
        } catch {
          // ignore
        }
      }
    } else if (
      reqAuthType === 'apikey' &&
      request.auth.apiKeyAddTo === 'header' &&
      request.auth.apiKeyName?.trim()
    ) {
      const key = resolveTemplates(request.auth.apiKeyName.trim(), environment)
      const val = resolveTemplates(request.auth.apiKeyValue || '', environment)
      setHeaderCaseInsensitive(key, val)
    }
  }

  // 4. User Headers (HIGHEST PRIORITY - Overrides any auto-generated headers)
  if (request.headersList && request.headersList.length > 0) {
    request.headersList
      .filter((h) => h.enabled && h.key.trim() !== '')
      .forEach((h) => {
        const resolvedKey = resolveTemplates(h.key.trim(), environment)
        const resolvedVal = resolveTemplates(h.value, environment)
        if (resolvedKey) {
          // If bodyType is form-data and user header is multipart/form-data without boundary, strip it to prevent "Unexpected end of form"
          if (
            request.bodyType === 'form-data' &&
            resolvedKey.toLowerCase() === 'content-type' &&
            (resolvedVal.toLowerCase() === 'multipart/form-data' ||
              (resolvedVal.toLowerCase().startsWith('multipart/form-data') &&
                !resolvedVal.toLowerCase().includes('boundary=')))
          ) {
            return
          }
          setHeaderCaseInsensitive(resolvedKey, resolvedVal)
        }
      })
  } else if (request.headersText?.trim()) {
    try {
      const parsed = normalizeHeaders(resolveTemplates(request.headersText, environment))
      Object.entries(parsed).forEach(([k, v]) => {
        if (
          request.bodyType === 'form-data' &&
          k.toLowerCase() === 'content-type' &&
          (v.toLowerCase() === 'multipart/form-data' ||
            (v.toLowerCase().startsWith('multipart/form-data') &&
              !v.toLowerCase().includes('boundary=')))
        ) {
          return
        }
        setHeaderCaseInsensitive(k, v)
      })
    } catch {
      // ignore
    }
  }

  return headers
}

/**
 * Injects API Key query param to URL if configured for query.
 */
export function injectAuthToUrl(
  url: string,
  auth: AuthConfig,
  environment?: EnvironmentItem | null,
): string {
  const authType = String(auth?.type || '').toLowerCase()
  if (authType === 'apikey' && auth.apiKeyAddTo === 'query' && auth.apiKeyName?.trim()) {
    const key = resolveTemplates(auth.apiKeyName.trim(), environment)
    const val = resolveTemplates(auth.apiKeyValue, environment)
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(val)}`
  }
  return url
}
