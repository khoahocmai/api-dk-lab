import { useEffect, useRef, useState } from 'react'
import { BookOpen, Copy, Globe, Layers3, PanelRightClose, PanelRightOpen, Plus, X } from 'lucide-react'
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

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

        {/* Compact Add Tab Button with Dropdown */}
        <div className="add-tab-container" ref={menuRef}>
          <button
            type="button"
            className={`add-tab-btn ${isMenuOpen ? 'is-open' : ''}`}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title="New Request (Ctrl+T)"
            aria-label="Create new request"
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
          >
            <Plus size={14} />
          </button>

          {isMenuOpen && (
            <div className="add-tab-dropdown">
              <button
                type="button"
                className="add-tab-menu-item"
                onClick={() => {
                  onAddTab('REST')
                  setIsMenuOpen(false)
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Globe size={13} style={{ color: 'var(--method-get)' }} />
                  <span>New REST Request</span>
                </div>
                <span className="add-tab-shortcut">Ctrl+T</span>
              </button>

              <button
                type="button"
                className="add-tab-menu-item"
                onClick={() => {
                  onAddTab('GRAPHQL')
                  setIsMenuOpen(false)
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Layers3 size={13} style={{ color: 'var(--method-gql)' }} />
                  <span>New GraphQL Request</span>
                </div>
              </button>
            </div>
          )}
        </div>
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
