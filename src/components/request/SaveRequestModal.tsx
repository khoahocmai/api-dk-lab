import React, { useEffect, useMemo, useState } from 'react'
import type { CollectionItem, FolderItem } from '../../types'
import { Modal } from '../common/Modal'

interface SaveRequestModalProps {
  isOpen: boolean
  onClose: () => void
  initialName: string
  collections: CollectionItem[]
  folders: FolderItem[]
  defaultCollectionId?: string
  defaultFolderId?: string | null
  onSave: (name: string, collectionId: string, folderId: string | null) => void
}

interface HierarchicalFolder {
  id: string
  name: string
  depth: number
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

  // Build hierarchical folder list for the selected collection
  const availableFolders = useMemo(() => {
    if (!selectedCollectionId) return []

    const result: HierarchicalFolder[] = []

    function traverse(parentId: string | null = null, depth = 0) {
      const children = folders.filter(
        (f) => f.collectionId === selectedCollectionId && (f.parentId || null) === parentId,
      )
      for (const child of children) {
        result.push({
          id: child.id,
          name: child.name,
          depth,
        })
        traverse(child.id, depth + 1)
      }
    }

    traverse(null, 0)
    return result
  }, [folders, selectedCollectionId])

  // Reset folder selection if current selectedFolderId is not in availableFolders
  useEffect(() => {
    if (selectedFolderId && !availableFolders.some((f) => f.id === selectedFolderId)) {
      setSelectedFolderId('')
    }
  }, [selectedCollectionId, availableFolders, selectedFolderId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim() || initialName || 'Untitled Request'
    if (!selectedCollectionId) return
    onSave(trimmedName, selectedCollectionId, selectedFolderId || null)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save Request" maxWidth="460px">
      <form onSubmit={handleSubmit} className="stack" style={{ gap: 12 }}>
        <div className="stack" style={{ gap: 4 }}>
          <label className="caps" htmlFor="save-request-name">
            Request Name
          </label>
          <input
            id="save-request-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Get User Profile"
            autoFocus
          />
        </div>

        <div className="stack" style={{ gap: 4 }}>
          <label className="caps" htmlFor="save-request-collection">
            Collection
          </label>
          <select
            id="save-request-collection"
            className="select"
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

        <div className="stack" style={{ gap: 4 }}>
          <label className="caps" htmlFor="save-request-folder">
            Folder (Optional)
          </label>
          <select
            id="save-request-folder"
            className="select"
            value={selectedFolderId}
            onChange={(e) => setSelectedFolderId(e.target.value)}
          >
            <option value="">(Root level - No folder)</option>
            {availableFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {'\u00A0\u00A0'.repeat(folder.depth)}📁 {folder.name}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-footer" style={{ marginTop: 8 }}>
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={!name.trim() || !selectedCollectionId}
          >
            Save to Collection
          </button>
        </div>
      </form>
    </Modal>
  )
}
