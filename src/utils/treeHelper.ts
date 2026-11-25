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

export type TreeItemRef = { type: 'FOLDER' | 'REQUEST'; id: string }

export interface TreeMoveTarget {
  collectionId: string
  /** Destination folder; null is the collection root. */
  folderId: string | null
  /** Sibling to place the moved items next to; only applies to items of its type. */
  anchor?: TreeItemRef & { position: 'before' | 'after' }
}

/** Inserts `moved` next to the anchor, or appends it when there is no usable anchor. */
function placeItems<T extends { id: string }>(
  rest: T[],
  moved: T[],
  anchorId: string | undefined,
  position: 'before' | 'after' | undefined,
): T[] {
  const anchorIndex = rest.findIndex((item) => item.id === anchorId)
  if (anchorIndex === -1) return [...rest, ...moved]
  const next = [...rest]
  next.splice(position === 'before' ? anchorIndex : anchorIndex + 1, 0, ...moved)
  return next
}

/**
 * Moves several folders and requests at once, keeping the order of `items`.
 * Items already inside a moved folder travel with it and keep their structure.
 * Returns the inputs unchanged when the move would nest a folder inside itself.
 */
export function moveTreeItems(
  folders: FolderItem[],
  requests: SavedRequestItem[],
  items: TreeItemRef[],
  target: TreeMoveTarget,
): { folders: FolderItem[]; requests: SavedRequestItem[] } {
  const unchanged = { folders, requests }
  const selectedFolderIds = new Set(items.filter((i) => i.type === 'FOLDER').map((i) => i.id))

  const isInsideSelected = (folderId: string | null | undefined) => {
    const visited = new Set<string>()
    let currentId = folderId
    while (currentId && !visited.has(currentId)) {
      if (selectedFolderIds.has(currentId)) return true
      visited.add(currentId)
      currentId = folders.find((f) => f.id === currentId)?.parentId
    }
    return false
  }

  if (isInsideSelected(target.folderId)) return unchanged

  const movedFolders: FolderItem[] = []
  const movedRequests: SavedRequestItem[] = []
  const now = new Date().toISOString()

  items.forEach((item) => {
    if (item.type === 'FOLDER') {
      const folder = folders.find((f) => f.id === item.id)
      if (!folder || isInsideSelected(folder.parentId)) return
      movedFolders.push({ ...folder, collectionId: target.collectionId, parentId: target.folderId })
    } else {
      const request = requests.find((r) => r.id === item.id)
      if (!request || isInsideSelected(request.folderId)) return
      movedRequests.push({
        ...request,
        collectionId: target.collectionId,
        folderId: target.folderId,
        updatedAt: now,
      })
    }
  })

  if (movedFolders.length === 0 && movedRequests.length === 0) return unchanged

  // Everything below a moved folder follows it into the target collection
  const descendantIds = new Set<string>()
  movedFolders.forEach((folder) => {
    getDescendantFolderIds(folders, folder.id).forEach((id) => descendantIds.add(id))
  })
  const movedFolderIds = new Set(movedFolders.map((f) => f.id))
  const movedRequestIds = new Set(movedRequests.map((r) => r.id))

  const remainingFolders = folders
    .filter((f) => !movedFolderIds.has(f.id))
    .map((f) =>
      descendantIds.has(f.id) && f.collectionId !== target.collectionId
        ? { ...f, collectionId: target.collectionId }
        : f,
    )
  const remainingRequests = requests
    .filter((r) => !movedRequestIds.has(r.id))
    .map((r) =>
      r.folderId && descendantIds.has(r.folderId) && r.collectionId !== target.collectionId
        ? { ...r, collectionId: target.collectionId, updatedAt: now }
        : r,
    )

  const { anchor } = target
  return {
    folders: placeItems(
      remainingFolders,
      movedFolders,
      anchor?.type === 'FOLDER' ? anchor.id : undefined,
      anchor?.position,
    ),
    requests: placeItems(
      remainingRequests,
      movedRequests,
      anchor?.type === 'REQUEST' ? anchor.id : undefined,
      anchor?.position,
    ),
  }
}

/**
 * Resolves the parent collection ID and all ancestor folder IDs for a given saved request.
 */
export function getAncestorIdsForRequest(
  savedRequests: SavedRequestItem[],
  folders: FolderItem[],
  requestId: string,
): { collectionId: string | null; ancestorFolderIds: string[] } {
  const req = savedRequests.find((r) => r.id === requestId)
  if (!req) return { collectionId: null, ancestorFolderIds: [] }

  const collectionId = req.collectionId || null
  const ancestorFolderIds: string[] = []

  let currentFolderId: string | null = req.folderId || null
  const visited = new Set<string>()

  while (currentFolderId) {
    if (visited.has(currentFolderId)) break
    visited.add(currentFolderId)
    ancestorFolderIds.push(currentFolderId)

    const folder = folders.find((f) => f.id === currentFolderId)
    currentFolderId = folder?.parentId || null
  }

  return { collectionId, ancestorFolderIds }
}

