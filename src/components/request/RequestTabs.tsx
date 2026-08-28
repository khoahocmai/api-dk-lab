import { useEffect, useRef, useState } from 'react'
import { BookOpen, Copy, Globe, Layers3, PanelRightClose, PanelRightOpen, Plus, X } from 'lucide-react'
import type { EnvironmentItem, Mode, RequestItem } from '../../types'
import { EnvironmentSelector } from '../common/EnvironmentSelector'
import { getMethodBadgeClass, isTabDirty } from '../../utils/formatters'

interface TabContextMenuState {
  x: number
  y: number
  tabId: string
  tabIndex: number
}

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
  onCloseOthers: (id: string) => void
  onCloseToRight: (id: string) => void
  onCloseAll: () => void
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
  onCloseOthers,
  onCloseToRight,
  onCloseAll,
  onAddTab,
}: RequestTabsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<TabContextMenuState | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Manage Add Tab dropdown outside clicks
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

  // Manage Tab Context Menu outside clicks, escape and scroll
  useEffect(() => {
    if (!contextMenu) return

    const handlePointerDown = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null)
      }
    }

    const handleDismiss = () => {
      setContextMenu(null)
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleDismiss, true)
    window.addEventListener('resize', handleDismiss)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleDismiss, true)
      window.removeEventListener('resize', handleDismiss)
    }
  }, [contextMenu])

  const handleTabContextMenu = (e: React.MouseEvent, tabId: string, tabIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    const menuWidth = 190
    const menuHeight = 160
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10)
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10)
    setContextMenu({
      x: Math.max(10, x),
      y: Math.max(10, y),
      tabId,
      tabIndex,
    })
  }

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
        {tabs.map((item, index) => {
          const active = item.id === activeTabId
          const dirty = item.isDirty ?? isTabDirty(item)

          return (
            <div
              key={item.id}
              className={`tab-chip ${active ? 'is-active' : ''} ${dirty ? 'is-dirty' : ''}`}
              onClick={() => onSelectTab(item.id)}
              onContextMenu={(e) => handleTabContextMenu(e, item.id, index)}
              ref={active ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }) : undefined}
            >
              <button
                type="button"
                className="tab-main-button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectTab(item.id)
                }}
              >
                <span
                  className={`method-tag ${getMethodBadgeClass(item.mode, item.method)}`}
                >
                  {item.mode === 'GRAPHQL' ? 'GQL' : item.method || 'GET'}
                </span>
                <span className="tab-name" title={item.name}>
                  {item.name?.trim() || (item.mode === 'GRAPHQL' ? 'New GraphQL Request' : 'New Request')}
                </span>
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicateTab(item)
                }}
                aria-label={`Duplicate ${item.name}`}
                title="Duplicate Tab"
                style={{ width: 18, height: 18 }}
              >
                <Copy size={11} />
              </button>
              <button
                type="button"
                className="icon-button tab-close-button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (e.altKey) {
                    onCloseOthers(item.id)
                  } else {
                    onCloseTab(item.id)
                  }
                }}
                aria-label={`Close ${item.name}`}
                title={
                  dirty
                    ? 'Unsaved changes (Alt+Click to close others)'
                    : 'Close Tab (Ctrl+W, Alt+Click to close others)'
                }
                style={{ width: 18, height: 18 }}
              >
                {dirty ? (
                  <>
                    <span className="tab-dirty-dot" />
                    <span className="tab-close-icon">
                      <X size={11} />
                    </span>
                  </>
                ) : (
                  <X size={11} />
                )}
              </button>
            </div>
          )
        })}

        {/* Compact Add Tab Button with Direct Click + Dropdown */}
        <div className="add-tab-container" ref={menuRef}>
          <button
            type="button"
            className="add-tab-btn"
            onClick={() => onAddTab('REST')}
            onContextMenu={(e) => {
              e.preventDefault()
              setIsMenuOpen((prev) => !prev)
            }}
            title="New Request (Ctrl+T) - Right-click for more"
            aria-label="Create new request"
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

      {/* Tab Context Menu (VS Code Style) */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="tab-context-menu"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Close (Ctrl + W) */}
          <button
            type="button"
            className="tab-context-menu-item"
            onClick={() => {
              const id = contextMenu.tabId
              setContextMenu(null)
              onCloseTab(id)
            }}
          >
            <div className="tab-context-menu-item-left">
              <X size={13} />
              <span>Close</span>
            </div>
            <span className="tab-context-shortcut">Ctrl+W</span>
          </button>

          <div className="tab-context-divider" />

          {/* 2. Close Others */}
          <button
            type="button"
            className="tab-context-menu-item"
            disabled={tabs.length <= 1}
            onClick={() => {
              const id = contextMenu.tabId
              setContextMenu(null)
              onCloseOthers(id)
            }}
          >
            <div className="tab-context-menu-item-left">
              <Copy size={13} />
              <span>Close Others</span>
            </div>
            <span className="tab-context-shortcut">Alt+Click</span>
          </button>

          {/* 3. Close to the Right */}
          <button
            type="button"
            className="tab-context-menu-item"
            disabled={contextMenu.tabIndex >= tabs.length - 1}
            onClick={() => {
              const id = contextMenu.tabId
              setContextMenu(null)
              onCloseToRight(id)
            }}
          >
            <div className="tab-context-menu-item-left">
              <PanelRightClose size={13} />
              <span>Close to the Right</span>
            </div>
          </button>

          <div className="tab-context-divider" />

          {/* 4. Close All */}
          <button
            type="button"
            className="tab-context-menu-item tab-context-menu-danger"
            onClick={() => {
              setContextMenu(null)
              onCloseAll()
            }}
          >
            <div className="tab-context-menu-item-left">
              <Layers3 size={13} />
              <span>Close All</span>
            </div>
          </button>
        </div>
      )}

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
