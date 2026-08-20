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
  GraphExplorerState,
  GraphField,
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
    <div className="graph-explorer-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="panel-header" style={{ padding: '8px 10px' }}>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <div className="row" style={{ fontWeight: 750, fontSize: 12, color: 'var(--text-primary)' }}>
            <BookOpen size={14} style={{ color: 'var(--primary-bright)' }} />
            <span>GraphQL Explorer</span>
          </div>
          <div className="row wrap" style={{ gap: 4 }}>
            <button
              className="button button-sm"
              onClick={() => void onLoadSchema()}
              disabled={!activeTab || activeTab.mode !== 'GRAPHQL' || graphExplorer.loading}
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
            placeholder="Search Query / Mutation..."
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
        <div className="row wrap" style={{ marginTop: 6, borderBottom: '1px solid var(--border)' }}>
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
              <span className="tab-counter">{graphExplorer.queryFields.length}</span>
            )}
          </button>
          <button
            onClick={() => setGraphExplorer((current) => ({ ...current, activeTab: 'MUTATION' }))}
            className={`editor-tab ${graphExplorer.activeTab === 'MUTATION' ? 'is-active' : ''}`}
            style={{ height: 28, fontSize: 11, padding: '0 8px' }}
          >
            MUTATION {graphExplorer.mutationFields.length > 0 && (
              <span className="tab-counter">{graphExplorer.mutationFields.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="scroll-area" style={{ padding: '8px 10px' }}>
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
              description="Panel này mô phỏng API list: load schema, search field, tick checkbox để tự sinh GraphQL Query và Variables."
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
            {/* Batch Action Bar */}
            <div className="row-between" style={{ padding: '2px 0', minHeight: 24 }}>
              <div className="meta-text" style={{ fontSize: 11 }}>
                Selected: <strong style={{ color: 'var(--text-primary)' }}>{selectedExplorerFields.length}</strong> /{' '}
                {currentExplorerFields.length}
              </div>
              {selectedExplorerFields.length > 0 && (
                <div className="row wrap" style={{ gap: 4 }}>
                  <button
                    className="button button-sm button-primary"
                    onClick={onApplySelected}
                    style={{ height: 22, padding: '0 6px', fontSize: 11 }}
                  >
                    <CheckCheck size={11} />
                    <span>Apply ({selectedExplorerFields.length})</span>
                  </button>
                  <button
                    className="button button-sm"
                    onClick={onClearSelection}
                    style={{ height: 22, padding: '0 6px', fontSize: 11 }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

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
                      field={field}
                      isSelected={selected}
                      onToggle={(checked) => onToggleField(field, checked)}
                      onQuickInsert={() => onQuickInsert(field)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
