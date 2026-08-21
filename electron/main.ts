import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import http from 'node:http'
import https from 'node:https'
import axios, { AxiosRequestConfig } from 'axios'
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
const defaultHttpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  timeout: 60000,
})

const defaultHttpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  rejectUnauthorized: true,
  timeout: 60000,
})

const insecureHttpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  rejectUnauthorized: false,
  timeout: 60000,
})

// Base Axios instance with proxy scan disabled (bypasses Windows OS proxy scan delays on localhost/127.0.0.1)
const httpClient = axios.create({
  proxy: false,
  httpAgent: defaultHttpAgent,
  httpsAgent: defaultHttpsAgent,
  timeout: 60000,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
  validateStatus: () => true,
  decompress: true,
})

function registerIpcHandlers() {
  ipcMain.handle('http-request', async (_event, options: {
    method?: string
    url: string
    headers?: Record<string, string>
    data?: unknown
    timeout?: number
    rejectUnauthorized?: boolean
  }) => {
    // High-precision timing using process.hrtime.bigint()
    const startTime = process.hrtime.bigint()
    try {
      const isRejectUnauthorized = options.rejectUnauthorized ?? true
      const selectedHttpsAgent = isRejectUnauthorized ? defaultHttpsAgent : insecureHttpsAgent

      const customHeaders = options.headers || {}
      // Automatically include Accept-Encoding for gzip/deflate/br compression
      const headers = {
        'Accept-Encoding': 'gzip, deflate, br',
        ...customHeaders,
      }

      const config: AxiosRequestConfig = {
        method: options.method || 'GET',
        url: options.url,
        headers,
        data: options.data,
        timeout: options.timeout ?? 60000,
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
      const errorMessage = error instanceof Error ? error.message : 'Network request failed'
      const details = isAxios ? error.response?.data : undefined
      const status = isAxios ? error.response?.status : undefined
      const isNetworkError = !status

      const raw = details !== undefined ? JSON.stringify(details) : ''
      const sizeInBytes = raw ? Buffer.byteLength(raw, 'utf8') : 0
      const size = isNetworkError ? '0 B' : bytesToReadable(sizeInBytes)

      return {
        status: status ?? 0,
        statusText: isAxios && error.response?.statusText
          ? error.response.statusText
          : (isNetworkError ? 'Could not connect to server' : undefined),
        headers: (isAxios ? error.response?.headers : {}) || {},
        data: details ?? null,
        duration,
        size,
        error: errorMessage,
        details,
        isNetworkError,
      }
    }
  })
}

function createWindow() {
  win = new BrowserWindow({
    title: 'API Lab',
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
