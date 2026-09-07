import axios, { AxiosRequestConfig } from 'axios'
import type { HttpRequestOptions, HttpResponseData } from '../types'
import { bytesToReadable, getErrorMessage } from '../utils/formatters'
import { isLocalhostUrl } from '../utils/urlHelper'

export async function sendHttpRequest(options: HttpRequestOptions): Promise<HttpResponseData> {
  const isLocal = isLocalhostUrl(options.url)
  const effectiveTimeout =
    options.disableLocalhostTimeout && isLocal
      ? 0
      : options.timeout !== undefined
      ? options.timeout
      : 60000

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
    const config: AxiosRequestConfig = {
      method: options.method || 'GET',
      url: options.url,
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        ...(options.headers || {}),
      },
      data: options.data,
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

