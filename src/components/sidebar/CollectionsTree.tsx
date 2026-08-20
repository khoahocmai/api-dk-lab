import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileCode2,
  Folder,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import type { CollectionItem, FolderItem, SavedRequestItem } from '../../types'

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
  onImportPostman: () => void
  onExportCollection: (c: CollectionItem) => void
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
  onImportPostman,
  onExportCollection,
}: CollectionsTreeProps) {
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const [editingCollectionName, setEditingCollectionName] = useState('')

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')

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
      <div className="folder-tree-branch" style={{ paddingLeft: level > 1 ? 12 : 6 }}>
        {childFolders.map((folder) => {
          const isExpanded = expandedFolderIds.includes(folder.id)
          const isEditing = editingFolderId === folder.id

          return (
            <div key={folder.id} className="folder-node" style={{ marginBottom: 4 }}>
              {isEditing ? (
                <div style={{ padding: '2px 4px' }}>
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
                    style={{ height: 24, fontSize: 11, fontWeight: 650 }}
                  />
                </div>
              ) : (
                <div className="folder-row row-between group-hover-row">
                  <button
                    type="button"
                    className="collection-button folder-button"
                    onClick={() => onToggleFolder(folder.id)}
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Folder size={14} className="folder-icon" />
                    <span className="folder-name">{folder.name}</span>
                  </button>

                  <div className="row hover-actions" style={{ gap: 2 }}>
                    <button
                      type="button"
                      className="icon-button icon-button-sm"
                      onClick={() => handleStartRenameFolder(folder)}
                      title="Rename Folder"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-sm"
                      onClick={() => onAddFolder(collectionId, folder.id)}
                      title="Add Subfolder"
                    >
                      <FolderPlus size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-sm"
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

        {childRequests.map((item) => (
          <div key={item.id} className="saved-row group-hover-row" style={{ marginBottom: 4 }}>
            <button
              className="saved-request-button"
              onClick={() => onOpenSavedRequest(item)}
            >
              <FileCode2 size={14} />
              <span
                className={`method-tag method-tag-sm ${
                  item.request.mode === 'GRAPHQL' ? 'method-graphql' : 'method-rest'
                }`}
              >
                {item.request.mode === 'GRAPHQL' ? 'GQL' : item.request.method}
              </span>
              <span className="saved-request-name">{item.name}</span>
            </button>
            <button
              className="icon-button icon-button-sm hover-actions"
              onClick={() => onRemoveSavedRequest(item.id)}
              aria-label={`Delete saved request ${item.name}`}
              title="Delete Saved Request"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        {childFolders.length === 0 && childRequests.length === 0 && (
          <div className="meta-text" style={{ padding: '4px 8px', fontStyle: 'italic' }}>
            Empty folder
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="collections-tree-section">
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

          return (
            <div key={collection.id} className="collection-card">
              {isEditing ? (
                <div style={{ padding: '3px 4px' }}>
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
                    style={{ height: 24, fontSize: 12, fontWeight: 700 }}
                  />
                </div>
              ) : (
                <div className="collection-header row-between group-hover-row">
                  <button
                    className="collection-button"
                    onClick={() => onToggleCollection(collection.id)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Folder size={14} style={{ color: 'var(--primary-bright)' }} />
                    <span className="collection-title-text">{collection.name}</span>
                  </button>

                  <div className="row hover-actions" style={{ gap: 2 }}>
                    <button
                      type="button"
                      className="icon-button icon-button-sm"
                      onClick={() => handleStartRenameCollection(collection)}
                      title="Rename Collection"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-sm"
                      onClick={() => onAddFolder(collection.id, null)}
                      title="Add Folder"
                    >
                      <FolderPlus size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-sm"
                      onClick={() => onExportCollection(collection)}
                      title="Export as Postman Collection v2.1"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button-sm"
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
                <div className="collection-body" style={{ marginTop: 4 }}>
                  {renderFolderItems(collection.id, null, 1)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
