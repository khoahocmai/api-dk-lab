/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string
    VITE_PUBLIC: string
  }
}

export interface HttpRequestOptions {
  method?: string
  url: string
  headers?: Record<string, string>
  data?: unknown
  timeout?: number
  rejectUnauthorized?: boolean
  disableLocalhostTimeout?: boolean
  requestId?: string
}

export interface HttpResponseData {
  status?: number
  statusText?: string
  headers?: Record<string, string | string[]>
  data?: unknown
  duration?: number
  size?: string
  error?: string
  details?: unknown
  isNetworkError?: boolean
  isCanceled?: boolean
}

declare global {
  interface Window {
    desktopApi?: {
      on(channel: string, listener: (...args: unknown[]) => void): () => void
      send(channel: string, ...args: unknown[]): void
      invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>
      cancelRequest(requestId: string): Promise<boolean>
      readStorage<T = unknown>(fileName: string): Promise<T | null>
      writeStorage(fileName: string, data: unknown): Promise<boolean>
      setZoomFactor(factor: number): void
      getZoomFactor(): number
    }
  }
}
