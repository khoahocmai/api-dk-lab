import { contextBridge, ipcRenderer } from 'electron'

const allowedInvokeChannels = new Set<string>(['http-request'])
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
})
