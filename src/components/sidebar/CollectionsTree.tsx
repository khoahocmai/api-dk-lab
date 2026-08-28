import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileCode,
  Folder,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import type { CollectionItem, FolderItem, SavedRequestItem } from '../../types'
import { isDescendantFolder } from '../../utils/treeHelper'
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

interface CollectionsTreeProps {
  collections: CollectionItem[]
  folders: FolderItem[]
  savedRequests: SavedRequestItem[]
  expandedCollectionIds: string[]
  expandedFolderIds: string[]
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
  folders,
  savedRequests,
  expandedCollectionIds,
  expandedFolderIds,
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

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')

  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)
  const [editingRequestName, setEditingRequestName] = useState('')

  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const isEditingAny = Boolean(editingCollectionId || editingFolderId || editingRequestId)

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

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDropTarget(null)
  }

  // Request Drag & Drop
  const handleRequestDragStart = (e: React.DragEvent, item: SavedRequestItem) => {
    e.dataTransfer.setData('text/plain', item.id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedItem({
      type: 'REQUEST',
      id: item.id,
      collectionId: item.collectionId,
      folderId: item.folderId || null,
    })
  }

  const handleRequestDragOver = (e: React.DragEvent, targetItem: SavedRequestItem) => {
    e.preventDefault()
    e.stopPropagation()
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
    setDraggedItem({
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

    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    let position: DropPosition = 'inside'

    if (offsetY < rect.height * 0.25) {
      position = 'before'
    } else if (offsetY > rect.height * 0.75) {
      position = 'after'
    } else {
      position = 'inside'
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

    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    let position: DropPosition = 'inside'

    if (offsetY < rect.height * 0.25) {
      position = 'before'
    } else if (offsetY > rect.height * 0.75) {
      position = 'after'
    } else {
      position = 'inside'
    }

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

  // Collection Card Drag & Drop (Drop to Root of Collection)
  const handleCollectionDragOver = (e: React.DragEvent, collectionId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedItem) return

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
                  onDragLeave={() => {
                    if (dropTarget?.id === folder.id) setDropTarget(null)
                  }}
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
                  </div>

                  <div className="hover-actions" onClick={(e) => e.stopPropagation()}>
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
              className={`saved-row group-hover-row tree-item-draggable ${isItemDragging ? 'is-dragging' : ''
                } ${isTargetBefore ? 'drop-target-before' : ''} ${isTargetAfter ? 'drop-target-after' : ''
                }`}
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
            className={`empty-folder-drop-zone ${dropTarget?.type === 'FOLDER' && dropTarget.id === parentId
                ? 'drop-target-inside'
                : ''
              }`}
            onDragOver={(e) => {
              if (parentId) {
                const targetFolder = folders.find((f) => f.id === parentId)
                if (targetFolder) handleFolderDragOver(e, targetFolder)
              }
            }}
            onDrop={(e) => {
              if (parentId) {
                const targetFolder = folders.find((f) => f.id === parentId)
                if (targetFolder) handleFolderDrop(e, targetFolder)
              }
            }}
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
                  onDragLeave={() => {
                    if (dropTarget?.id === collection.id) setDropTarget(null)
                  }}
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
                  </div>

                  <div
                    className="hover-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
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
