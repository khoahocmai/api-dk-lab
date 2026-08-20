import type {
  AuthConfig,
  BodyType,
  EnvironmentItem,
  HttpMethod,
  KeyValueRow,
  Mode,
  RequestItem,
} from '../types'
import { createId } from './formatters'
import { parseUrlToQueryParams } from './urlHelper'
import { resolveTemplates } from '../services/templateService'

/**
 * Unescapes standard ANSI-C quoting escape sequences:
 * \n, \r, \t, \v, \f, \a, \b, \e, \E, \\, \', \", \?, \xHH, \uHHHH, \U00HHHHHH, \ooo
 */
export function unescapeAnsiC(str: string): string {
  return str.replace(
    /\\([0-7]{1,3}|x[0-9a-fA-F]{1,2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|c.|[abefnrtv\\'"?])/g,
    (match, p1) => {
      const first = p1[0]
      if (first === 'n') return '\n'
      if (first === 'r') return '\r'
      if (first === 't') return '\t'
      if (first === 'b') return '\b'
      if (first === 'f') return '\f'
      if (first === 'v') return '\v'
      if (first === 'a') return '\x07'
      if (first === 'e' || first === 'E') return '\x1B'
      if (first === '\\') return '\\'
      if (first === "'") return "'"
      if (first === '"') return '"'
      if (first === '?') return '?'
      if (first === 'x') {
        return String.fromCharCode(parseInt(p1.slice(1), 16))
      }
      if (first === 'u') {
        return String.fromCharCode(parseInt(p1.slice(1), 16))
      }
      if (first === 'U') {
        return String.fromCodePoint(parseInt(p1.slice(1), 16))
      }
      if (first === 'c') {
        const char = p1[1].toUpperCase()
        return String.fromCharCode(char.charCodeAt(0) % 32)
      }
      if (/^[0-7]+$/.test(p1)) {
        return String.fromCharCode(parseInt(p1, 8))
      }
      return match
    },
  )
}

/**
 * Tokenizes a shell cURL command string into an array of argument tokens.
 * Handles:
 * - Line continuations (\\n, `\n)
 * - ANSI-C quoting ($'...', $"...")
 * - Single quotes ('...')
 * - Double quotes ("...")
 * - Escapes (\\ , \\", \\', \\\\)
 */
export function tokenizeCurlCommand(cmd: string): string[] {
  let text = cmd.trim()
  // Clean line continuations
  text = text.replace(/\\\r?\n/g, ' ').replace(/`\r?\n/g, ' ')

  // Strip leading terminal prompts like '$ curl' or '> curl' or 'PS > curl'
  text = text.replace(/^[#$>]?\s*(curl(?:\.exe)?)\b/i, '$1')

  const curlMatch = text.match(/\bcurl(?:\.exe)?\b/i)
  if (!curlMatch || curlMatch.index === undefined) {
    return []
  }

  let i = curlMatch.index + curlMatch[0].length
  const tokens: string[] = []
  let currentToken = ''
  let inToken = false

  while (i < text.length) {
    const char = text[i]

    // Skip whitespace outside of tokens
    if (!inToken && (char === ' ' || char === '\t' || char === '\r' || char === '\n')) {
      i++
      continue
    }

    // ANSI-C single quoting: $'...'
    if (char === '$' && text[i + 1] === "'") {
      inToken = true
      i += 2 // skip $'
      let rawAnsi = ''
      while (i < text.length) {
        if (text[i] === '\\' && i + 1 < text.length) {
          rawAnsi += text[i] + text[i + 1]
          i += 2
        } else if (text[i] === "'") {
          i++ // skip closing '
          break
        } else {
          rawAnsi += text[i]
          i++
        }
      }
      currentToken += unescapeAnsiC(rawAnsi)
      continue
    }

    // ANSI-C double quoting: $"..."
    if (char === '$' && text[i + 1] === '"') {
      inToken = true
      i += 2 // skip $"
      let rawAnsi = ''
      while (i < text.length) {
        if (text[i] === '\\' && i + 1 < text.length) {
          rawAnsi += text[i] + text[i + 1]
          i += 2
        } else if (text[i] === '"') {
          i++ // skip closing "
          break
        } else {
          rawAnsi += text[i]
          i++
        }
      }
      currentToken += unescapeAnsiC(rawAnsi)
      continue
    }

    // Standard single quotes: '...'
    if (char === "'") {
      inToken = true
      i++ // skip opening '
      let singleContent = ''
      while (i < text.length) {
        if (text[i] === '\\' && text[i + 1] === "'") {
          singleContent += "'"
          i += 2
        } else if (text[i] === "'") {
          i++ // skip closing '
          break
        } else {
          singleContent += text[i]
          i++
        }
      }
      currentToken += singleContent
      continue
    }

    // Standard double quotes: "..."
    if (char === '"') {
      inToken = true
      i++ // skip opening "
      let doubleContent = ''
      while (i < text.length) {
        if (text[i] === '\\' && i + 1 < text.length) {
          const nextChar = text[i + 1]
          if (nextChar === '"') doubleContent += '"'
          else if (nextChar === '\\') doubleContent += '\\'
          else if (nextChar === '$') doubleContent += '$'
          else if (nextChar === '`') doubleContent += '`'
          else if (nextChar === 'n') doubleContent += '\n'
          else if (nextChar === 'r') doubleContent += '\r'
          else if (nextChar === 't') doubleContent += '\t'
          else doubleContent += '\\' + nextChar
          i += 2
        } else if (text[i] === '"') {
          i++ // skip closing "
          break
        } else {
          doubleContent += text[i]
          i++
        }
      }
      currentToken += doubleContent
      continue
    }

    // Escaped character outside quotes
    if (char === '\\' && i + 1 < text.length) {
      inToken = true
      currentToken += text[i + 1]
      i += 2
      continue
    }

    // Whitespace delimiter
    if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
      if (inToken) {
        tokens.push(currentToken)
        currentToken = ''
        inToken = false
      }
      i++
      continue
    }

    // Regular character
    inToken = true
    currentToken += char
    i++
  }

  if (inToken || currentToken.length > 0) {
    tokens.push(currentToken)
  }

  return tokens
}

/**
 * Formats a GraphQL query string with indentation if minified.
 */
export function formatGraphQLQuery(query: string): string {
  if (!query) return ''
  const trimmed = query.trim()
  if (trimmed.includes('\n')) {
    return trimmed
  }

  let indent = 0
  let formatted = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]

    if (escaped) {
      formatted += char
      escaped = false
      continue
    }

    if (char === '\\') {
      formatted += char
      escaped = true
      continue
    }

    if (char === '"') {
      formatted += char
      inString = !inString
      continue
    }

    if (inString) {
      formatted += char
      continue
    }

    if (char === '{') {
      indent += 2
      formatted += ' {\n' + ' '.repeat(indent)
    } else if (char === '}') {
      indent = Math.max(0, indent - 2)
      formatted += '\n' + ' '.repeat(indent) + '}'
    } else if (char === ',') {
      formatted += ',\n' + ' '.repeat(indent)
    } else {
      formatted += char
    }
  }

  return formatted.trim()
}

/**
 * Parses and adds a header string into the headers list & record, and extracts auth tokens.
 */
function parseAndAddHeader(
  headerStr: string,
  headersList: KeyValueRow[],
  headersRecord: Record<string, string>,
  auth: AuthConfig,
) {
  const colonIdx = headerStr.indexOf(':')
  if (colonIdx === -1) return

  const key = headerStr.slice(0, colonIdx).trim()
  const value = headerStr.slice(colonIdx + 1).trim()
  if (!key) return

  const lowerKey = key.toLowerCase()
  headersRecord[lowerKey] = value

  // Check Bearer / Basic Authentication
  if (lowerKey === 'authorization') {
    if (value.toLowerCase().startsWith('bearer ')) {
      auth.type = 'bearer'
      auth.bearerToken = value.slice(7).trim()
    } else if (value.toLowerCase().startsWith('basic ')) {
      auth.type = 'basic'
      try {
        const decoded = atob(value.slice(6).trim())
        const [u, ...p] = decoded.split(':')
        auth.basicUsername = u || ''
        auth.basicPassword = p.join(':') || ''
      } catch {
        // Keep as is if decode fails
      }
    }
  }

  headersList.push({
    id: createId(),
    key,
    value,
    enabled: true,
  })
}

/**
 * Parses a standard or complex cURL command string into partial RequestItem state.
 */
export function parseCurlCommand(rawCurl: string): Partial<RequestItem> | null {
  if (!rawCurl || typeof rawCurl !== 'string') return null

  const trimmed = rawCurl.trim()
  if (!trimmed.toLowerCase().includes('curl')) return null

  const tokens = tokenizeCurlCommand(trimmed)
  if (tokens.length === 0) return null

  let method: HttpMethod = 'GET'
  let hasExplicitMethod = false
  let url = ''
  const headersList: KeyValueRow[] = []
  const headersRecord: Record<string, string> = {}
  let bodyType: BodyType = 'none'
  let rawBody = ''
  let restBody = ''
  let rawText = ''
  const formData: KeyValueRow[] = []
  const urlencoded: KeyValueRow[] = []

  const auth: AuthConfig = {
    type: 'none',
    bearerToken: '',
    basicUsername: '',
    basicPassword: '',
    apiKeyName: '',
    apiKeyValue: '',
    apiKeyAddTo: 'header',
  }

  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i]

    // Handle --flag=value
    let inlineValue: string | null = null
    if (token.startsWith('--') && token.includes('=')) {
      const eqIdx = token.indexOf('=')
      inlineValue = token.slice(eqIdx + 1)
      token = token.slice(0, eqIdx)
    }

    const getNextValue = (): string | null => {
      if (inlineValue !== null) {
        const val = inlineValue
        inlineValue = null
        return val
      }
      if (i + 1 < tokens.length) {
        i++
        return tokens[i]
      }
      return null
    }

    // URL flag: --url <url>
    if (token === '--url') {
      const val = getNextValue()
      if (val) url = val
      continue
    }

    // Method flag: -X, --request
    if (token === '-X' || token === '--request') {
      const val = getNextValue()
      if (val) {
        method = val.toUpperCase() as HttpMethod
        hasExplicitMethod = true
      }
      continue
    }
    if (token.startsWith('-X') && token.length > 2) {
      method = token.slice(2).toUpperCase() as HttpMethod
      hasExplicitMethod = true
      continue
    }

    // Headers flag: -H, --header
    if (token === '-H' || token === '--header') {
      const val = getNextValue()
      if (val) {
        parseAndAddHeader(val, headersList, headersRecord, auth)
      }
      continue
    }
    if (token.startsWith('-H') && token.length > 2) {
      parseAndAddHeader(token.slice(2), headersList, headersRecord, auth)
      continue
    }

    // User auth flag: -u, --user
    if (token === '-u' || token === '--user') {
      const val = getNextValue()
      if (val) {
        const colonIdx = val.indexOf(':')
        auth.type = 'basic'
        if (colonIdx !== -1) {
          auth.basicUsername = val.slice(0, colonIdx)
          auth.basicPassword = val.slice(colonIdx + 1)
        } else {
          auth.basicUsername = val
          auth.basicPassword = ''
        }
      }
      continue
    }
    if (token.startsWith('-u') && token.length > 2) {
      const val = token.slice(2)
      const colonIdx = val.indexOf(':')
      auth.type = 'basic'
      if (colonIdx !== -1) {
        auth.basicUsername = val.slice(0, colonIdx)
        auth.basicPassword = val.slice(colonIdx + 1)
      } else {
        auth.basicUsername = val
        auth.basicPassword = ''
      }
      continue
    }

    // Body data flags: -d, --data, --data-raw, --data-binary, --data-ascii
    if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-ascii'
    ) {
      const val = getNextValue()
      if (val !== null) {
        if (!hasExplicitMethod) method = 'POST'
        rawBody = val
      }
      continue
    }
    if (token.startsWith('-d') && token.length > 2) {
      if (!hasExplicitMethod) method = 'POST'
      rawBody = token.slice(2)
      continue
    }

    // URL-encoded data: --data-urlencode
    if (token === '--data-urlencode') {
      const val = getNextValue()
      if (val) {
        if (!hasExplicitMethod) method = 'POST'
        bodyType = 'x-www-form-urlencoded'
        const eqIdx = val.indexOf('=')
        if (eqIdx !== -1) {
          urlencoded.push({
            id: createId(),
            key: val.slice(0, eqIdx).trim(),
            value: val.slice(eqIdx + 1),
            enabled: true,
          })
        } else {
          urlencoded.push({
            id: createId(),
            key: val.trim(),
            value: '',
            enabled: true,
          })
        }
      }
      continue
    }

    // Form data flag: -F, --form
    if (token === '-F' || token === '--form') {
      const val = getNextValue()
      if (val) {
        if (!hasExplicitMethod) method = 'POST'
        bodyType = 'form-data'
        const eqIdx = val.indexOf('=')
        if (eqIdx !== -1) {
          formData.push({
            id: createId(),
            key: val.slice(0, eqIdx).trim(),
            value: val.slice(eqIdx + 1).trim(),
            enabled: true,
          })
        } else {
          formData.push({
            id: createId(),
            key: val.trim(),
            value: '',
            enabled: true,
          })
        }
      }
      continue
    }
    if (token.startsWith('-F') && token.length > 2) {
      if (!hasExplicitMethod) method = 'POST'
      bodyType = 'form-data'
      const val = token.slice(2)
      const eqIdx = val.indexOf('=')
      if (eqIdx !== -1) {
        formData.push({
          id: createId(),
          key: val.slice(0, eqIdx).trim(),
          value: val.slice(eqIdx + 1).trim(),
          enabled: true,
        })
      }
      continue
    }

    // Headers via convenience flags: -A/--user-agent, -b/--cookie, -e/--referer
    if (token === '-A' || token === '--user-agent') {
      const val = getNextValue()
      if (val) parseAndAddHeader(`User-Agent: ${val}`, headersList, headersRecord, auth)
      continue
    }
    if (token === '-b' || token === '--cookie') {
      const val = getNextValue()
      if (val) parseAndAddHeader(`Cookie: ${val}`, headersList, headersRecord, auth)
      continue
    }
    if (token === '-e' || token === '--referer') {
      const val = getNextValue()
      if (val) parseAndAddHeader(`Referer: ${val}`, headersList, headersRecord, auth)
      continue
    }

    // Positional URL
    if (!token.startsWith('-') && !url) {
      url = token
      continue
    }
  }

  if (!url) return null

  // Process Mode & Payload (Auto-Detect REST vs GraphQL)
  let mode: Mode = 'REST'
  let gqlQuery = ''
  let gqlVariables = '{}'
  let requestName = `cURL (${method})`

  const isGraphqlUrl = url.toLowerCase().includes('/graphql')
  const isGraphqlContentType =
    headersRecord['content-type']?.includes('graphql') ||
    headersRecord['accept']?.includes('graphql') ||
    Boolean(headersRecord['apollo-require-preflight'])

  let jsonBody: Record<string, unknown> | unknown[] | null = null
  if (rawBody) {
    try {
      jsonBody = JSON.parse(rawBody)
    } catch {
      // Non-JSON or raw text
    }
  }

  const hasGraphqlQueryField =
    jsonBody !== null &&
    !Array.isArray(jsonBody) &&
    typeof jsonBody === 'object' &&
    typeof (jsonBody as Record<string, unknown>).query === 'string'

  if (hasGraphqlQueryField) {
    mode = 'GRAPHQL'
    method = 'POST'
    const gqlObj = jsonBody as Record<string, unknown>
    gqlQuery = formatGraphQLQuery(typeof gqlObj.query === 'string' ? gqlObj.query : '')
    gqlVariables = gqlObj.variables
      ? JSON.stringify(gqlObj.variables, null, 2)
      : '{}'

    if (typeof gqlObj.operationName === 'string' && gqlObj.operationName.trim()) {
      requestName = gqlObj.operationName.trim()
    } else {
      const match = gqlQuery.match(/(?:query|mutation|subscription)\s+([A-Za-z0-9_]+)/i)
      if (match && match[1]) {
        requestName = match[1]
      } else {
        requestName = 'GraphQL Request'
      }
    }
  } else if (isGraphqlUrl || isGraphqlContentType) {
    mode = 'GRAPHQL'
    method = 'POST'
    if (rawBody && (rawBody.includes('query ') || rawBody.includes('mutation ') || rawBody.includes('{'))) {
      gqlQuery = formatGraphQLQuery(rawBody)
      gqlVariables = '{}'
    } else {
      gqlQuery = `query Health {\n  health {\n    message\n  }\n}`
      gqlVariables = '{}'
    }
    const match = gqlQuery.match(/(?:query|mutation|subscription)\s+([A-Za-z0-9_]+)/i)
    requestName = match && match[1] ? match[1] : 'GraphQL Request'
  } else {
    // REST API
    mode = 'REST'
    requestName = `cURL (${method})`

    if (rawBody) {
      if (jsonBody !== null) {
        bodyType = 'json'
        restBody = JSON.stringify(jsonBody, null, 2)
      } else if (bodyType === 'none') {
        const trimmed = rawBody.trim()
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
      }
    }
  }

  const { params } = parseUrlToQueryParams(url)

  const headersText =
    headersList.length > 0
      ? JSON.stringify(
          headersList.reduce((acc, h) => {
            if (h.enabled && h.key) acc[h.key] = h.value
            return acc
          }, {} as Record<string, string>),
          null,
          2,
        )
      : '{\n  "Content-Type": "application/json"\n}'

  return {
    name: requestName,
    mode,
    method,
    url,
    params,
    headersList,
    headersText,
    auth,
    bodyType,
    restBody,
    rawText,
    formData,
    urlencoded,
    gqlQuery,
    gqlVariables,
    editorTab: mode === 'GRAPHQL' ? 'BODY' : bodyType !== 'none' ? 'BODY' : 'PARAMS',
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
    if (!headersRecord['Content-Type'] && !headersRecord['content-type']) {
      headersRecord['Content-Type'] = 'application/json'
    }
  } else if (!['GET', 'DELETE'].includes(request.method)) {
    if (request.bodyType === 'json' && !headersRecord['Content-Type'] && !headersRecord['content-type']) {
      headersRecord['Content-Type'] = 'application/json'
    } else if (
      request.bodyType === 'x-www-form-urlencoded' &&
      !headersRecord['Content-Type'] &&
      !headersRecord['content-type']
    ) {
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
