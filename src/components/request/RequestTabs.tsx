import { BookOpen, Copy, PanelRightClose, PanelRightOpen, Plus, X } from 'lucide-react'
import type { EnvironmentItem, Mode, RequestItem } from '../../types'
import { EnvironmentSelector } from '../common/EnvironmentSelector'

interface RequestTabsProps {
  tabs: RequestItem[]
  activeTabId: string
  environments: EnvironmentItem[]
  activeEnvironmentId: string
  activeEnvironment: EnvironmentItem | null
  isSidebarCollapsed?: boolean
  isExplorerOpen?: boolean
  onSelectEnvironment: (id: string) => void
  onAddEnvironment?: () => void
  onOpenManageEnvironments?: () => void
  onToggleSidebar?: () => void
  onToggleExplorer?: () => void
  onSelectTab: (id: string) => void
  onDuplicateTab: (tab: RequestItem) => void
  onCloseTab: (id: string) => void
  onAddTab: (mode: Mode) => void
}

export function RequestTabs({
  tabs,
  activeTabId,
  environments,
  activeEnvironmentId,
  activeEnvironment,
  isSidebarCollapsed,
  isExplorerOpen,
  onSelectEnvironment,
  onAddEnvironment,
  onOpenManageEnvironments,
  onToggleSidebar,
  onToggleExplorer,
  onSelectTab,
  onDuplicateTab,
  onCloseTab,
  onAddTab,
}: RequestTabsProps) {
  return (
    <div className="tabbar">
      {/* Left side: GraphQL Explorer Toggle Button */}
      {onToggleExplorer && (
        <button
          type="button"
          className={`button button-sm ${isExplorerOpen ? 'button-primary' : ''}`}
          onClick={onToggleExplorer}
          title={isExplorerOpen ? 'Hide GraphQL Explorer' : 'Open GraphQL Explorer'}
          style={{ height: 26, padding: '0 8px', marginRight: 4 }}
        >
          <BookOpen size={12} />
          <span>Explorer</span>
        </button>
      )}

      {/* Center: Tabs Scroll Area */}
      <div className="tab-scroll">
        {tabs.map((item) => {
          const active = item.id === activeTabId
          return (
            <div key={item.id} className={`tab-chip ${active ? 'is-active' : ''}`}>
              <button className="tab-main-button" onClick={() => onSelectTab(item.id)}>
                <span
                  className={`method-tag ${
                    item.mode === 'GRAPHQL' ? 'method-graphql' : 'method-rest'
                  }`}
                >
                  {item.mode === 'GRAPHQL' ? 'GQL' : item.method}
                </span>
                <span className="tab-name">{item.name}</span>
              </button>
              <button
                className="icon-button"
                onClick={() => onDuplicateTab(item)}
                aria-label={`Duplicate ${item.name}`}
                title="Duplicate Tab"
                style={{ width: 18, height: 18 }}
              >
                <Copy size={11} />
              </button>
              <button
                className="icon-button"
                onClick={() => onCloseTab(item.id)}
                aria-label={`Close ${item.name}`}
                title="Close Tab"
                disabled={tabs.length === 1}
                style={{ width: 18, height: 18 }}
              >
                <X size={11} />
              </button>
            </div>
          )
        })}

        <button
          type="button"
          className="button button-sm"
          onClick={() => onAddTab('GRAPHQL')}
          title="New GraphQL Request"
          style={{ height: 26, padding: '0 8px' }}
        >
          <Plus size={12} />
          <span>GraphQL</span>
        </button>
        <button
          type="button"
          className="button button-sm"
          onClick={() => onAddTab('REST')}
          title="New REST Request"
          style={{ height: 26, padding: '0 8px' }}
        >
          <Plus size={12} />
          <span>REST</span>
        </button>
      </div>

      {/* Right side: Environment Selector & Sidebar Toggle Button */}
      <div className="row" style={{ gap: 6, marginLeft: 4, flexShrink: 0 }}>
        <EnvironmentSelector
          environments={environments}
          activeEnvironmentId={activeEnvironmentId}
          activeEnvironment={activeEnvironment}
          onSelectEnvironment={onSelectEnvironment}
          onAddEnvironment={onAddEnvironment}
          onOpenManageEnvironments={onOpenManageEnvironments}
        />

        {onToggleSidebar && (
          <button
            type="button"
            className={`button button-sm ${!isSidebarCollapsed ? 'button-primary' : ''}`}
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Open Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
            style={{ height: 26, padding: '0 8px' }}
          >
            {isSidebarCollapsed ? <PanelRightOpen size={13} /> : <PanelRightClose size={13} />}
            <span>Sidebar</span>
          </button>
        )}
      </div>
    </div>
  )
}
