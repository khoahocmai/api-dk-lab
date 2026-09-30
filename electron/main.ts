import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import axios, { AxiosRequestConfig } from 'axios'
import FormData from 'form-data'
import { registerStorageIpcHandlers } from './storage'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null = null

function bytesToReadable(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// Persistent HTTP and HTTPS agents with keepAlive and socket pooling
// Set timeout: 0 to prevent Node socket inactivity disconnects when user sets timeout: 0 for debugging
const defaultHttpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  timeout: 0,
})

const defaultHttpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  rejectUnauthorized: true,
  timeout: 0,
})

const insecureHttpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  rejectUnauthorized: false,
  timeout: 0,
})

// Base Axios instance with proxy scan disabled (bypasses Windows OS proxy scan delays on localhost/127.0.0.1)
const httpClient = axios.create({
  proxy: false,
  httpAgent: defaultHttpAgent,
  httpsAgent: defaultHttpsAgent,
  timeout: 0,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
  validateStatus: () => true,
  decompress: true,
})

function isLocalhostUrl(urlString: string): boolean {
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
    const lower = (urlString || '').toLowerCase()
    return (
      lower.includes('localhost') ||
      lower.includes('127.0.0.1') ||
      lower.includes('::1')
    )
  }
}

const activeRequests = new Map<string, AbortController>()

function registerIpcHandlers() {
  ipcMain.handle('http-cancel', (_event, requestId: string) => {
    if (!requestId) return { success: false }
    const controller = activeRequests.get(requestId)
    if (controller) {
      controller.abort()
      activeRequests.delete(requestId)
      return { success: true }
    }
    return { success: false }
  })

  ipcMain.handle('http-request', async (_event, options: {
    method?: string
    url: string
    headers?: Record<string, string>
    data?: unknown
    timeout?: number
    rejectUnauthorized?: boolean
    disableLocalhostTimeout?: boolean
    requestId?: string
    isFormData?: boolean
    formDataItems?: Array<{
      key: string
      type?: 'text' | 'file'
      value?: string
      fileName?: string
      filePath?: string
      mimeType?: string
      buffer?: number[]
    }>
  }) => {
    // High-precision timing using process.hrtime.bigint()
    const startTime = process.hrtime.bigint()

    const isLocal = isLocalhostUrl(options.url)
    let effectiveTimeout = typeof options.timeout === 'number' ? options.timeout : 60000
    if (effectiveTimeout < 0) effectiveTimeout = 0
    if (options.disableLocalhostTimeout && isLocal) {
      effectiveTimeout = 0
    }

    const requestId =
      options.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const abortController = new AbortController()
    activeRequests.set(requestId, abortController)

    try {
      const isRejectUnauthorized = options.rejectUnauthorized ?? true
      const selectedHttpsAgent = isRejectUnauthorized ? defaultHttpsAgent : insecureHttpsAgent

      const customHeaders = options.headers || {}
      // Automatically include Accept-Encoding for gzip/deflate/br compression
      const headers: Record<string, string> = {
        'Accept-Encoding': 'gzip, deflate, br',
        ...customHeaders,
      }

      let requestData = options.data

      if (options.isFormData && Array.isArray(options.formDataItems)) {
        const formData = new FormData()
        for (const item of options.formDataItems) {
          const fieldKey = item.key?.trim() || 'file'
          if (item.type === 'file') {
            const fileName = item.fileName || (item.filePath ? path.basename(item.filePath) : 'file')
            if (item.filePath && fs.existsSync(item.filePath)) {
              const stream = fs.createReadStream(item.filePath)
              formData.append(fieldKey, stream, {
                filename: fileName,
                contentType: item.mimeType || undefined,
              })
            } else if (
              item.buffer &&
              (Array.isArray(item.buffer) || Buffer.isBuffer(item.buffer) || (item.buffer as unknown) instanceof Uint8Array)
            ) {
              const buf = Buffer.from(item.buffer as any)
              formData.append(fieldKey, buf, {
                filename: fileName,
                contentType: item.mimeType || undefined,
              })
            } else if (item.value) {
              formData.append(fieldKey, item.value)
            }
          } else {
            formData.append(fieldKey, item.value ?? '')
          }
        }

        // Strip any pre-existing or manual Content-Type without boundary to prevent "Multipart: Unexpected end of form"
        for (const k of Object.keys(headers)) {
          if (k.toLowerCase() === 'content-type') {
            delete headers[k]
          }
        }

        // Assign correct Content-Type with boundary from Node FormData
        Object.assign(headers, formData.getHeaders())
        requestData = formData
      }

      const config: AxiosRequestConfig = {
        method: options.method || 'GET',
        url: options.url,
        headers,
        data: requestData,
        timeout: effectiveTimeout,
        signal: abortController.signal,
        validateStatus: () => true,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        proxy: false,
        httpAgent: defaultHttpAgent,
        httpsAgent: selectedHttpsAgent,
        decompress: true,
      }

      const response = await httpClient.request(config)
      const endTime = process.hrtime.bigint()
      const duration = Math.max(1, Number((endTime - startTime) / 1000000n))

      const responseHeaders: Record<string, string | string[]> = {}
      if (response.headers) {
        for (const [key, val] of Object.entries(response.headers)) {
          if (val !== undefined && val !== null) {
            responseHeaders[key] = val as string | string[]
          }
        }
      }

      const raw = typeof response.data === 'string' ? response.data : JSON.stringify(response.data ?? '')
      const sizeInBytes = Buffer.byteLength(raw, 'utf8')
      const size = bytesToReadable(sizeInBytes)

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: response.data,
        duration,
        size,
      }
    } catch (error: unknown) {
      const endTime = process.hrtime.bigint()
      const duration = Math.max(1, Number((endTime - startTime) / 1000000n))
      const isAxios = axios.isAxiosError(error)
      let errorMessage = error instanceof Error ? error.message : 'Network request failed'
      const details = isAxios ? error.response?.data : undefined
      const status = isAxios ? error.response?.status : undefined
      const isNetworkError = !status

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

      const raw = details !== undefined ? JSON.stringify(details) : ''
      const sizeInBytes = raw ? Buffer.byteLength(raw, 'utf8') : 0
      const size = isNetworkError ? '0 B' : bytesToReadable(sizeInBytes)

      return {
        status: status ?? 0,
        statusText: isCanceled
          ? 'Canceled'
          : isAxios && error.response?.statusText
          ? error.response.statusText
          : (isNetworkError ? 'Could not connect to server' : undefined),
        headers: (isAxios ? error.response?.headers : {}) || {},
        data: details ?? null,
        duration,
        size,
        error: errorMessage,
        details,
        isNetworkError,
        isCanceled,
      }
    } finally {
      activeRequests.delete(requestId)
    }
  })
}

function createWindow() {
  win = new BrowserWindow({
    title: 'API DK Lab',
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 720,
    autoHideMenuBar: true,
    icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    const isDevServer = Boolean(VITE_DEV_SERVER_URL && url.startsWith(VITE_DEV_SERVER_URL))
    const isLocalFile = url.startsWith('file://')

    if (!isDevServer && !isLocalFile) {
      event.preventDefault()
      void shell.openExternal(url)
    }
  })

  if (VITE_DEV_SERVER_URL) {
    void win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    void win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.whenReady().then(() => {
  registerIpcHandlers()
  registerStorageIpcHandlers()
  createWindow()
})
