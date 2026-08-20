import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import https from 'node:https'
import axios, { AxiosRequestConfig } from 'axios'

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

function registerIpcHandlers() {
  ipcMain.handle('http-request', async (_event, options: {
    method?: string
    url: string
    headers?: Record<string, string>
    data?: unknown
    timeout?: number
    rejectUnauthorized?: boolean
  }) => {
    const startTime = Date.now()
    try {
      const isRejectUnauthorized = options.rejectUnauthorized ?? true
      const httpsAgent = new https.Agent({
        rejectUnauthorized: isRejectUnauthorized,
      })

      const config: AxiosRequestConfig = {
        method: options.method || 'GET',
        url: options.url,
        headers: options.headers || {},
        data: options.data,
        timeout: options.timeout ?? 30000,
        validateStatus: () => true,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        httpsAgent,
      }

      const response = await axios(config)
      const duration = Date.now() - startTime

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
      const duration = Date.now() - startTime
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
  createWindow()
})
