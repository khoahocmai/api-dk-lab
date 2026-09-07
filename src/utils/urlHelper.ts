import type { KeyValueRow } from '../types'
import { createId } from './formatters'

export {
  extractPathKeys,
  syncPathVariables,
  resolvePathVariables,
} from '../services/templateService'

/**
 * Extracts base URL and query parameters from a full URL string.
 * Preserves existing param IDs & descriptions if keys match.
 */
export function parseUrlToQueryParams(
  fullUrl: string,
  existingParams: KeyValueRow[] = [],
): { baseUrl: string; params: KeyValueRow[] } {
  const queryIndex = fullUrl.indexOf('?')
  if (queryIndex === -1) {
    return {
      baseUrl: fullUrl,
      params: existingParams.filter((p) => !p.enabled && p.key), // keep disabled ones
    }
  }

  const baseUrl = fullUrl.slice(0, queryIndex)
  const queryString = fullUrl.slice(queryIndex + 1)
  const searchParams = new URLSearchParams(queryString)

  const newParams: KeyValueRow[] = []
  const usedExistingIds = new Set<string>()

  searchParams.forEach((value, key) => {
    // Find matching existing param
    const existing = existingParams.find(
      (p) => p.key === key && !usedExistingIds.has(p.id),
    )

    if (existing) {
      usedExistingIds.add(existing.id)
      newParams.push({
        ...existing,
        value,
        enabled: true,
      })
    } else {
      newParams.push({
        id: createId(),
        key,
        value,
        enabled: true,
      })
    }
  })

  // Retain disabled params from previous state
  existingParams.forEach((p) => {
    if (!p.enabled && !usedExistingIds.has(p.id) && p.key) {
      newParams.push(p)
    }
  })

  return { baseUrl, params: newParams }
}

/**
 * Builds a URL string by attaching enabled query params to the base URL.
 */
export function buildUrlWithQueryParams(
  currentUrl: string,
  params: KeyValueRow[],
): string {
  const queryIndex = currentUrl.indexOf('?')
  const baseUrl = queryIndex === -1 ? currentUrl : currentUrl.slice(0, queryIndex)

  const enabledParams = params.filter((p) => p.enabled && p.key.trim() !== '')
  if (enabledParams.length === 0) {
    return baseUrl
  }

  const queryParts = enabledParams.map((p) => {
    // Allow template variables {{var}} without escaping them
    const key = encodeParamPart(p.key.trim())
    const val = encodeParamPart(p.value)
    return `${key}=${val}`
  })

  return `${baseUrl}?${queryParts.join('&')}`
}

function encodeParamPart(val: string): string {
  // If it's a template variable like {{domain}}, don't encode braces
  if (/^{{.*}}$/.test(val)) return val
  return encodeURIComponent(val)
}

/**
 * Parses a JSON headers text into KeyValueRow array.
 */
export function parseHeadersTextToRows(headersText: string): KeyValueRow[] {
  try {
    const trimmed = headersText.trim()
    if (!trimmed || trimmed === '{}') return []
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    return Object.entries(parsed).map(([key, value]) => ({
      id: createId(),
      key,
      value: String(value ?? ''),
      enabled: true,
    }))
  } catch {
    return []
  }
}

/**
 * Converts KeyValueRow array to Record<string, string> of enabled headers.
 */
export function convertRowsToHeadersObject(rows: KeyValueRow[]): Record<string, string> {
  const result: Record<string, string> = {}
  rows
    .filter((r) => r.enabled && r.key.trim() !== '')
    .forEach((r) => {
      result[r.key.trim()] = r.value
    })
  return result
}

/**
 * Converts KeyValueRow array to pretty JSON string.
 */
export function convertRowsToHeadersJson(rows: KeyValueRow[]): string {
  const obj = convertRowsToHeadersObject(rows)
  return JSON.stringify(obj, null, 2)
}

/**
 * Checks if a given URL targets localhost or loopback IP (127.0.0.1, ::1, 0.0.0.0).
 */
export function isLocalhostUrl(urlString: string): boolean {
  if (!urlString) return false
  try {
    const formatted =
      urlString.startsWith('http://') || urlString.startsWith('https://')
        ? urlString
        : `http://${urlString}`
    const parsed = new URL(formatted)
    const hostname = parsed.hostname.toLowerCase()
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.localhost')
    )
  } catch {
    const lower = urlString.toLowerCase()
    return (
      lower.includes('localhost') ||
      lower.includes('127.0.0.1') ||
      lower.includes('::1')
    )
  }
}

