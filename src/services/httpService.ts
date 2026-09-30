import axios, { AxiosRequestConfig } from 'axios'
import type { HttpRequestOptions, HttpResponseData } from '../types'
import { bytesToReadable, getErrorMessage } from '../utils/formatters'
import { sanitizeTrailingCommas } from '../utils/jsonHelper'
import { isLocalhostUrl } from '../utils/urlHelper'

export async function sendHttpRequest(options: HttpRequestOptions): Promise<HttpResponseData> {
  const isLocal = isLocalhostUrl(options.url)
  const effectiveTimeout =
    options.disableLocalhostTimeout && isLocal
      ? 0
      : options.timeout !== undefined
      ? options.timeout
      : 60000

  // Automatically sanitize JSON payload if data is a raw string and Content-Type is application/json or payload looks like JSON
  let sanitizedData = options.data
  if (typeof sanitizedData === 'string' && sanitizedData.trim()) {
    const isJsonHeader = Object.entries(options.headers || {}).some(
      ([k, v]) =>
        k.toLowerCase() === 'content-type' &&
        typeof v === 'string' &&
        v.toLowerCase().includes('application/json'),
    )
    const trimmed = sanitizedData.trim()
    const looksLikeJson =
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    if (isJsonHeader || looksLikeJson) {
      sanitizedData = sanitizeTrailingCommas(sanitizedData)
    }
  }

  // Sanitize headers: If isFormData, ensure Content-Type without boundary is completely stripped
  const cleanedHeaders = { ...(options.headers || {}) }
  if (options.isFormData) {
    for (const k of Object.keys(cleanedHeaders)) {
      if (k.toLowerCase() === 'content-type') {
        const ctVal = (cleanedHeaders[k] || '').trim().toLowerCase()
        if (
          ctVal === 'multipart/form-data' ||
          (ctVal.startsWith('multipart/form-data') && !ctVal.includes('boundary='))
        ) {
          delete cleanedHeaders[k]
        }
      }
    }
  }

  // If running inside Electron desktop environment, use IPC to bypass CORS
  if (window.desktopApi?.invoke) {
    let abortListener: (() => void) | undefined
    if (options.signal && options.requestId) {
      if (options.signal.aborted) {
        void cancelHttpRequest(options.requestId)
      } else {
        abortListener = () => {
          void cancelHttpRequest(options.requestId!)
        }
        options.signal.addEventListener('abort', abortListener, { once: true })
      }
    }

    try {
      return await window.desktopApi.invoke<HttpResponseData>('http-request', {
        ...options,
        headers: cleanedHeaders,
        data: sanitizedData,
        timeout: effectiveTimeout,
      })
    } catch (error) {
      if (options.signal?.aborted) {
        return {
          status: 0,
          statusText: 'Canceled',
          error: 'Request was canceled by user',
          data: null,
          size: '0 B',
          isNetworkError: true,
          isCanceled: true,
        }
      }
      return {
        status: 0,
        statusText: 'Could not connect to server',
        error: getErrorMessage(error) || 'IPC request failed',
        data: null,
        size: '0 B',
        isNetworkError: true,
      }
    } finally {
      if (abortListener && options.signal) {
        options.signal.removeEventListener('abort', abortListener)
      }
    }
  }

  // Fallback for browser / test environments
  const startTime = performance.now()
  try {
    if (options.isFormData && Array.isArray(options.formDataItems)) {
      const browserFormData = new FormData()
      for (const item of options.formDataItems) {
        const fieldKey = item.key || 'file'
        if (item.type === 'file') {
          if (item.buffer && item.buffer.length > 0) {
            const blob = new Blob([new Uint8Array(item.buffer)], {
              type: item.mimeType || 'application/octet-stream',
            })
            browserFormData.append(fieldKey, blob, item.fileName || 'file')
          } else if (item.value) {
            browserFormData.append(fieldKey, item.value)
          }
        } else {
          browserFormData.append(fieldKey, item.value ?? '')
        }
      }
      sanitizedData = browserFormData
    }

    const config: AxiosRequestConfig = {
      method: options.method || 'GET',
      url: options.url,
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        ...cleanedHeaders,
      },
      data: sanitizedData,
      timeout: effectiveTimeout,
      signal: options.signal,
      validateStatus: () => true,
      proxy: false,
    }

    const response = await axios(config)
    const duration = Math.round(performance.now() - startTime)
    const raw = typeof response.data === 'string' ? response.data : JSON.stringify(response.data ?? '')
    const size = bytesToReadable(new Blob([raw]).size)

    const responseHeaders: Record<string, string | string[]> = {}
    if (response.headers) {
      for (const [key, val] of Object.entries(response.headers)) {
        if (val !== undefined && val !== null) {
          responseHeaders[key] = val as string | string[]
        }
      }
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: response.data,
      duration,
      size,
    }
  } catch (error) {
    const duration = Math.round(performance.now() - startTime)
    const isAxios = axios.isAxiosError(error)
    const details = isAxios ? error.response?.data : undefined
    const status = isAxios ? error.response?.status : undefined
    const isNetworkError = !status
    let errorMessage = getErrorMessage(error) || 'Request failed'

    const isCanceled =
      axios.isCancel(error) ||
      (error instanceof Error && (error.name === 'CanceledError' || error.name === 'AbortError')) ||
      (isAxios && error.code === 'ERR_CANCELED')

    const isTimeout =
      !isCanceled &&
      ((isAxios && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) ||
        (error instanceof Error && (
          error.name === 'TimeoutError' ||
          error.message.toLowerCase().includes('timeout') ||
          error.message.toLowerCase().includes('timed out')
        )))

    if (isCanceled) {
      errorMessage = 'Request was canceled by user'
    } else if (isTimeout) {
      errorMessage = `Request timed out after ${effectiveTimeout} ms. If you are debugging code at breakpoints, please set Request Timeout to 0 in App Settings.`
    }

    return {
      status: status ?? 0,
      statusText: isCanceled
        ? 'Canceled'
        : isAxios && error.response?.statusText
        ? error.response.statusText
        : (isNetworkError ? 'Could not connect to server' : undefined),
      headers: isAxios && error.response?.headers ? (error.response.headers as Record<string, string | string[]>) : {},
      data: details ?? null,
      duration,
      size: isNetworkError ? '0 B' : bytesToReadable(new Blob([JSON.stringify(details ?? '')]).size),
      error: errorMessage,
      details,
      isNetworkError,
      isCanceled,
    }
  }
}

export async function cancelHttpRequest(requestId: string): Promise<boolean> {
  if (window.desktopApi?.cancelRequest) {
    try {
      return await window.desktopApi.cancelRequest(requestId)
    } catch {
      return false
    }
  }
  if (window.desktopApi?.invoke) {
    try {
      const res = await window.desktopApi.invoke<{ success: boolean } | boolean>('http-cancel', requestId)
      return typeof res === 'boolean' ? res : (res?.success ?? false)
    } catch {
      return false
    }
  }
  return false
}

