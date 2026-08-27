import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  Search,
  X,
} from 'lucide-react'
import type { FolderItem } from '../../types'

interface FolderPickerProps {
  collectionId: string
  folders: FolderItem[]
  selectedFolderId: string
  onSelectFolder: (folderId: string) => void
  onCreateFolder?: (collectionId: string, parentId: string | null, name: string) => string
}

interface FolderTreeNode {
  id: string
  name: string
  collectionId: string
  parentId: string | null
  children: FolderTreeNode[]
}

function buildFolderTree(
  folders: FolderItem[],
  collectionId: string,
  parentId: string | null = null,
): FolderTreeNode[] {
  return folders
    .filter((f) => f.collectionId === collectionId && (f.parentId || null) === parentId)
    .map((f) => ({
      id: f.id,
      name: f.name,
      collectionId: f.collectionId,
      parentId: f.parentId || null,
      children: buildFolderTree(folders, collectionId, f.id),
    }))
}

export function FolderPicker({
  collectionId,
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
}: FolderPickerProps) {
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const searchInputRef = useRef<HTMLInputElement>(null)
  const newFolderInputRef = useRef<HTMLInputElement>(null)

  // Full folder tree for current collection
  const fullTree = useMemo(
    () => buildFolderTree(folders, collectionId, null),
    [folders, collectionId],
  )

  // Selected folder item
  const selectedFolder = useMemo(
    () => folders.find((f) => f.id === selectedFolderId),
    [folders, selectedFolderId],
  )

  // Expand ancestors of selected folder on open or change
  useEffect(() => {
    if (selectedFolderId) {
      const ancestors: string[] = []
      let curr = folders.find((f) => f.id === selectedFolderId)
      while (curr?.parentId) {
        ancestors.push(curr.parentId)
        curr = folders.find((f) => f.id === curr?.parentId)
      }
      if (ancestors.length > 0) {
        setExpandedIds((prev) => new Set([...Array.from(prev), ...ancestors]))
      }
    }
  }, [selectedFolderId, folders])

  // Focus new folder input when creation mode opens
  useEffect(() => {
    if (isCreating) {
      newFolderInputRef.current?.focus()
    }
  }, [isCreating])

  // Filtered tree calculation
  const { filteredTree, autoExpandedIds } = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      return { filteredTree: fullTree, autoExpandedIds: new Set<string>() }
    }

    const matchingSet = new Set<string>()
    const expandSet = new Set<string>()

    function filterNodes(nodes: FolderTreeNode[]): FolderTreeNode[] {
      const result: FolderTreeNode[] = []
      for (const node of nodes) {
        const isSelfMatch = node.name.toLowerCase().includes(term)
        const filteredChildren = filterNodes(node.children)
        const hasMatchingChild = filteredChildren.length > 0

        if (isSelfMatch || hasMatchingChild) {
          if (isSelfMatch) matchingSet.add(node.id)
          if (hasMatchingChild) expandSet.add(node.id)
          result.push({
            ...node,
            children: filteredChildren,
          })
        }
      }
      return result
    }

    const filtered = filterNodes(fullTree)
    return { filteredTree: filtered, autoExpandedIds: expandSet }
  }, [fullTree, search])

  const toggleExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const handleSelect = (folderId: string) => {
    onSelectFolder(folderId)
  }

  const handleCreateNewFolder = (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = newFolderName.trim()
    if (!trimmed || !onCreateFolder) return

    const parentId = selectedFolderId || null
    const newId = onCreateFolder(collectionId, parentId, trimmed)
    if (parentId) {
      setExpandedIds((prev) => new Set([...Array.from(prev), parentId]))
    }
    onSelectFolder(newId)
    setIsCreating(false)
    setNewFolderName('')
  }

  // Render tree node recursively
  const renderTreeNode = (node: FolderTreeNode, depth = 0) => {
    const hasChildren = node.children.length > 0
    const isExpanded = search ? autoExpandedIds.has(node.id) || expandedIds.has(node.id) : expandedIds.has(node.id)
    const isSelected = selectedFolderId === node.id

    return (
      <div key={node.id} className="inlined-folder-node">
        <div
          className={`inlined-folder-row ${isSelected ? 'is-selected' : ''}`}
          style={{ paddingLeft: `${depth * 18 + 12}px` }}
          onClick={() => handleSelect(node.id)}
          role="button"
          tabIndex={0}
        >
          {hasChildren ? (
            <button
              type="button"
              className="inlined-folder-chevron"
              onClick={(e) => toggleExpand(node.id, e)}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="inlined-folder-spacer" />
          )}

          {isSelected || isExpanded ? (
            <FolderOpen size={15} className="inlined-folder-icon is-active" />
          ) : (
            <Folder size={15} className="inlined-folder-icon" />
          )}

          <span className="inlined-folder-label" title={node.name}>
            {node.name}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div className="inlined-folder-children">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="inlined-folder-browser">
      {/* Sticky Search Header */}
      <div className="inlined-folder-search-header">
        <Search size={14} className="inlined-folder-search-icon" />
        <input
          ref={searchInputRef}
          type="text"
          className="inlined-folder-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter folders..."
        />
        {search && (
          <button
            type="button"
            className="inlined-folder-clear-search"
            onClick={() => setSearch('')}
            title="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Main Hierarchical Tree Scroll Area */}
      <div className="inlined-folder-tree custom-scrollbar">
        {/* Option 1: Root level */}
        <div
          className={`inlined-folder-row inlined-folder-root-row ${!selectedFolderId ? 'is-selected' : ''}`}
          onClick={() => handleSelect('')}
          role="button"
          tabIndex={0}
        >
          <span className="inlined-folder-spacer" />
          <Folder size={15} className={`inlined-folder-icon ${!selectedFolderId ? 'is-active' : ''}`} />
          <span className="inlined-folder-label font-medium">(Root level - No folder)</span>
        </div>

        {/* Tree nodes */}
        {filteredTree.length > 0 ? (
          filteredTree.map((node) => renderTreeNode(node, 0))
        ) : search ? (
          <div className="inlined-folder-empty">
            Không tìm thấy folder nào khớp với "{search}"
          </div>
        ) : (
          <div className="inlined-folder-empty">
            Chưa có folder nào trong Collection này. Bạn có thể tạo folder mới bên dưới.
          </div>
        )}
      </div>

      {/* Footer: Create Subfolder Quick Action */}
      {onCreateFolder && (
        <div className="inlined-folder-footer">
          {isCreating ? (
            <form onSubmit={handleCreateNewFolder} className="inlined-folder-create-form">
              <input
                ref={newFolderInputRef}
                type="text"
                className="inlined-folder-create-input"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={`Folder name in ${selectedFolder ? selectedFolder.name : 'Root'}...`}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsCreating(false)
                    setNewFolderName('')
                  }
                }}
              />
              <div className="inlined-folder-create-actions">
                <button
                  type="submit"
                  className="button button-sm button-primary"
                  disabled={!newFolderName.trim()}
                  title="Create folder"
                >
                  <Check size={13} />
                  <span>Create</span>
                </button>
                <button
                  type="button"
                  className="button button-sm"
                  onClick={() => {
                    setIsCreating(false)
                    setNewFolderName('')
                  }}
                  title="Cancel"
                >
                  <X size={13} />
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="inlined-folder-new-btn"
              onClick={() => setIsCreating(true)}
            >
              <Plus size={14} />
              <span>
                {selectedFolder ? `New Subfolder in "${selectedFolder.name}"` : 'New Folder in Root'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
