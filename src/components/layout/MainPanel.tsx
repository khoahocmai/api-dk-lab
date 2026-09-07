import { Group, Panel, Separator } from 'react-resizable-panels'
import { Globe, Layers3, Plus, Terminal } from 'lucide-react'
import type { EnvironmentItem, Mode, RequestItem, SplitLayout } from '../../types'
import { RequestTabs } from '../request/RequestTabs'
import { UrlBar } from '../request/UrlBar'
import { RequestEditor } from '../request/RequestEditor'
import { ResponseViewer } from '../response/ResponseViewer'

interface MainPanelProps {
  isMobileActive: boolean
  tabs: RequestItem[]
  activeTabId: string
  activeTab: RequestItem | undefined
  environments: EnvironmentItem[]
  activeEnvironmentId: string
  activeEnvironment: EnvironmentItem | null
  previewUrl: string
  splitLayout: SplitLayout
  editorFontSize?: number
  isSidebarCollapsed?: boolean
  isExplorerOpen?: boolean
  onSelectEnvironment: (id: string) => void
  onAddEnvironment?: () => void
  onOpenManageEnvironments?: () => void
  onToggleSidebar?: () => void
  onToggleExplorer?: () => void
  onToggleSplitLayout: () => void
  onSelectTab: (id: string) => void
  onDuplicateTab: (tab: RequestItem) => void
  onCloseTab: (id: string) => void
  onCloseOthers: (id: string) => void
  onCloseToRight: (id: string) => void
  onCloseAll: () => void
  onAddTab: (mode: Mode) => void
  onUpdateActiveTab: (patch: Partial<RequestItem>) => void
  onSend: () => Promise<void>
  onCancel: () => void
  onSave: () => void
  onFormat: () => void
  onClear: () => void
  onSyncToExplorer?: () => { success: boolean; error?: string }
  onCopyResponse: () => Promise<void>
  onImportCurl?: (parsed: Partial<RequestItem>) => void
  onOpenImportCurlModal: () => void
  onOpenCodeSnippetModal: () => void
  onShowToast?: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void
}

export function MainPanel({
  isMobileActive,
  tabs,
  activeTabId,
  activeTab,
  environments,
  activeEnvironmentId,
  activeEnvironment,
  previewUrl,
  splitLayout,
  editorFontSize,
  isSidebarCollapsed,
  isExplorerOpen,
  onSelectEnvironment,
  onAddEnvironment,
  onOpenManageEnvironments,
  onToggleSidebar,
  onToggleExplorer,
  onToggleSplitLayout,
  onSelectTab,
  onDuplicateTab,
  onCloseTab,
  onCloseOthers,
  onCloseToRight,
  onCloseAll,
  onAddTab,
  onUpdateActiveTab,
  onImportCurl,
  onSend,
  onCancel,
  onSave,
  onFormat,
  onClear,
  onSyncToExplorer,
  onCopyResponse,
  onOpenImportCurlModal,
  onOpenCodeSnippetModal,
  onShowToast,
}: MainPanelProps) {
  return (
    <main className={`main-panel ${isMobileActive ? 'is-mobile-active' : ''}`}>
      <RequestTabs
        tabs={tabs}
        activeTabId={activeTabId}
        environments={environments}
        activeEnvironmentId={activeEnvironmentId}
        activeEnvironment={activeEnvironment}
        isSidebarCollapsed={isSidebarCollapsed}
        isExplorerOpen={isExplorerOpen}
        onSelectEnvironment={onSelectEnvironment}
        onAddEnvironment={onAddEnvironment}
        onOpenManageEnvironments={onOpenManageEnvironments}
        onToggleSidebar={onToggleSidebar}
        onToggleExplorer={onToggleExplorer}
        onSelectTab={onSelectTab}
        onDuplicateTab={onDuplicateTab}
        onCloseTab={onCloseTab}
        onCloseOthers={onCloseOthers}
        onCloseToRight={onCloseToRight}
        onCloseAll={onCloseAll}
        onAddTab={onAddTab}
      />

      {activeTab ? (
        <>
          <UrlBar
            activeTab={activeTab}
            activeEnvironment={activeEnvironment}
            previewUrl={previewUrl}
            splitLayout={splitLayout}
            onToggleSplitLayout={onToggleSplitLayout}
            onUpdateTab={onUpdateActiveTab}
            onImportCurl={onImportCurl}
            onSend={onSend}
            onCancel={onCancel}
            onSave={onSave}
            onOpenImportCurlModal={onOpenImportCurlModal}
            onOpenCodeSnippetModal={onOpenCodeSnippetModal}
          />

          <div className="resizable-editor-container">
            <Group
              orientation={splitLayout}
              id={`api-lab-req-resp-${splitLayout}`}
              style={{ height: '100%', width: '100%' }}
            >
              <Panel
                defaultSize="50%"
                minSize="20%"
                className="panel-resizable-item h-full min-h-0 overflow-hidden flex flex-col"
                id="req-editor-panel"
              >
                <div
                  className="h-full w-full min-h-0 flex-1 flex flex-col overflow-hidden"
                  style={{
                    height: '100%',
                    width: '100%',
                    minHeight: 0,
                    flex: '1 1 0%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <RequestEditor
                    activeTab={activeTab}
                    editorFontSize={editorFontSize}
                    environment={activeEnvironment}
                    onUpdateTab={onUpdateActiveTab}
                    onFormat={onFormat}
                    onClear={onClear}
                    onSyncToExplorer={onSyncToExplorer}
                    onShowToast={onShowToast}
                  />
                </div>
              </Panel>

              <Separator
                className={`resize-handle ${
                  splitLayout === 'horizontal' ? 'vertical-handle' : 'horizontal-handle'
                }`}
              />

              <Panel
                defaultSize="50%"
                minSize="20%"
                className="panel-resizable-item"
                id="resp-viewer-panel"
              >
                <ResponseViewer
                  activeTab={activeTab}
                  activeEnvironment={activeEnvironment}
                  editorFontSize={editorFontSize}
                  onUpdateTab={onUpdateActiveTab}
                  onCopyResponse={onCopyResponse}
                />
              </Panel>
            </Group>
          </div>
        </>
      ) : (
        <div className="empty-workspace-container">
          <div className="empty-workspace-content">
            <div className="empty-workspace-icon-wrapper">
              <Layers3 size={38} className="empty-workspace-icon" />
            </div>
            <h2 className="empty-workspace-title">No Open Requests</h2>
            <p className="empty-workspace-desc">
              Chọn một request từ Collection, mở API từ GraphQL Explorer, hoặc tạo mới request.
            </p>
            <div className="empty-workspace-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => onAddTab('GRAPHQL')}
              >
                <Plus size={14} />
                <span>New GraphQL Request</span>
              </button>
              <button
                type="button"
                className="button"
                onClick={() => onAddTab('REST')}
              >
                <Globe size={13} style={{ color: 'var(--method-get)' }} />
                <span>New REST Request</span>
              </button>
              <button
                type="button"
                className="button"
                onClick={onOpenImportCurlModal}
              >
                <Terminal size={13} style={{ color: 'var(--method-post)' }} />
                <span>Import cURL</span>
              </button>
            </div>
            <div className="empty-workspace-shortcuts">
              <span><kbd>Ctrl</kbd> + <kbd>T</kbd> New Tab</span>
              <span><kbd>Ctrl</kbd> + <kbd>B</kbd> Toggle Sidebar</span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
