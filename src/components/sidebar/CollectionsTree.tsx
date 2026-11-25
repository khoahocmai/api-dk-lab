import React, { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileCode,
  Folder,
  FolderPlus,
  Link2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import type {
  CollectionItem,
  EnvironmentGroup,
  FolderItem,
  SavedRequestItem,
} from '../../types'
import { getDescendantFolderIds, isDescendantFolder } from '../../utils/treeHelper'
import { getMethodBadgeClass } from '../../utils/formatters'

export type DragItem =
  | { type: 'REQUEST'; id: string; collectionId: string; folderId: string | null }
  | { type: 'FOLDER'; id: string; collectionId: string; parentId: string | null }

export type DropPosition = 'inside' | 'before' | 'after'

export interface DropTarget {
  type: 'COLLECTION' | 'FOLDER' | 'REQUEST'
  id: string
  collectionId: string
  position: DropPosition
}

/** How long a drag has to rest on a collapsed row before it opens. */
const AUTO_EXPAND_DELAY_MS = 600

/** Share of a folder row, at its top and bottom, that reorders instead of nesting. */
const REORDER_EDGE_RATIO = 0.15

function getFolderDropPosition(e: React.DragEvent): DropPosition {
  const rect = e.currentTarget.getBoundingClientRect()
  const offsetY = e.clientY - rect.top
  if (offsetY < rect.height * REORDER_EDGE_RATIO) return 'before'
  if (offsetY > rect.height * (1 - REORDER_EDGE_RATIO)) return 'after'
  return 'inside'
}

interface CollectionsTreeProps {
  collections: CollectionItem[]
  environmentGroups?: EnvironmentGroup[]
  onLinkCollectionToGroup?: (collectionId: string, groupId: string | null) => void
  onLinkFolderToGroup?: (folderId: string, groupId: string | null) => void
  folders: FolderItem[]
  savedRequests: SavedRequestItem[]
  expandedCollectionIds: string[]
  expandedFolderIds: string[]
  activeSavedRequestId?: string
  onToggleCollection: (id: string) => void
  onToggleFolder: (id: string) => void
  onOpenSavedRequest: (item: SavedRequestItem) => void
  onRemoveSavedRequest: (id: string) => void
  onAddCollection: () => void
  onDeleteCollection: (id: string) => void
  onRenameCollection: (id: string, newName: string) => void
  onAddFolder: (collectionId: string, parentFolderId?: string | null) => void
  onDeleteFolder: (folderId: string) => void
  onRenameFolder?: (id: string, newName: string) => void
  onRenameRequest?: (id: string, newName: string) => void
  onImportPostman: () => void
  onExportCollection: (c: CollectionItem) => void
  onMoveRequest?: (
    requestId: string,
    targetCollectionId: string,
    targetFolderId: string | null,
    targetRequestId?: string,
    position?: 'before' | 'after',
  ) => void
  onMoveFolder?: (
    folderId: string,
    targetCollectionId: string,
    targetParentFolderId: string | null,
    targetFolderId?: string,
    position?: 'before' | 'after',
  ) => void
}

export function CollectionsTree({
  collections,
  environmentGroups = [],
  onLinkCollectionToGroup,
  onLinkFolderToGroup,
  folders,
  savedRequests,
  expandedCollectionIds,
  expandedFolderIds,
  activeSavedRequestId,
  onToggleCollection,
  onToggleFolder,
  onOpenSavedRequest,
  onRemoveSavedRequest,
  onAddCollection,
  onDeleteCollection,
  onRenameCollection,
  onAddFolder,
  onDeleteFolder,
  onRenameFolder,
  onRenameRequest,
  onImportPostman,
  onExportCollection,
  onMoveRequest,
  onMoveFolder,
}: CollectionsTreeProps) {
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const [editingCollectionName, setEditingCollectionName] = useState('')

  const [linkingCollectionId, setLinkingCollectionId] = useState<string | null>(null)

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [linkingFolderId, setLinkingFolderId] = useState<string | null>(null)

  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)
  const [editingRequestName, setEditingRequestName] = useState('')

  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const isEditingAny = Boolean(editingCollectionId || editingFolderId || editingRequestId)

  const dragStartTimerRef = useRef<number>()
  const autoExpandRef = useRef<{ id: string; timer: number } | null>(null)

  useEffect(
    () => () => {
      window.clearTimeout(dragStartTimerRef.current)
      window.clearTimeout(autoExpandRef.current?.timer)
    },
    [],
  )

  useEffect(() => {
    if (activeSavedRequestId) {
      const timer = setTimeout(() => {
        const activeEl = document.querySelector(`[data-request-id="${activeSavedRequestId}"]`)
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [activeSavedRequestId, expandedFolderIds, expandedCollectionIds])

  const handleStartRenameCollection = (collection: CollectionItem) => {
    setEditingCollectionId(collection.id)
    setEditingCollectionName(collection.name)
  }

  const handleSaveRenameCollection = (collectionId: string) => {
    const trimmed = editingCollectionName.trim()
    if (trimmed) {
      onRenameCollection(collectionId, trimmed)
    }
    setEditingCollectionId(null)
  }

  const handleStartRenameFolder = (folder: FolderItem) => {
    setEditingFolderId(folder.id)
    setEditingFolderName(folder.name)
  }

  const handleSaveRenameFolder = (folderId: string) => {
    const trimmed = editingFolderName.trim()
    if (trimmed && onRenameFolder) {
      onRenameFolder(folderId, trimmed)
    }
    setEditingFolderId(null)
  }

  const handleStartRenameRequest = (item: SavedRequestItem) => {
    setEditingRequestId(item.id)
    setEditingRequestName(item.name)
  }

  const handleSaveRenameRequest = (requestId: string) => {
    const trimmed = editingRequestName.trim()
    if (trimmed && onRenameRequest) {
      onRenameRequest(requestId, trimmed)
    }
    setEditingRequestId(null)
  }

  // --- Drag and Drop Handlers ---

  const cancelAutoExpand = () => {
    window.clearTimeout(autoExpandRef.current?.timer)
    autoExpandRef.current = null
  }

  // Open a collapsed collection or folder once the drag rests on it
  const scheduleAutoExpand = (id: string, expand: () => void) => {
    if (autoExpandRef.current?.id === id) return
    cancelAutoExpand()
    autoExpandRef.current = { id, timer: window.setTimeout(expand, AUTO_EXPAND_DELAY_MS) }
  }

  // Marking an item as dragged adds drop zones to the tree. Doing that inside the
  // dragstart event can shift the source row, and Chromium then cancels the drag.
  const beginDrag = (item: DragItem) => {
    window.clearTimeout(dragStartTimerRef.current)
    dragStartTimerRef.current = window.setTimeout(() => setDraggedItem(item), 0)
  }

  const handleDragEnd = () => {
    window.clearTimeout(dragStartTimerRef.current)
    cancelAutoExpand()
    setDraggedItem(null)
    setDropTarget(null)
  }

  // dragleave also fires when moving onto a child element, which is not leaving the row
  const handleRowDragLeave = (e: React.DragEvent, id: string) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    if (autoExpandRef.current?.id === id) cancelAutoExpand()
    if (dropTarget?.id === id) setDropTarget(null)
  }

  // Request Drag & Drop
  const handleRequestDragStart = (e: React.DragEvent, item: SavedRequestItem) => {
    e.dataTransfer.setData('text/plain', item.id)
    e.dataTransfer.effectAllowed = 'move'
    beginDrag({
      type: 'REQUEST',
      id: item.id,
      collectionId: item.collectionId,
      folderId: item.folderId || null,
    })
  }

  const handleRequestDragOver = (e: React.DragEvent, targetItem: SavedRequestItem) => {
    e.preventDefault()
    e.stopPropagation()
    cancelAutoExpand()
    if (!draggedItem || draggedItem.id === targetItem.id) return

    const rect = e.currentTarget.getBoundingClientRect()
    const position: DropPosition = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after'

    setDropTarget({
      type: 'REQUEST',
      id: targetItem.id,
      collectionId: targetItem.collectionId,
      position,
    })
  }

  const handleRequestDrop = (e: React.DragEvent, targetItem: SavedRequestItem) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedItem || draggedItem.id === targetItem.id) return

    const rect = e.currentTarget.getBoundingClientRect()
    const position: DropPosition = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after'

    if (draggedItem.type === 'REQUEST' && onMoveRequest) {
      onMoveRequest(
        draggedItem.id,
        targetItem.collectionId,
        targetItem.folderId || null,
        targetItem.id,
        position,
      )
    } else if (draggedItem.type === 'FOLDER' && onMoveFolder) {
      onMoveFolder(
        draggedItem.id,
        targetItem.collectionId,
        targetItem.folderId || null,
      )
    }

    handleDragEnd()
  }

  // Folder Drag & Drop
  const handleFolderDragStart = (e: React.DragEvent, folder: FolderItem) => {
    e.dataTransfer.setData('text/plain', folder.id)
    e.dataTransfer.effectAllowed = 'move'
    beginDrag({
      type: 'FOLDER',
      id: folder.id,
      collectionId: folder.collectionId,
      parentId: folder.parentId || null,
    })
  }

  const handleFolderDragOver = (e: React.DragEvent, targetFolder: FolderItem) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedItem || draggedItem.id === targetFolder.id) return

    // Prevent dragging a folder into itself or its descendants
    if (draggedItem.type === 'FOLDER' && isDescendantFolder(folders, draggedItem.id, targetFolder.id)) {
      e.dataTransfer.dropEffect = 'none'
      return
    }

    const position = getFolderDropPosition(e)
    if (position === 'inside' && !expandedFolderIds.includes(targetFolder.id)) {
      scheduleAutoExpand(targetFolder.id, () => onToggleFolder(targetFolder.id))
    } else {
      cancelAutoExpand()
    }

    setDropTarget({
      type: 'FOLDER',
      id: targetFolder.id,
      collectionId: targetFolder.collectionId,
      position,
    })
  }

  const handleFolderDrop = (e: React.DragEvent, targetFolder: FolderItem) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedItem || draggedItem.id === targetFolder.id) return

    dropIntoFolder(targetFolder, getFolderDropPosition(e))
  }

  const dropIntoFolder = (targetFolder: FolderItem, position: DropPosition) => {
    if (!draggedItem || draggedItem.id === targetFolder.id) return

    if (draggedItem.type === 'REQUEST' && onMoveRequest) {
      if (position === 'inside') {
        onMoveRequest(draggedItem.id, targetFolder.collectionId, targetFolder.id)
      } else {
        onMoveRequest(draggedItem.id, targetFolder.collectionId, targetFolder.parentId || null)
      }
    } else if (draggedItem.type === 'FOLDER' && onMoveFolder) {
      if (isDescendantFolder(folders, draggedItem.id, targetFolder.id)) {
        handleDragEnd()
        return
      }
      if (position === 'inside') {
        onMoveFolder(draggedItem.id, targetFolder.collectionId, targetFolder.id)
      } else {
        onMoveFolder(
          draggedItem.id,
          targetFolder.collectionId,
          targetFolder.parentId || null,
          targetFolder.id,
          position,
        )
      }
    }

    handleDragEnd()
  }

  // "Empty folder" placeholder: dropping anywhere on it moves the item inside
  const handleEmptyZoneDragOver = (
    e: React.DragEvent,
    collectionId: string,
    parentId: string | null,
  ) => {
    if (!parentId) {
      handleCollectionDragOver(e, collectionId)
      return
    }
    e.preventDefault()
    e.stopPropagation()
    cancelAutoExpand()
    if (!draggedItem) return
    if (draggedItem.type === 'FOLDER' && isDescendantFolder(folders, draggedItem.id, parentId)) {
      e.dataTransfer.dropEffect = 'none'
      return
    }
    setDropTarget({ type: 'FOLDER', id: parentId, collectionId, position: 'inside' })
  }

  const handleEmptyZoneDrop = (
    e: React.DragEvent,
    collectionId: string,
    parentId: string | null,
  ) => {
    if (!parentId) {
      handleCollectionDrop(e, collectionId)
      return
    }
    e.preventDefault()
    e.stopPropagation()
    const targetFolder = folders.find((f) => f.id === parentId)
    if (targetFolder) dropIntoFolder(targetFolder, 'inside')
  }

  // Collection Card Drag & Drop (Drop to Root of Collection)
  const handleCollectionDragOver = (e: React.DragEvent, collectionId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedItem) return

    if (expandedCollectionIds.includes(collectionId)) {
      cancelAutoExpand()
    } else {
      scheduleAutoExpand(collectionId, () => onToggleCollection(collectionId))
    }

    setDropTarget({
      type: 'COLLECTION',
      id: collectionId,
      collectionId,
      position: 'inside',
    })
  }

  const handleCollectionDrop = (e: React.DragEvent, collectionId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedItem) return

    if (draggedItem.type === 'REQUEST' && onMoveRequest) {
      onMoveRequest(draggedItem.id, collectionId, null)
    } else if (draggedItem.type === 'FOLDER' && onMoveFolder) {
      onMoveFolder(draggedItem.id, collectionId, null)
    }

    handleDragEnd()
  }

  // Marker on a parent row when folders nested inside it have their own project link
  const renderChildLinkHint = (childFolders: FolderItem[]) => {
    const links = childFolders.flatMap((child) => {
      const group = environmentGroups.find((g) => g.id === child.environmentGroupId)
      return group ? [`${child.name} → ${group.name}`] : []
    })
    if (links.length === 0) return null
    const title = `Folders inside with their own environment group:\n${links.join('\n')}`
    return (
      <span className="child-env-hint" title={title} aria-label={title}>
        <Link2 size={9} />
        {links.length}
      </span>
    )
  }

  // --- Render Folder Tree ---

  const renderFolderItems = (
    collectionId: string,
    parentId: string | null = null,
    level = 1,
  ): React.ReactNode => {
    const childFolders = folders.filter(
      (f) => f.collectionId === collectionId && (f.parentId || null) === parentId,
    )
    const childRequests = savedRequests.filter(
      (r) => r.collectionId === collectionId && (r.folderId || null) === parentId,
    )

    return (
      <div className={level > 1 ? 'folder-tree-branch' : 'folder-tree-root'}>
        {childFolders.map((folder) => {
          const isExpanded = expandedFolderIds.includes(folder.id)
          const isEditing = editingFolderId === folder.id
          const isFolderDragging = draggedItem?.type === 'FOLDER' && draggedItem.id === folder.id
          const isTargetInside =
            dropTarget?.type === 'FOLDER' &&
            dropTarget.id === folder.id &&
            dropTarget.position === 'inside'
          const isTargetBefore =
            dropTarget?.type === 'FOLDER' &&
            dropTarget.id === folder.id &&
            dropTarget.position === 'before'
          const isTargetAfter =
            dropTarget?.type === 'FOLDER' &&
            dropTarget.id === folder.id &&
            dropTarget.position === 'after'

          const linkedGroup = environmentGroups.find((g) => g.id === folder.environmentGroupId)

          return (
            <div key={folder.id} className="folder-node">
              {isEditing ? (
                <div style={{ padding: '2px 4px', width: '100%', height: 28, display: 'flex', alignItems: 'center' }}>
                  <input
                    className="input input-sm"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRenameFolder(folder.id)
                      if (e.key === 'Escape') setEditingFolderId(null)
                    }}
                    onBlur={() => handleSaveRenameFolder(folder.id)}
                    autoFocus
                    style={{ height: 24, fontSize: 11, fontWeight: 650, width: '100%' }}
                  />
                </div>
              ) : (
                <div
                  className={`folder-row group-hover-row tree-item-draggable ${isFolderDragging ? 'is-dragging' : ''
                    } ${isTargetInside ? 'drop-target-inside' : ''} ${isTargetBefore ? 'drop-target-before' : ''
                    } ${isTargetAfter ? 'drop-target-after' : ''}`}
                  draggable={!isEditingAny}
                  onDragStart={(e) => handleFolderDragStart(e, folder)}
                  onDragOver={(e) => handleFolderDragOver(e, folder)}
                  onDragLeave={(e) => handleRowDragLeave(e, folder.id)}
                  onDrop={(e) => handleFolderDrop(e, folder)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onToggleFolder(folder.id)}
                >
                  <div className="folder-info">
                    <span className="folder-chevron">
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </span>
                    <Folder size={13} className="folder-icon" />
                    <span className="folder-name">{folder.name}</span>
                    {renderChildLinkHint(
                      Array.from(getDescendantFolderIds(folders, folder.id))
                        .filter((id) => id !== folder.id)
                        .flatMap((id) => folders.filter((f) => f.id === id)),
                    )}
                    {linkedGroup && (
                      <span
                        className="collection-env-badge"
                        title={`Environment group (project) linked to this folder: ${linkedGroup.name}`}
                      >
                        {linkedGroup.name}
                      </span>
                    )}
                  </div>

                  <div className="hover-actions" onClick={(e) => e.stopPropagation()}>
                    {onLinkFolderToGroup && (
                      <button
                        type="button"
                        className="icon-button icon-button-sm"
                        onClick={() =>
                          setLinkingFolderId((prev) => (prev === folder.id ? null : folder.id))
                        }
                        title="Link to Environment Group (project)"
                      >
                        <Link2 size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-button icon-button-sm rename-btn"
                      onClick={() => handleStartRenameFolder(folder)}
                      title="Rename Folder"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-sm add-folder-btn"
                      onClick={() => onAddFolder(collectionId, folder.id)}
                      title="Add Subfolder"
                    >
                      <FolderPlus size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-sm delete-btn"
                      onClick={() => onDeleteFolder(folder.id)}
                      title="Delete Folder"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}

              {linkingFolderId === folder.id && onLinkFolderToGroup && (
                <div className="collection-link-row">
                  <span className="collection-link-label">Environment group</span>
                  <select
                    className="input input-sm"
                    value={linkedGroup?.id ?? ''}
                    onChange={(e) => {
                      onLinkFolderToGroup(folder.id, e.target.value || null)
                      setLinkingFolderId(null)
                    }}
                    autoFocus
                    onBlur={() => setLinkingFolderId(null)}
                  >
                    <option value="">— Inherit from parent —</option>
                    {environmentGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isExpanded && (
                <div className="folder-children">
                  {renderFolderItems(collectionId, folder.id, level + 1)}
                </div>
              )}
            </div>
          )
        })}

        {childRequests.map((item) => {
          const isEditing = editingRequestId === item.id
          const isActive = Boolean(activeSavedRequestId && item.id === activeSavedRequestId)
          const isItemDragging = draggedItem?.type === 'REQUEST' && draggedItem.id === item.id
          const isTargetBefore =
            dropTarget?.type === 'REQUEST' &&
            dropTarget.id === item.id &&
            dropTarget.position === 'before'
          const isTargetAfter =
            dropTarget?.type === 'REQUEST' &&
            dropTarget.id === item.id &&
            dropTarget.position === 'after'

          return (
            <div
              key={item.id}
              data-request-id={item.id}
              className={`saved-row group-hover-row tree-item-draggable ${
                isActive ? 'is-active' : ''
              } ${isItemDragging ? 'is-dragging' : ''} ${
                isTargetBefore ? 'drop-target-before' : ''
              } ${isTargetAfter ? 'drop-target-after' : ''}`}
              draggable={!isEditingAny}
              onDragStart={(e) => handleRequestDragStart(e, item)}
              onDragOver={(e) => handleRequestDragOver(e, item)}
              onDragLeave={() => {
                if (dropTarget?.id === item.id) setDropTarget(null)
              }}
              onDrop={(e) => handleRequestDrop(e, item)}
              onDragEnd={handleDragEnd}
              onClick={() => onOpenSavedRequest(item)}
            >
              {isEditing ? (
                <div style={{ padding: '2px 4px', width: '100%', height: 28, display: 'flex', alignItems: 'center' }}>
                  <input
                    className="input input-sm"
                    value={editingRequestName}
                    onChange={(e) => setEditingRequestName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRenameRequest(item.id)
                      if (e.key === 'Escape') setEditingRequestId(null)
                    }}
                    onBlur={() => handleSaveRenameRequest(item.id)}
                    autoFocus
                    style={{ height: 24, fontSize: 11, fontWeight: 650, width: '100%' }}
                  />
                </div>
              ) : (
                <>
                  <div className="saved-request-info">
                    <FileCode size={13} className="request-icon" />
                    <span className={`method-badge ${getMethodBadgeClass(item.request.mode, item.request.method)}`}>
                      {item.request.mode === 'GRAPHQL' ? 'GQL' : item.request.method}
                    </span>
                    <span className="saved-request-name">{item.name}</span>
                  </div>

                  <div className="hover-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="icon-button icon-button-sm rename-btn"
                      onClick={() => handleStartRenameRequest(item)}
                      title="Rename Request"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-sm delete-btn"
                      onClick={() => onRemoveSavedRequest(item.id)}
                      aria-label={`Delete saved request ${item.name}`}
                      title="Delete Saved Request"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}

        {childFolders.length === 0 && childRequests.length === 0 && (
          <div
            className={`empty-folder-drop-zone ${
              dropTarget?.type === 'FOLDER' &&
              dropTarget.id === parentId &&
              dropTarget.position === 'inside'
                ? 'drop-target-inside'
                : ''
            }`}
            onDragOver={(e) => handleEmptyZoneDragOver(e, collectionId, parentId)}
            onDrop={(e) => handleEmptyZoneDrop(e, collectionId, parentId)}
          >
            Empty folder
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="collections-tree-section collections-tree-container collections-tree">
      <div className="row-between" style={{ padding: '0 4px 8px 4px' }}>
        <div className="caps">Collections ({collections.length})</div>
        <div className="row" style={{ gap: 4 }}>
          <button
            type="button"
            className="icon-button icon-button-sm"
            onClick={onImportPostman}
            title="Import Postman Collection v2.1"
          >
            <Upload size={14} />
          </button>
          <button
            type="button"
            className="button button-sm"
            onClick={onAddCollection}
            title="New Collection"
          >
            <Plus size={13} />
            <span>Collection</span>
          </button>
        </div>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        {collections.map((collection) => {
          const isExpanded = expandedCollectionIds.includes(collection.id)
          const isEditing = editingCollectionId === collection.id
          const isCollectionDropTarget =
            dropTarget?.type === 'COLLECTION' && dropTarget.id === collection.id

          return (
            <div
              key={collection.id}
              className={`collection-card ${isCollectionDropTarget ? 'drop-target-inside' : ''}`}
            >
              {isEditing ? (
                <div style={{ padding: '3px 4px', height: 28, display: 'flex', alignItems: 'center' }}>
                  <input
                    className="input input-sm"
                    value={editingCollectionName}
                    onChange={(e) => setEditingCollectionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRenameCollection(collection.id)
                      if (e.key === 'Escape') setEditingCollectionId(null)
                    }}
                    onBlur={() => handleSaveRenameCollection(collection.id)}
                    autoFocus
                    style={{ height: 24, fontSize: 12, fontWeight: 700, width: '100%' }}
                  />
                </div>
              ) : (
                <div
                  className="collection-header group-hover-row"
                  onClick={() => onToggleCollection(collection.id)}
                  onDragOver={(e) => handleCollectionDragOver(e, collection.id)}
                  onDragLeave={(e) => handleRowDragLeave(e, collection.id)}
                  onDrop={(e) => handleCollectionDrop(e, collection.id)}
                >
                  <div
                    className="collection-info"
                    aria-expanded={isExpanded}
                  >
                    <span className="collection-chevron">
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </span>
                    <Folder size={14} style={{ color: 'var(--primary-bright)', flexShrink: 0 }} />
                    <span className="collection-title-text">{collection.name}</span>
                    {renderChildLinkHint(folders.filter((f) => f.collectionId === collection.id))}
                    {collection.environmentGroupId &&
                      environmentGroups.some((g) => g.id === collection.environmentGroupId) && (
                        <span
                          className="collection-env-badge"
                          title="Environment group (project) linked to this collection"
                        >
                          {environmentGroups.find((g) => g.id === collection.environmentGroupId)?.name}
                        </span>
                      )}
                  </div>

                  <div
                    className="hover-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onLinkCollectionToGroup && (
                      <button
                        type="button"
                        className="icon-button icon-button-sm"
                        onClick={() =>
                          setLinkingCollectionId((prev) =>
                            prev === collection.id ? null : collection.id,
                          )
                        }
                        title="Link to Environment Group (project)"
                      >
                        <Link2 size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-button icon-button-sm rename-btn"
                      onClick={() => handleStartRenameCollection(collection)}
                      title="Rename Collection"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-sm add-folder-btn"
                      onClick={() => onAddFolder(collection.id, null)}
                      title="Add Folder"
                    >
                      <FolderPlus size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-sm export-btn"
                      onClick={() => onExportCollection(collection)}
                      title="Export as Postman Collection v2.1"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-sm delete-btn"
                      onClick={() => onDeleteCollection(collection.id)}
                      title="Delete Collection"
                      disabled={collections.length === 1}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}

              {linkingCollectionId === collection.id && onLinkCollectionToGroup && (
                <div className="collection-link-row" onClick={(e) => e.stopPropagation()}>
                  <span className="collection-link-label">Environment group</span>
                  <select
                    className="input input-sm"
                    value={collection.environmentGroupId ?? ''}
                    onChange={(e) => {
                      onLinkCollectionToGroup(collection.id, e.target.value || null)
                      setLinkingCollectionId(null)
                    }}
                    autoFocus
                    onBlur={() => setLinkingCollectionId(null)}
                  >
                    <option value="">— None (global environment) —</option>
                    {environmentGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isExpanded && (
                <>
                  <div className="collection-body" style={{ marginTop: 4 }}>
                    {renderFolderItems(collection.id, null, 1)}
                  </div>

                  {draggedItem && (
                    <div
                      className={`collection-root-drop-zone ${dropTarget?.type === 'COLLECTION' &&
                          dropTarget.id === `${collection.id}-root-zone`
                          ? 'drop-target-inside'
                          : ''
                        }`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDropTarget({
                          type: 'COLLECTION',
                          id: `${collection.id}-root-zone`,
                          collectionId: collection.id,
                          position: 'inside',
                        })
                      }}
                      onDragLeave={() => {
                        if (dropTarget?.id === `${collection.id}-root-zone`) {
                          setDropTarget(null)
                        }
                      }}
                      onDrop={(e) => handleCollectionDrop(e, collection.id)}
                    >
                      <span>Drop here to move to {collection.name} root</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
