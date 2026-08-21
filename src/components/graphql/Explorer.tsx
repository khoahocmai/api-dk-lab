import React, { useMemo } from 'react'
import {
  BookOpen,
  CheckCheck,
  Database,
  Layers3,
  PanelLeftClose,
  RefreshCw,
  Search,
  SquarePen,
  X,
} from 'lucide-react'
import type {
  GraphArg,
  GraphExplorerState,
  GraphField,
  GraphInputField,
  RequestItem,
} from '../../types'
import { InfoCard } from '../common/InfoCard'
import { GraphFieldCard } from './GraphFieldCard'
import { getGraphFieldKey } from '../../services/graphqlService'

interface ExplorerProps {
  activeTab: RequestItem | undefined
  graphExplorer: GraphExplorerState
  setGraphExplorer: React.Dispatch<React.SetStateAction<GraphExplorerState>>
  selectedGraphFieldKeys: string[]
  onLoadSchema: () => Promise<void>
  onCloseMobile: () => void
  onToggleField: (field: GraphField, checked: boolean) => void
  onToggleArg: (field: GraphField, arg: GraphArg, checked: boolean) => void
  onToggleInputField?: (field: GraphField, arg: GraphArg, inputField: GraphInputField, checked: boolean) => void
  onToggleOutputField?: (field: GraphField, path: string, checked: boolean) => void
  onQuickInsert: (field: GraphField) => void
  onApplySelected: () => void
  onClearSelection: () => void
  onCloseExplorer?: () => void
}

