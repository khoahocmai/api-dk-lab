import React, { useEffect, useMemo, useState } from 'react'
import type { CollectionItem, FolderItem } from '../../types'
import { Modal } from '../common/Modal'
import { FolderPicker } from './FolderPicker'

interface SaveRequestModalProps {
  isOpen: boolean
  onClose: () => void
  initialName: string
  collections: CollectionItem[]
  folders: FolderItem[]
  defaultCollectionId?: string
  defaultFolderId?: string | null
  onSave: (name: string, collectionId: string, folderId: string | null) => void
  onCreateFolder?: (collectionId: string, parentId: string | null, name: string) => string
}

export function SaveRequestModal({
  isOpen,
  onClose,
  initialName,
  collections,
  folders,
  defaultCollectionId,
  defaultFolderId,
  onSave,
  onCreateFolder,
}: SaveRequestModalProps) {
  const [name, setName] = useState('')
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      setName(initialName || 'Untitled Request')
      const targetColId =
        defaultCollectionId && collections.some((c) => c.id === defaultCollectionId)
          ? defaultCollectionId
          : collections[0]?.id || ''
      setSelectedCollectionId(targetColId)
      setSelectedFolderId(defaultFolderId || '')
    }
  }, [isOpen, initialName, defaultCollectionId, defaultFolderId, collections])

  // Reset folder selection when collection changes if folder does not belong to new collection
  useEffect(() => {
    if (selectedFolderId) {
      const match = folders.find(
        (f) => f.id === selectedFolderId && f.collectionId === selectedCollectionId,
      )
      if (!match) {
        setSelectedFolderId('')
      }
    }
  }, [selectedCollectionId, folders, selectedFolderId])

  // Selected collection object
  const selectedCollection = useMemo(
    () => collections.find((c) => c.id === selectedCollectionId),
    [collections, selectedCollectionId],
  )

  // Compute folder breadcrumb
  const folderBreadcrumb = useMemo(() => {
    if (!selectedFolderId) return ''
    const path: string[] = []
    let current: FolderItem | undefined = folders.find((f) => f.id === selectedFolderId)
    while (current) {
      path.unshift(current.name)
      current = current.parentId ? folders.find((f) => f.id === current?.parentId) : undefined
    }
    return path.join(' / ')
  }, [selectedFolderId, folders])

  // Full destination path for the footer preview
  const fullTargetPath = useMemo(() => {
    const colName = selectedCollection?.name || 'Collection'
    if (!selectedFolderId || !folderBreadcrumb) {
      return `${colName} (Root level)`
    }
    return `${colName} / ${folderBreadcrumb}`
  }, [selectedCollection, selectedFolderId, folderBreadcrumb])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim() || initialName || 'Untitled Request'
    if (!selectedCollectionId) return
    onSave(trimmedName, selectedCollectionId, selectedFolderId || null)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save Request" maxWidth="800px">
      <form onSubmit={handleSubmit} className="save-request-form">
        {/* Top Fields Grid */}
        <div className="save-request-top-grid">
          <div className="save-request-field">
            <label className="caps" htmlFor="save-request-name">
              Request Name
            </label>
            <input
              id="save-request-name"
              className="input save-request-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. kiotVietCustomerGetBy3rdLookup"
              autoFocus
            />
          </div>

          <div className="save-request-field">
            <label className="caps" htmlFor="save-request-collection">
              Collection
            </label>
            <select
              id="save-request-collection"
              className="select save-request-select"
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
            >
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Central Inlined Folder Tree Browser */}
        <div className="save-request-folder-section">
          <label className="caps" htmlFor="save-request-folder">
            Select Location (Folder)
          </label>
          <FolderPicker
            collectionId={selectedCollectionId}
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={onCreateFolder}
          />
        </div>

        {/* Footer with Destination Breadcrumb and Actions */}
        <div className="save-request-footer">
          <div className="save-request-target-path" title={fullTargetPath}>
            <span className="save-request-pin">📍</span>
            <span className="save-request-saving-label">Saving to:</span>
            <span className="save-request-saving-path">{fullTargetPath}</span>
          </div>

          <div className="save-request-footer-buttons">
            <button
              type="button"
              className="button save-request-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary save-request-btn-submit"
              disabled={!name.trim() || !selectedCollectionId}
            >
              Save to Collection
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
