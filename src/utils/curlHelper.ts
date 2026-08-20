import type {
  AuthConfig,
  BodyType,
  EnvironmentItem,
  HttpMethod,
  KeyValueRow,
  RequestItem,
} from '../types'
import { createId } from './formatters'
import {
  parseHeadersTextToRows,
  parseUrlToQueryParams,
} from './urlHelper'
import { resolveTemplates } from '../services/templateService'

/**
 * Parses a standard cURL command string into partial RequestItem state.
 */
export function parseCurlCommand(rawCurl: string): Partial<RequestItem> | null {
  const cleaned = rawCurl
    .trim()
    .replace(/\\\r?\n/g, ' ')
    .replace(/\s+/g, ' ')

  if (!cleaned.toLowerCase().startsWith('curl')) {
    return null
  }

  // Tokenize preserving quoted strings
  const tokens: string[] = []
  let currentToken = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let escaped = false

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]

    if (escaped) {
      currentToken += char
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      if (currentToken.length > 0) {
        tokens.push(currentToken)
        currentToken = ''
      }
      continue
    }

    currentToken += char
  }

  if (currentToken.length > 0) {
    tokens.push(currentToken)
  }

  let method: HttpMethod = 'GET'
  let url = ''
  const headers: KeyValueRow[] = []
  let bodyType: BodyType = 'none'
  let restBody = ''
  let rawText = ''
  const formData: KeyValueRow[] = []
  const urlencoded: KeyValueRow[] = []
  let hasExplicitMethod = false

  const auth: AuthConfig = {
    type: 'none',
    bearerToken: '',
    basicUsername: '',
    basicPassword: '',
    apiKeyName: '',
    apiKeyValue: '',
    apiKeyAddTo: 'header',
  }

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i]

    // Method flag
    if (token === '-X' || token === '--request') {
      const next = tokens[i + 1]
      if (next && !next.startsWith('-')) {
        method = next.toUpperCase() as HttpMethod
        hasExplicitMethod = true
        i++
      }
      continue
    }

    // Headers flag
    if (token === '-H' || token === '--header') {
      const next = tokens[i + 1]
      if (next) {
        const colonIdx = next.indexOf(':')
        if (colonIdx !== -1) {
          const key = next.slice(0, colonIdx).trim()
          const value = next.slice(colonIdx + 1).trim()

          // Check if bearer auth
          if (key.toLowerCase() === 'authorization' && value.toLowerCase().startsWith('bearer ')) {
            auth.type = 'bearer'
            auth.bearerToken = value.slice(7).trim()
          } else if (
            key.toLowerCase() === 'authorization' &&
            value.toLowerCase().startsWith('basic ')
          ) {
            auth.type = 'basic'
            try {
              const decoded = atob(value.slice(6).trim())
              const [u, p] = decoded.split(':')
              auth.basicUsername = u || ''
              auth.basicPassword = p || ''
            } catch {
              // keep as header if cannot decode
            }
          }

          headers.push({
            id: createId(),
            key,
            value,
            enabled: true,
          })
        }
        i++
      }
      continue
    }

    // Basic Auth user flag
    if (token === '-u' || token === '--user') {
      const next = tokens[i + 1]
      if (next) {
        const [username, ...rest] = next.split(':')
        auth.type = 'basic'
        auth.basicUsername = username || ''
        auth.basicPassword = rest.join(':') || ''
        i++
      }
      continue
    }

    // Body data flag
    if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-ascii'
    ) {
      const next = tokens[i + 1]
      if (next) {
        if (!hasExplicitMethod) method = 'POST'
        const trimmed = next.trim()

        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          bodyType = 'json'
          restBody = trimmed
        } else if (trimmed.includes('=') && !trimmed.includes('\n')) {
          bodyType = 'x-www-form-urlencoded'
          const pairs = trimmed.split('&')
          pairs.forEach((pair) => {
            const [k, v] = pair.split('=')
            if (k) {
              urlencoded.push({
                id: createId(),
                key: decodeURIComponent(k),
                value: decodeURIComponent(v || ''),
                enabled: true,
              })
            }
          })
        } else {
          bodyType = 'raw'
          rawText = trimmed
        }
        i++
      }
      continue
    }

    // Form data flag
    if (token === '-F' || token === '--form') {
      const next = tokens[i + 1]
      if (next) {
        if (!hasExplicitMethod) method = 'POST'
        bodyType = 'form-data'
        const eqIdx = next.indexOf('=')
        if (eqIdx !== -1) {
          formData.push({
            id: createId(),
            key: next.slice(0, eqIdx).trim(),
            value: next.slice(eqIdx + 1).trim(),
            enabled: true,
          })
        }
        i++
      }
      continue
    }

    // URL token (starts with http or not starting with -)
    if (!token.startsWith('-') && !url) {
      url = token
    }
  }

  if (!url) return null

  const { params } = parseUrlToQueryParams(url)

  return {
    name: `cURL (${method})`,
    mode: 'REST',
    method,
    url,
    params,
    headersList: headers.length > 0 ? headers : parseHeadersTextToRows(''),
    auth,
    bodyType,
    restBody,
    rawText,
    formData,
    urlencoded,
    editorTab: 'PARAMS',
  }
}

