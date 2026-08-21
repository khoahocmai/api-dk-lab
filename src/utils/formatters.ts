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
