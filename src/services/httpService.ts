import axios, { AxiosRequestConfig } from 'axios'
import type { HttpRequestOptions, HttpResponseData } from '../types'
import { bytesToReadable, getErrorMessage } from '../utils/formatters'

export async function sendHttpRequest(options: HttpRequestOptions): Promise<HttpResponseData> {
  // If running inside Electron desktop environment, use IPC to bypass CORS
  if (window.desktopApi?.invoke) {
    try {
      return await window.desktopApi.invoke<HttpResponseData>('http-request', options)
    } catch (error) {
      return {
        status: 0,
        statusText: 'Could not connect to server',
        error: getErrorMessage(error) || 'IPC request failed',
        data: null,
        size: '0 B',
        isNetworkError: true,
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
      timeout: options.timeout ?? 60000,
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
    const errorMessage = getErrorMessage(error) || 'Request failed'

    return {
      status: status ?? 0,
      statusText: isAxios && error.response?.statusText
        ? error.response.statusText
        : (isNetworkError ? 'Could not connect to server' : undefined),
      headers: isAxios && error.response?.headers ? (error.response.headers as Record<string, string | string[]>) : {},
      data: details ?? null,
      duration,
      size: isNetworkError ? '0 B' : bytesToReadable(new Blob([JSON.stringify(details ?? '')]).size),
      error: errorMessage,
      details,
      isNetworkError,
    }
  }
}
