import { useEffect, useState } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  Globe,
  History as HistoryIcon,
  Layers,
  PanelRightClose,
  Pencil,
  Plus,
  Settings,
  Trash2,
  X,
} from 'lucide-react'
import type {
  CollectionItem,
  EnvironmentItem,
  EnvironmentVariable,
  FolderItem,
  HistoryItem,
  SavedRequestItem,
  SidebarTab,
} from '../../types'
import { CollectionsTree } from '../sidebar/CollectionsTree'
import { HistoryList } from '../sidebar/HistoryList'

interface SidebarProps {
  isMobileActive: boolean
  environments: EnvironmentItem[]
  activeEnvironmentId: string
  activeEnvironment: EnvironmentItem | null
  collections: CollectionItem[]
  folders: FolderItem[]
  savedRequests: SavedRequestItem[]
  expandedCollectionIds: string[]
  expandedFolderIds: string[]
  history: HistoryItem[]
  onAddTab: () => void
  onAddEnvironment: () => void
  onSelectEnvironment: (id: string) => void
  onRenameEnvironment: (id: string, newName: string) => void
  onDeleteEnvironment: (id: string) => void
  onUpdateEnvironmentVariable: (
    envId: string,
    varId: string,
    patch: Partial<EnvironmentVariable>,
  ) => void
  onDeleteEnvironmentVariable: (envId: string, varId: string) => void
  onAddEnvironmentVariable: () => void
  onToggleCollection: (collectionId: string) => void
  onToggleFolder: (folderId: string) => void
  onOpenSavedRequest: (item: SavedRequestItem) => void
  onRemoveSavedRequest: (savedId: string) => void
  onAddCollection: () => void
  onDeleteCollection: (id: string) => void
  onRenameCollection: (id: string, newName: string) => void
  onAddFolder: (collectionId: string, parentFolderId?: string | null) => void
  onDeleteFolder: (folderId: string) => void
  onRenameFolder?: (id: string, newName: string) => void
  onImportPostman: () => void
  onExportCollection: (c: CollectionItem) => void
  onRestoreHistory: (item: HistoryItem) => void
  onDeleteHistoryItem: (id: string) => void
  onClearHistory: () => void
  onOpenSettings: () => void
  onToggleCollapseSidebar?: () => void
}

