import type { FolderItem, SavedRequestItem } from '../types'

/**
 * Checks if targetFolderId is equal to parentFolderId or is a descendant of parentFolderId.
 * Used to prevent circular nesting when dragging folders.
 */
export function isDescendantFolder(
  folders: FolderItem[],
  parentFolderId: string,
  targetFolderId: string,
): boolean {
  if (parentFolderId === targetFolderId) return true
  let current = folders.find((f) => f.id === targetFolderId)
  const visited = new Set<string>()
  while (current && current.parentId) {
    if (current.parentId === parentFolderId) return true
    if (visited.has(current.id)) break
    visited.add(current.id)
    current = folders.find((f) => f.id === current?.parentId)
  }
  return false
}

/**
 * Returns a set of all folder IDs that are descendants of the given folderId (including folderId itself).
 */
export function getDescendantFolderIds(folders: FolderItem[], folderId: string): Set<string> {
  const result = new Set<string>([folderId])
  let added = true
  while (added) {
    added = false
    folders.forEach((f) => {
      if (f.parentId && result.has(f.parentId) && !result.has(f.id)) {
        result.add(f.id)
        added = true
      }
    })
  }
  return result
}

/**
 * Moves a saved request to a new collection/folder or reorders it relative to a target request.
 */
export function moveRequestItem(
  requests: SavedRequestItem[],
  requestId: string,
  targetCollectionId: string,
  targetFolderId: string | null,
  targetRequestId?: string,
  position?: 'before' | 'after',
): SavedRequestItem[] {
  const reqIndex = requests.findIndex((r) => r.id === requestId)
  if (reqIndex === -1) return requests

  const req = requests[reqIndex]
  const updatedReq: SavedRequestItem = {
    ...req,
    collectionId: targetCollectionId,
    folderId: targetFolderId,
    updatedAt: new Date().toISOString(),
  }

  const withoutReq = requests.filter((r) => r.id !== requestId)

  if (targetRequestId && position && targetRequestId !== requestId) {
    const targetIndex = withoutReq.findIndex((r) => r.id === targetRequestId)
    if (targetIndex !== -1) {
      const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
      const next = [...withoutReq]
      next.splice(insertIndex, 0, updatedReq)
      return next
    }
  }

  return [...withoutReq, updatedReq]
}

/**
 * Moves a folder to a new collection/parent folder or reorders it relative to a target folder.
 * Also returns updated requests if collectionId changed.
 */
export function moveFolderItem(
  folders: FolderItem[],
  requests: SavedRequestItem[],
  folderId: string,
  targetCollectionId: string,
  targetParentFolderId: string | null,
  targetFolderId?: string,
  position?: 'before' | 'after',
): { folders: FolderItem[]; requests: SavedRequestItem[] } {
  // Prevent circular nesting
  if (targetParentFolderId && isDescendantFolder(folders, folderId, targetParentFolderId)) {
    return { folders, requests }
  }

  const currentFolder = folders.find((f) => f.id === folderId)
  if (!currentFolder) return { folders, requests }

  const descendantFolderIds = getDescendantFolderIds(folders, folderId)
  const collectionChanged = currentFolder.collectionId !== targetCollectionId

  // Update folder & descendants
  const updatedFoldersList = folders.map((f) => {
    if (f.id === folderId) {
      return {
        ...f,
        collectionId: targetCollectionId,
        parentId: targetParentFolderId,
      }
    }
    if (collectionChanged && descendantFolderIds.has(f.id)) {
      return {
        ...f,
        collectionId: targetCollectionId,
      }
    }
    return f
  })

  let finalFolders = updatedFoldersList
  if (targetFolderId && position && targetFolderId !== folderId) {
    const movedItem = updatedFoldersList.find((f) => f.id === folderId)!
    const withoutFolder = updatedFoldersList.filter((f) => f.id !== folderId)
    const targetIndex = withoutFolder.findIndex((f) => f.id === targetFolderId)
    if (targetIndex !== -1) {
      const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
      const next = [...withoutFolder]
      next.splice(insertIndex, 0, movedItem)
      finalFolders = next
    }
  }

  // Update requests if collection changed
  let finalRequests = requests
  if (collectionChanged) {
    finalRequests = requests.map((r) => {
      if (r.folderId && descendantFolderIds.has(r.folderId)) {
        return {
          ...r,
          collectionId: targetCollectionId,
          updatedAt: new Date().toISOString(),
        }
      }
      return r
    })
  }

  return { folders: finalFolders, requests: finalRequests }
}