/**
 * Generates an executable cURL command string from a RequestItem.
 */
export function generateCurlCommand(
  request: RequestItem,
  environment?: EnvironmentItem | null,
): string {
  const finalUrl = resolveTemplates(request.url, environment)
  const lines: string[] = [`curl --location --request ${request.method} '${finalUrl}'`]

  // Collect headers
  const headersRecord: Record<string, string> = {}

  request.headersList
    .filter((h) => h.enabled && h.key.trim() !== '')
    .forEach((h) => {
      const k = resolveTemplates(h.key.trim(), environment)
      const v = resolveTemplates(h.value, environment)
      headersRecord[k] = v
    })

  // Inject Auth header
  if (request.auth.type === 'bearer' && request.auth.bearerToken.trim()) {
    const token = resolveTemplates(request.auth.bearerToken.trim(), environment)
    headersRecord['Authorization'] = `Bearer ${token}`
  } else if (request.auth.type === 'basic') {
    const username = resolveTemplates(request.auth.basicUsername, environment)
    const password = resolveTemplates(request.auth.basicPassword, environment)
    if (username || password) {
      try {
        const encoded = btoa(`${username}:${password}`)
        headersRecord['Authorization'] = `Basic ${encoded}`
      } catch {
        // ignore
      }
    }
  } else if (
    request.auth.type === 'apiKey' &&
    request.auth.apiKeyAddTo === 'header' &&
    request.auth.apiKeyName.trim()
  ) {
    const name = resolveTemplates(request.auth.apiKeyName.trim(), environment)
    const val = resolveTemplates(request.auth.apiKeyValue, environment)
    headersRecord[name] = val
  }

  // Set content-type according to body type if not present
  if (request.mode === 'GRAPHQL') {
    if (!headersRecord['Content-Type']) headersRecord['Content-Type'] = 'application/json'
  } else if (!['GET', 'DELETE'].includes(request.method)) {
    if (request.bodyType === 'json' && !headersRecord['Content-Type']) {
      headersRecord['Content-Type'] = 'application/json'
    } else if (request.bodyType === 'x-www-form-urlencoded') {
      headersRecord['Content-Type'] = 'application/x-www-form-urlencoded'
    }
  }

  // Add headers to curl lines
  Object.entries(headersRecord).forEach(([k, v]) => {
    lines.push(`--header '${k}: ${v.replace(/'/g, "\\'")}'`)
  })

  // Add body
  if (request.mode === 'GRAPHQL') {
    let vars: Record<string, unknown> = {}
    try {
      vars = request.gqlVariables.trim()
        ? JSON.parse(resolveTemplates(request.gqlVariables, environment))
        : {}
    } catch {
      // ignore
    }
    const payload = JSON.stringify({
      query: resolveTemplates(request.gqlQuery, environment),
      variables: vars,
    })
    lines.push(`--data '${payload.replace(/'/g, "\\'")}'`)
  } else if (!['GET', 'DELETE'].includes(request.method)) {
    if (request.bodyType === 'json' && request.restBody.trim()) {
      const payload = resolveTemplates(request.restBody, environment)
      lines.push(`--data '${payload.replace(/'/g, "\\'")}'`)
    } else if (request.bodyType === 'raw' && request.rawText) {
      const payload = resolveTemplates(request.rawText, environment)
      lines.push(`--data '${payload.replace(/'/g, "\\'")}'`)
    } else if (request.bodyType === 'x-www-form-urlencoded') {
      const params = new URLSearchParams()
      request.urlencoded
        .filter((r) => r.enabled && r.key.trim())
        .forEach((r) => {
          params.append(
            resolveTemplates(r.key.trim(), environment),
            resolveTemplates(r.value, environment),
          )
        })
      if (params.toString()) {
        lines.push(`--data '${params.toString().replace(/'/g, "\\'")}'`)
      }
    } else if (request.bodyType === 'form-data') {
      request.formData
        .filter((r) => r.enabled && r.key.trim())
        .forEach((r) => {
          const k = resolveTemplates(r.key.trim(), environment)
          const v = resolveTemplates(r.value, environment)
          lines.push(`--form '${k}=${v.replace(/'/g, "\\'")}'`)
        })
    }
  }

  return lines.join(' \\\n  ')
}
