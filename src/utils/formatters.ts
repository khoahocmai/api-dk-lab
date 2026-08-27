import type { KeyValueRow, RequestItem } from '../types'

export function createId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 11)
}

export function formatJsonSafely(value: string): string {
  try {
    const sanitized = value.replace(/,(\s*[}\]])/g, '$1').trim()
    return JSON.stringify(JSON.parse(sanitized), null, 2)
  } catch {
    return value
  }
}

export function bytesToReadable(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message ?? 'Unknown error')
  }
  return 'Unknown error'
}

export function parseJsonObject(raw: string, label: string): Record<string, unknown> {
  try {
    const parsed = raw.trim() ? JSON.parse(raw) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${label} phải là JSON object`)
    }
    return parsed as Record<string, unknown>
  } catch (error) {
    throw new Error(getErrorMessage(error) || `${label} JSON không hợp lệ`)
  }
}

export function normalizeHeaders(raw: string): Record<string, string> {
  const parsed = parseJsonObject(raw, 'Headers')
  const finalHeaders: Record<string, string> = {}

  Object.entries(parsed).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      finalHeaders[key] = String(value)
    }
  })

  return finalHeaders
}

export const RESPONSE_PREVIEW_LIMIT = 1_000_000

export function stringifyForPreview(value: unknown): { text: string; truncated: boolean } {
  const text = JSON.stringify(value, null, 2)
  if (text.length <= RESPONSE_PREVIEW_LIMIT) return { text, truncated: false }
  return {
    text: `${text.slice(0, RESPONSE_PREVIEW_LIMIT)}\n\n... Response preview truncated. Use Copy to get the full response.`,
    truncated: true,
  }
}

export function capitalize(value: string): string {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value
}

export function sanitizeVariableName(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_]/g, '_') || 'value'
  return /^[A-Za-z_]/.test(normalized) ? normalized : `v_${normalized}`
}

export function getMethodBadgeClass(mode?: string, method?: string): string {
  if (mode === 'GRAPHQL') return 'method-badge-gql'
  switch ((method || 'GET').toUpperCase()) {
    case 'GET':
      return 'method-badge-get'
    case 'POST':
      return 'method-badge-post'
    case 'PUT':
      return 'method-badge-put'
    case 'PATCH':
      return 'method-badge-patch'
    case 'DELETE':
      return 'method-badge-delete'
    case 'HEAD':
      return 'method-badge-head'
    case 'OPTIONS':
      return 'method-badge-options'
    default:
      return 'method-badge-get'
  }
}

export function getMethodTagClass(mode?: string, method?: string): string {
  if (mode === 'GRAPHQL') return 'method-graphql'
  switch ((method || 'GET').toUpperCase()) {
    case 'GET':
      return 'method-get'
    case 'POST':
      return 'method-post'
    case 'PUT':
      return 'method-put'
    case 'PATCH':
      return 'method-patch'
    case 'DELETE':
      return 'method-delete'
    case 'HEAD':
      return 'method-head'
    case 'OPTIONS':
      return 'method-options'
    default:
      return 'method-get'
  }
}

export function getMethodColor(mode?: string, method?: string): string {
  if (mode === 'GRAPHQL') return 'var(--method-gql)'
  switch ((method || 'GET').toUpperCase()) {
    case 'GET':
      return 'var(--method-get)'
    case 'POST':
      return 'var(--method-post)'
    case 'PUT':
      return 'var(--method-put)'
    case 'PATCH':
      return 'var(--method-patch)'
    case 'DELETE':
      return 'var(--method-delete)'
    case 'HEAD':
    case 'OPTIONS':
      return '#14b8a6'
    default:
      return 'var(--method-get)'
  }
}

/**
 * Creates a serialized snapshot of key request properties to detect dirty / unsaved changes.
 */
export function createRequestSnapshot(tab?: Partial<RequestItem> | null): string {
  if (!tab) return ''

  const sanitizeRows = (rows?: KeyValueRow[]) =>
    (rows || [])
      .filter((r) => r.key?.trim() || r.value?.trim() || r.fileName?.trim())
      .map((r) => ({
        key: r.key?.trim() || '',
        value: r.value || '',
        enabled: Boolean(r.enabled),
        type: r.type || 'text',
        fileName: r.fileName || '',
        description: r.description?.trim() || '',
      }))

  return JSON.stringify({
    name: tab.name?.trim() || '',
    url: tab.url?.trim() || '',
    method: tab.method || 'GET',
    mode: tab.mode || 'REST',
    graphqlRootField: tab.graphqlRootField?.trim() || '',
    params: sanitizeRows(tab.params),
    pathVariables: sanitizeRows(tab.pathVariables),
    headersList: sanitizeRows(tab.headersList),
    auth: tab.auth
      ? {
          type: tab.auth.type,
          bearerToken: tab.auth.bearerToken || '',
          basicUsername: tab.auth.basicUsername || '',
          basicPassword: tab.auth.basicPassword || '',
          apiKeyName: tab.auth.apiKeyName || '',
          apiKeyValue: tab.auth.apiKeyValue || '',
          apiKeyAddTo: tab.auth.apiKeyAddTo || 'header',
        }
      : undefined,
    bodyType: tab.bodyType || 'none',
    restBody: tab.restBody || '',
    rawText: tab.rawText || '',
    formData: sanitizeRows(tab.formData),
    urlencoded: sanitizeRows(tab.urlencoded),
    gqlQuery: tab.gqlQuery || '',
    gqlVariables: tab.gqlVariables || '',
    testScript: tab.testScript || '',
  })
}

/**
 * Checks if a tab has unsaved changes compared to its savedSnapshot.
 */
export function isTabDirty(tab?: RequestItem | null): boolean {
  if (!tab) return false
  if (tab.savedSnapshot === undefined) return false
  return createRequestSnapshot(tab) !== tab.savedSnapshot
}