export function Explorer({
  activeTab,
  graphExplorer,
  setGraphExplorer,
  selectedGraphFieldKeys,
  onLoadSchema,
  onCloseMobile,
  onToggleField,
  onToggleArg,
  onToggleInputField,
  onToggleOutputField,
  onQuickInsert,
  onApplySelected,
  onClearSelection,
  onCloseExplorer,
}: ExplorerProps) {
  const currentGraphOperationKind = graphExplorer.activeTab === 'MUTATION' ? 'mutation' : 'query'

  const currentExplorerFields = useMemo(
    () =>
      currentGraphOperationKind === 'mutation'
        ? graphExplorer.mutationFields
        : graphExplorer.queryFields,
    [currentGraphOperationKind, graphExplorer.mutationFields, graphExplorer.queryFields],
  )

  const filteredExplorerFields = useMemo(() => {
    const keyword = graphExplorer.search.trim().toLowerCase()
    if (!keyword) return currentExplorerFields

    return currentExplorerFields.filter(
      (field) =>
        field.name.toLowerCase().includes(keyword) ||
        field.typeLabel.toLowerCase().includes(keyword) ||
        field.args.some(
          (arg) =>
            arg.name.toLowerCase().includes(keyword) ||
            arg.typeLabel.toLowerCase().includes(keyword) ||
            arg.inputFields.some(
              (inputField) =>
                inputField.name.toLowerCase().includes(keyword) ||
                inputField.typeLabel.toLowerCase().includes(keyword),
            ),
        ),
    )
  }, [currentExplorerFields, graphExplorer.search])

  const selectedExplorerFields = useMemo(
    () =>
      currentExplorerFields.filter((field) =>
        selectedGraphFieldKeys.includes(
          getGraphFieldKey(currentGraphOperationKind, field.name),
        ),
      ),
    [currentExplorerFields, currentGraphOperationKind, selectedGraphFieldKeys],
  )

  return (
    <div
      className="graph-explorer-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '100%',
        width: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: '#12141a',
      }}
    >
      {/* Pinned Header & Filter Bar */}
      <div
        className="panel-header"
        style={{
          flexShrink: 0,
          flexGrow: 0,
          padding: '8px 10px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-sidebar)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div className="row-between">
          <div className="row" style={{ fontWeight: 750, fontSize: 12, color: 'var(--text-primary)' }}>
            <BookOpen size={14} style={{ color: 'var(--primary-bright)' }} />
            <span>GraphQL Explorer</span>
          </div>
          <div className="row wrap" style={{ gap: 4 }}>
            <button
              className="button button-sm"
              onClick={() => void onLoadSchema()}
              disabled={!activeTab || graphExplorer.loading}
              style={{ height: 24, padding: '0 6px' }}
              title="Introspect GraphQL Schema"
            >
              <RefreshCw size={11} className={graphExplorer.loading ? 'loading-icon' : ''} />
              <span>{graphExplorer.loading ? 'Loading...' : 'Schema'}</span>
            </button>
            <button
              className="icon-button icon-button-sm"
              onClick={onCloseExplorer || onCloseMobile}
              aria-label="Collapse GraphQL Explorer"
              title="Collapse Explorer"
            >
              <PanelLeftClose size={13} />
            </button>
          </div>
        </div>

        {/* Search Bar with Clear Button */}
        <div style={{ position: 'relative' }}>
          <Search
            size={12}
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              color: 'var(--text-dim)',
            }}
          />
          <input
            className="input input-sm"
            value={graphExplorer.search}
            onChange={(event) =>
              setGraphExplorer((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="Search schema fields..."
            aria-label="Search GraphQL fields"
            style={{ paddingLeft: 26, paddingRight: graphExplorer.search ? 24 : 8 }}
          />
          {graphExplorer.search && (
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={() => setGraphExplorer((current) => ({ ...current, search: '' }))}
              style={{ position: 'absolute', top: 3, right: 4, width: 20, height: 20 }}
              title="Clear search"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Navigation Tabs (DOCS, QUERY, MUTATION) */}
        <div className="row wrap" style={{ marginTop: 2, borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setGraphExplorer((current) => ({ ...current, activeTab: 'DOCS' }))}
            className={`editor-tab ${graphExplorer.activeTab === 'DOCS' ? 'is-active' : ''}`}
            style={{ height: 28, fontSize: 11, padding: '0 8px' }}
          >
            DOCS
          </button>
          <button
            onClick={() => setGraphExplorer((current) => ({ ...current, activeTab: 'QUERY' }))}
            className={`editor-tab ${graphExplorer.activeTab === 'QUERY' ? 'is-active' : ''}`}
            style={{ height: 28, fontSize: 11, padding: '0 8px' }}
          >
            QUERY {graphExplorer.queryFields.length > 0 && (
              <span className="tab-counter">({graphExplorer.queryFields.length})</span>
            )}
          </button>
          <button
            onClick={() => setGraphExplorer((current) => ({ ...current, activeTab: 'MUTATION' }))}
            className={`editor-tab ${graphExplorer.activeTab === 'MUTATION' ? 'is-active' : ''}`}
            style={{ height: 28, fontSize: 11, padding: '0 8px' }}
          >
            MUTATION {graphExplorer.mutationFields.length > 0 && (
              <span className="tab-counter">({graphExplorer.mutationFields.length})</span>
            )}
          </button>
        </div>
      </div>

      {/* Independent Scrollable Body */}
      <div
        className="scroll-area custom-scrollbar"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          height: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 10px',
        }}
      >
        {graphExplorer.error && (
          <div className="banner banner-danger" style={{ marginBottom: 8, padding: '6px 8px' }}>
            {graphExplorer.error}
          </div>
        )}

        {graphExplorer.activeTab === 'DOCS' && (
          <div className="stack" style={{ gap: 6 }}>
            <InfoCard
              icon={<Layers3 size={14} />}
              title="Search + Query + Mutation"
              description="Panel này mô phỏng API list: load schema, search field, bấm 'Use this API' để tự động tạo một Request Tab mới với Query và Variables đầy đủ."
            />
            <InfoCard
              icon={<Database size={14} />}
              title="Load Schema"
              description="Bấm Schema để chạy GraphQL introspection từ endpoint. App sẽ phân tích query/mutation types."
            />
            <InfoCard
              icon={<SquarePen size={14} />}
              title="Saved Requests"
              description="Request đang mở có thể lưu vào collection ở sidebar và mở lại bất kỳ lúc nào."
            />
          </div>
        )}

        {graphExplorer.activeTab !== 'DOCS' && (
          <div className="stack" style={{ gap: 6 }}>
            {filteredExplorerFields.length === 0 ? (
              <div className="response-empty" style={{ minHeight: 140, fontStyle: 'italic' }}>
                {graphExplorer.loading
                  ? 'Đang tải introspection schema...'
                  : graphExplorer.search
                  ? `Không tìm thấy field nào khớp với "${graphExplorer.search}"`
                  : 'Chưa có field nào. Hãy bấm "Schema" để tải introspection.'}
              </div>
            ) : (
              <div className="stack" style={{ gap: 6 }}>
                {filteredExplorerFields.map((field) => {
                  const selected = selectedGraphFieldKeys.includes(
                    getGraphFieldKey(currentGraphOperationKind, field.name),
                  )
                  return (
                    <GraphFieldCard
                      key={field.name}
                      kind={currentGraphOperationKind}
                      field={field}
                      isSelected={selected}
                      selectedKeys={selectedGraphFieldKeys}
                      onToggle={(checked) => onToggleField(field, checked)}
                      onToggleArg={(arg, checked) => onToggleArg(field, arg, checked)}
                      onToggleInputField={(arg, inputField, checked) =>
                        onToggleInputField?.(field, arg, inputField, checked)
                      }
                      onToggleOutputField={(path, checked) =>
                        onToggleOutputField?.(field, path, checked)
                      }
                      onQuickInsert={() => onQuickInsert(field)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar (Smart Slide-up when items selected) */}
      {selectedExplorerFields.length > 0 && (
        <div className="graph-explorer-footer">
          <span style={{ fontSize: 11, color: 'var(--primary-bright)', fontWeight: 600 }}>
            {selectedExplorerFields.length} field{selectedExplorerFields.length > 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={onClearSelection}
              className="explorer-clear-btn"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onApplySelected}
              className="button button-sm button-primary"
              style={{
                height: 26,
                padding: '0 10px',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              title="Open selected fields in a new Request Tab"
            >
              <CheckCheck size={12} />
              <span>Apply ({selectedExplorerFields.length})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
