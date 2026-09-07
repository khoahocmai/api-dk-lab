import { useState } from 'react'
import {
  Globe,
  Layers,
  PanelRightClose,
  Plus,
  Settings,
} from 'lucide-react'
import type {
  CollectionItem,
  EnvironmentItem,
  EnvironmentVariable,
  FolderItem,
  SavedRequestItem,
  SidebarTab,
} from '../../types'
import { CollectionsTree } from '../sidebar/CollectionsTree'
import { EnvironmentsManager } from '../sidebar/EnvironmentsManager'

interface SidebarProps {
  isMobileActive: boolean
  activeSidebarTab?: SidebarTab
  onSelectSidebarTab?: (tab: SidebarTab) => void
  environments: EnvironmentItem[]
  activeEnvironmentId: string
  activeEnvironment: EnvironmentItem | null
  collections: CollectionItem[]
  folders: FolderItem[]
  savedRequests: SavedRequestItem[]
  expandedCollectionIds: string[]
  expandedFolderIds: string[]
  onAddTab: () => void
  onAddEnvironment: () => void
  onDuplicateEnvironment: (id: string) => void
  onSelectEnvironment: (id: string) => void
  onRenameEnvironment: (id: string, newName: string) => void
  onDeleteEnvironment: (id: string) => void
  onUpdateEnvironmentVariable: (
    envId: string,
    varId: string,
    patch: Partial<EnvironmentVariable>,
  ) => void
  onDeleteEnvironmentVariable: (envId: string, varId: string) => void
  onAddEnvironmentVariable: (envId: string) => void
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
  onOpenSettings: () => void
  onToggleCollapseSidebar?: () => void
}

export function Sidebar({
  isMobileActive,
  activeSidebarTab: controlledTab,
  onSelectSidebarTab: setControlledTab,
  environments,
  activeEnvironmentId,
  collections,
  folders,
  savedRequests,
  expandedCollectionIds,
  expandedFolderIds,
  onAddTab,
  onAddEnvironment,
  onDuplicateEnvironment,
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
  onRenameRequest,
  onImportPostman,
  onExportCollection,
  onMoveRequest,
  onMoveFolder,
  onOpenSettings,
  onToggleCollapseSidebar,
}: SidebarProps) {
  const [internalTab, setInternalTab] = useState<SidebarTab>('COLLECTIONS')
  const activeTab = controlledTab ?? internalTab
  const setActiveTab = (tab: SidebarTab) => {
    if (setControlledTab) setControlledTab(tab)
    setInternalTab(tab)
  }

  return (
    <aside
      className={`panel ${isMobileActive ? 'is-mobile-active' : ''}`}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* Workspace Header */}
      <div className="panel-header" style={{ padding: '8px 10px' }}>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <div className="workspace-title">API DK Lab</div>
          <div className="row" style={{ gap: 2 }}>
            {onAddTab && (
              <button
                type="button"
                className="icon-button icon-button-sm"
                onClick={onAddTab}
                aria-label="Create new tab"
                title="Create New Tab"
              >
                <Plus size={13} />
              </button>
            )}
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

        {/* Sidebar Nav Tabs: Collections & Environments */}
        <div className="segmented" style={{ width: '100%' }}>
          <button
            type="button"
            className={`segment-button ${activeTab === 'COLLECTIONS' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('COLLECTIONS')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Layers size={13} />
            <span>Collections</span>
          </button>
          <button
            type="button"
            className={`segment-button ${activeTab === 'ENVIRONMENTS' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('ENVIRONMENTS')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Globe size={13} />
            <span>Environments</span>
          </button>
        </div>
      </div>

      {/* Main Sidebar Scroll Area */}
      <div className="scroll-area sidebar-collections-scroll" style={{ padding: '8px 10px', flex: 1 }}>
        {activeTab === 'COLLECTIONS' ? (
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
            onRenameRequest={onRenameRequest}
            onImportPostman={onImportPostman}
            onExportCollection={onExportCollection}
            onMoveRequest={onMoveRequest}
            onMoveFolder={onMoveFolder}
          />
        ) : (
          <EnvironmentsManager
            environments={environments}
            activeEnvironmentId={activeEnvironmentId}
            onSelectEnvironment={onSelectEnvironment}
            onAddEnvironment={onAddEnvironment}
            onDuplicateEnvironment={onDuplicateEnvironment}
            onRenameEnvironment={onRenameEnvironment}
            onDeleteEnvironment={onDeleteEnvironment}
            onUpdateEnvironmentVariable={onUpdateEnvironmentVariable}
            onDeleteEnvironmentVariable={onDeleteEnvironmentVariable}
            onAddEnvironmentVariable={onAddEnvironmentVariable}
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
          flexShrink: 0,
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
