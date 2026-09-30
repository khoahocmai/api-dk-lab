/**
 * In-memory registry to retain HTML File references during the runtime session.
 * Used for file reading (e.g. ArrayBuffer fallback) or browser environment.
 */
const fileMap = new Map<string, File>()

export function registerFile(rowId: string, file: File): void {
  fileMap.set(rowId, file)
}

export function getRegisteredFile(rowId: string): File | undefined {
  return fileMap.get(rowId)
}

export function removeRegisteredFile(rowId: string): void {
  fileMap.delete(rowId)
}

export function clearFileRegistry(): void {
  fileMap.clear()
}
