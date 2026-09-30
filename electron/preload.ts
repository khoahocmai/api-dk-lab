import { contextBridge, ipcRenderer, webFrame, webUtils } from 'electron'

const allowedInvokeChannels = new Set<string>([
  'http-request',
  'http-cancel',
  'storage:read',
  'storage:write',
])
const allowedSendChannels = new Set<string>([])
const allowedOnChannels = new Set<string>(['main-process-message'])

contextBridge.exposeInMainWorld('desktopApi', {
  on(channel: string, listener: (...args: unknown[]) => void) {
    if (!allowedOnChannels.has(channel)) return () => undefined

    const wrapped = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => listener(...args)
    ipcRenderer.on(channel, wrapped)

    return () => ipcRenderer.off(channel, wrapped)
  },

  send(channel: string, ...args: unknown[]) {
    if (!allowedSendChannels.has(channel)) return
    ipcRenderer.send(channel, ...args)
  },

  invoke(channel: string, ...args: unknown[]) {
    if (!allowedInvokeChannels.has(channel)) {
      return Promise.reject(new Error(`IPC channel is not allowed: ${channel}`))
    }

    return ipcRenderer.invoke(channel, ...args)
  },

  cancelRequest(requestId: string) {
    return ipcRenderer.invoke('http-cancel', requestId)
  },

  readStorage(fileName: string) {
    return ipcRenderer.invoke('storage:read', fileName)
  },

  writeStorage(fileName: string, data: unknown) {
    return ipcRenderer.invoke('storage:write', fileName, data)
  },

  setZoomFactor(factor: number) {
    webFrame.setZoomFactor(factor)
  },

  getZoomFactor() {
    return webFrame.getZoomFactor()
  },

  getPathForFile(file: File) {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      return (file as unknown as { path?: string }).path || ''
    }
  },
})