export function Sidebar({
  isMobileActive,
  environments,
  activeEnvironmentId,
  activeEnvironment,
  collections,
  folders,
  savedRequests,
  expandedCollectionIds,
  expandedFolderIds,
  history,
  onAddTab,
  onAddEnvironment,
  onSelectEnvironment,
  onRenameEnvironment,
  onDeleteEnvironment,
  onUpdateEnvironmentVariable,
  onDeleteEnvironmentVariable,
  onAddEnvironmentVariable,
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
  onRestoreHistory,
  onDeleteHistoryItem,
  onClearHistory,
  onOpenSettings,
  onToggleCollapseSidebar,
}: SidebarProps) {
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('COLLECTIONS')
  const [isEditingEnv, setIsEditingEnv] = useState<boolean>(false)
  const [tempEnvName, setTempEnvName] = useState<string>('')

  const currentEnvId = activeEnvironment?.id || activeEnvironmentId || environments[0]?.id || ''

  useEffect(() => {
    if (activeEnvironment && !isEditingEnv) {
      setTempEnvName(activeEnvironment.name)
    }
  }, [activeEnvironment, isEditingEnv])

  const handleStartRename = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setTempEnvName(activeEnvironment?.name || '')
    setIsEditingEnv(true)
  }

  const handleSaveRename = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const trimmed = tempEnvName.trim()
    if (trimmed && currentEnvId) {
      onRenameEnvironment(currentEnvId, trimmed)
    }
    setIsEditingEnv(false)
  }

  const handleCancelRename = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setTempEnvName(activeEnvironment?.name || '')
    setIsEditingEnv(false)
  }

  return (
    <aside className={`panel ${isMobileActive ? 'is-mobile-active' : ''}`} style={{ height: '100%' }}>
      {/* Workspace Header */}
      <div className="panel-header" style={{ padding: '8px 10px' }}>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <div className="workspace-title">API Lab</div>
          <div className="row" style={{ gap: 2 }}>
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={onAddTab}
              aria-label="Create new tab"
              title="Create New Tab"
            >
              <Plus size={13} />
            </button>
            {onToggleCollapseSidebar && (
              <button
                type="button"
                className="icon-button icon-button-sm"
                onClick={onToggleCollapseSidebar}
                aria-label="Collapse Sidebar (Ctrl+B)"
                title="Collapse Sidebar (Ctrl+B)"
              >
                <PanelRightClose size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Nav Tabs */}
        <div className="segmented" style={{ width: '100%' }}>
          <button
            type="button"
            className={`segment-button ${activeSidebarTab === 'COLLECTIONS' ? 'is-active' : ''}`}
            onClick={() => setActiveSidebarTab('COLLECTIONS')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Layers size={13} />
            Collections
          </button>
          <button
            type="button"
            className={`segment-button ${activeSidebarTab === 'HISTORY' ? 'is-active' : ''}`}
            onClick={() => setActiveSidebarTab('HISTORY')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <HistoryIcon size={13} />
            History ({history.length})
          </button>
        </div>
      </div>

      {/* Environment Section */}
      <div className="panel-header" style={{ padding: '8px 10px' }}>
        <div className="row-between" style={{ marginBottom: 6 }}>
          <div className="row" style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-dim)' }}>
            <Globe size={13} />
            <span>ENVIRONMENT</span>
          </div>
          <div className="row" style={{ gap: 2 }}>
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={onAddEnvironment}
              title="Add New Environment"
            >
              <Plus size={13} />
            </button>
            <button
              type="button"
              className={`icon-button icon-button-sm ${isEditingEnv ? 'is-active' : ''}`}
              title="Rename Environment"
              onClick={handleStartRename}
              style={{ cursor: 'pointer' }}
            >
              <Pencil size={12} style={{ pointerEvents: 'none' }} />
            </button>
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={() => onDeleteEnvironment(currentEnvId)}
              title="Delete Entire Environment"
              disabled={environments.length <= 1}
              style={{ cursor: environments.length <= 1 ? 'not-allowed' : 'pointer' }}
            >
              <Trash2 size={12} style={{ pointerEvents: 'none' }} />
            </button>
          </div>
        </div>

        {isEditingEnv ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <input
              type="text"
              className="input input-sm"
              value={tempEnvName}
              onChange={(e) => setTempEnvName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSaveRename()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  handleCancelRename()
                }
              }}
              autoFocus
              placeholder="Environment Name"
              style={{
                fontWeight: 650,
                flex: 1,
                height: 26,
                background: 'var(--bg-input)',
                borderColor: 'var(--primary)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={handleSaveRename}
              title="Save"
              style={{ background: 'var(--primary-subtle)', color: 'var(--primary-bright)', width: 26, height: 26, cursor: 'pointer' }}
            >
              <Check size={13} style={{ pointerEvents: 'none' }} />
            </button>
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={handleCancelRename}
              title="Cancel"
              style={{ width: 26, height: 26, cursor: 'pointer' }}
            >
              <X size={13} style={{ pointerEvents: 'none' }} />
            </button>
          </div>
        ) : (
          <select
            className="select select-sm"
            value={currentEnvId}
            onChange={(event) => onSelectEnvironment(event.target.value)}
            aria-label="Active environment"
            style={{ fontWeight: 650, marginBottom: 6 }}
          >
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        )}

        <div className="env-grid">
          {activeEnvironment?.variables.map((item) => (
            <div key={item.id} className="env-row">
              <input
                aria-label={`Enable ${item.key || 'environment variable'}`}
                type="checkbox"
                checked={item.enabled}
                onChange={(event) =>
                  onUpdateEnvironmentVariable(activeEnvironment.id, item.id, {
                    enabled: event.target.checked,
                  })
                }
              />
              <input
                className="input input-sm"
                value={item.key}
                onChange={(event) =>
                  onUpdateEnvironmentVariable(activeEnvironment.id, item.id, {
                    key: event.target.value,
                  })
                }
                placeholder="key"
                aria-label="Environment variable key"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <input
                className={`input input-sm env-value ${item.secret ? 'input-secret' : ''}`}
                type={item.secret ? 'password' : 'text'}
                value={item.value}
                onChange={(event) =>
                  onUpdateEnvironmentVariable(activeEnvironment.id, item.id, {
                    value: event.target.value,
                  })
                }
                placeholder={item.secret ? 'secret' : 'value'}
                aria-label="Environment variable value"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <button
                className="icon-button secret-toggle"
                type="button"
                onClick={() =>
                  onUpdateEnvironmentVariable(activeEnvironment.id, item.id, {
                    secret: !item.secret,
                  })
                }
                title={
                  item.secret
                    ? 'Secret variable (stored only in memory)'
                    : 'Mark as secret'
                }
              >
                {item.secret ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
              <button
                className="icon-button env-delete-btn"
                type="button"
                onClick={() => onDeleteEnvironmentVariable(activeEnvironment.id, item.id)}
                title="Delete this variable"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        <button
          className="button button-sm"
          style={{ marginTop: 6, width: '100%', height: 22 }}
          onClick={onAddEnvironmentVariable}
        >
          <Plus size={11} />
          <span>Variable</span>
        </button>
      </div>

      {/* Main Sidebar Scroll Area */}
      <div className="scroll-area" style={{ padding: '8px 10px' }}>
        {activeSidebarTab === 'COLLECTIONS' ? (
          <CollectionsTree
            collections={collections}
            folders={folders}
            savedRequests={savedRequests}
            expandedCollectionIds={expandedCollectionIds}
            expandedFolderIds={expandedFolderIds}
            onToggleCollection={onToggleCollection}
            onToggleFolder={onToggleFolder}
            onOpenSavedRequest={onOpenSavedRequest}
            onRemoveSavedRequest={onRemoveSavedRequest}
            onAddCollection={onAddCollection}
            onDeleteCollection={onDeleteCollection}
            onRenameCollection={onRenameCollection}
            onAddFolder={onAddFolder}
            onDeleteFolder={onDeleteFolder}
            onRenameFolder={onRenameFolder}
            onImportPostman={onImportPostman}
            onExportCollection={onExportCollection}
          />
        ) : (
          <HistoryList
            history={history}
            onRestoreHistory={onRestoreHistory}
            onDeleteHistoryItem={onDeleteHistoryItem}
            onClearHistory={onClearHistory}
          />
        )}
      </div>

      {/* Sidebar Footer with Settings */}
      <div
        className="panel-header"
        style={{
          borderTop: '1px solid var(--border)',
          borderBottom: 0,
          padding: '6px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-sidebar)',
        }}
      >
        <button
          type="button"
          className="button button-sm"
          onClick={onOpenSettings}
          title="App Settings"
          style={{ width: '100%', justifyContent: 'center', height: 26 }}
        >
          <Settings size={13} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}
