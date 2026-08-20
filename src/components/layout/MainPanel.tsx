import { Group, Panel, Separator } from 'react-resizable-panels'
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
  activeEnvironment: EnvironmentItem | null
  previewUrl: string
  domainWarning: boolean
  splitLayout: SplitLayout
  editorFontSize?: number
  isSidebarCollapsed?: boolean
  isExplorerOpen?: boolean
  onToggleSidebar?: () => void
  onToggleExplorer?: () => void
  onToggleSplitLayout: () => void
  onSelectTab: (id: string) => void
  onDuplicateTab: (tab: RequestItem) => void
  onCloseTab: (id: string) => void
  onAddTab: (mode: Mode) => void
  onUpdateActiveTab: (patch: Partial<RequestItem>) => void
  onSend: () => Promise<void>
  onCancel: () => void
  onSave: () => void
  onFormat: () => void
  onClear: () => void
  onCopyResponse: () => Promise<void>
  onOpenImportCurlModal: () => void
  onOpenCodeSnippetModal: () => void
}

export function MainPanel({
  isMobileActive,
  tabs,
  activeTabId,
  activeTab,
  activeEnvironment,
  previewUrl,
  domainWarning,
  splitLayout,
  editorFontSize,
  isSidebarCollapsed,
  isExplorerOpen,
  onToggleSidebar,
  onToggleExplorer,
  onToggleSplitLayout,
  onSelectTab,
  onDuplicateTab,
  onCloseTab,
  onAddTab,
  onUpdateActiveTab,
  onSend,
  onCancel,
  onSave,
  onFormat,
  onClear,
  onCopyResponse,
  onOpenImportCurlModal,
  onOpenCodeSnippetModal,
}: MainPanelProps) {
  return (
    <main className={`main-panel ${isMobileActive ? 'is-mobile-active' : ''}`}>
      <RequestTabs
        tabs={tabs}
        activeTabId={activeTabId}
        isSidebarCollapsed={isSidebarCollapsed}
        isExplorerOpen={isExplorerOpen}
        onToggleSidebar={onToggleSidebar}
        onToggleExplorer={onToggleExplorer}
        onSelectTab={onSelectTab}
        onDuplicateTab={onDuplicateTab}
        onCloseTab={onCloseTab}
        onAddTab={onAddTab}
      />

      {activeTab && (
        <>
          <UrlBar
            activeTab={activeTab}
            activeEnvironment={activeEnvironment}
            previewUrl={previewUrl}
            domainWarning={domainWarning}
            splitLayout={splitLayout}
            onToggleSplitLayout={onToggleSplitLayout}
            onUpdateTab={onUpdateActiveTab}
            onSend={onSend}
            onCancel={onCancel}
            onSave={onSave}
            onOpenImportCurlModal={onOpenImportCurlModal}
            onOpenCodeSnippetModal={onOpenCodeSnippetModal}
          />

          <div className="resizable-editor-container">
            <Group
              orientation={splitLayout}
              id={`dk-req-resp-${splitLayout}`}
              style={{ height: '100%', width: '100%' }}
            >
              <Panel
                defaultSize="50%"
                minSize="20%"
                className="panel-resizable-item"
                id="req-editor-panel"
              >
                <RequestEditor
                  activeTab={activeTab}
                  editorFontSize={editorFontSize}
                  onUpdateTab={onUpdateActiveTab}
                  onFormat={onFormat}
                  onClear={onClear}
                />
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
                  editorFontSize={editorFontSize}
                  onUpdateTab={onUpdateActiveTab}
                  onCopyResponse={onCopyResponse}
                />
              </Panel>
            </Group>
          </div>
        </>
      )}
    </main>
  )
}
