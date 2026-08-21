import { app, ipcMain } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

/**
 * Resolves the primary data directory:
 * - In production (app.isPackaged): uses app.getPath('userData')/data
 * - In development (!app.isPackaged): uses <projectRoot>/data with fallback to userData
 */
export function getDataDir(): string {
  let baseDir: string

  if (app && app.isPackaged) {
    baseDir = path.join(app.getPath('userData'), 'data')
  } else {
    const rootDir =
      process.env.APP_ROOT && fs.existsSync(process.env.APP_ROOT)
        ? process.env.APP_ROOT
        : process.cwd()
    baseDir = path.join(rootDir, 'data')
  }

  if (!fs.existsSync(baseDir)) {
    try {
      fs.mkdirSync(baseDir, { recursive: true })
    } catch (err) {
      console.error(`[Storage] Failed to create data directory at ${baseDir}:`, err)
      if (app) {
        const fallback = path.join(app.getPath('userData'), 'data')
        if (!fs.existsSync(fallback)) {
          fs.mkdirSync(fallback, { recursive: true })
        }
        return fallback
      }
    }
  }
  return baseDir
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
 * Registers IPC handlers for reading and writing storage files directly to JSON
 */
export function registerStorageIpcHandlers(): void {
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

      if (fs.existsSync(filePath)) {
        const content = await fs.promises.readFile(filePath, 'utf-8')
        if (content && content.trim().length > 0) {
          return JSON.parse(content)
        }
      }

      return null
    } catch (error) {
      console.error(`[Storage:read] Failed to read ${fileName}:`, error)
      return null
    }
  })

  ipcMain.handle('storage:write', async (_event, fileName: string, data: unknown) => {
    try {
      if (!fileName || typeof fileName !== 'string' || data === undefined) {
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
      console.error(`[Storage:write] Failed to write ${fileName}:`, error)
      return false
    }
  })
}
