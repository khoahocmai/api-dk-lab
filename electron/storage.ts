import { ipcMain } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

/**
 * Resolves the root project / data directory and ensures it exists
 */
export function getDataDir(): string {
  const rootDir = process.env.APP_ROOT && fs.existsSync(process.env.APP_ROOT)
    ? process.env.APP_ROOT
    : process.cwd()
  const dataDir = path.join(rootDir, 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return dataDir
}

/**
 * Resolves a safe file path within the data directory
 */
export function getSafeFilePath(fileName: string): string {
  const dataDir = getDataDir()
  const safeName = path.basename(fileName)
  return path.join(dataDir, safeName)
}

/**
 * Registers IPC handlers for reading and writing storage files
 */
export function registerStorageIpcHandlers(): void {
  // Ensure data directory exists on startup
  try {
    getDataDir()
  } catch (err) {
    console.error('[Storage] Failed to initialize data directory:', err)
  }

  ipcMain.handle('storage:read', async (_event, fileName: string) => {
    try {
      if (!fileName || typeof fileName !== 'string') {
        return null
      }
      const filePath = getSafeFilePath(fileName)
      if (!fs.existsSync(filePath)) {
        return null
      }
      const content = await fs.promises.readFile(filePath, 'utf-8')
      if (!content.trim()) {
        return null
      }
      return JSON.parse(content)
    } catch (error) {
      console.error(`[storage:read] Failed to read ${fileName}:`, error)
      return null
    }
  })

  ipcMain.handle('storage:write', async (_event, fileName: string, data: unknown) => {
    try {
      if (!fileName || typeof fileName !== 'string') {
        return false
      }
      const filePath = getSafeFilePath(fileName)
      const dataDir = path.dirname(filePath)
      if (!fs.existsSync(dataDir)) {
        await fs.promises.mkdir(dataDir, { recursive: true })
      }
      const jsonContent = JSON.stringify(data, null, 2)
      await fs.promises.writeFile(filePath, jsonContent, 'utf-8')
      return true
    } catch (error) {
      console.error(`[storage:write] Failed to write ${fileName}:`, error)
      return false
    }
  })
}
