import React, { useMemo, useState } from 'react'
import {
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FolderInput,
  FolderPlus,
  Globe,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import type { EnvironmentGroup, EnvironmentItem, EnvironmentVariable } from '../../types'
import { NO_ENV, resolveEffectiveEnvironmentId } from '../../utils/environmentHelper'

export interface EnvironmentsManagerProps {
  environments: EnvironmentItem[]
  environmentGroups: EnvironmentGroup[]
  activeEnvByGroup: Record<string, string>
  activeEnvironmentId: string
  onSelectEnvironment: (id: string) => void
  onAddEnvironment: (groupId?: string | null) => void
  onDuplicateEnvironment: (id: string) => void
  onRenameEnvironment: (id: string, newName: string) => void
  onDeleteEnvironment: (id: string) => void
  onMoveEnvironmentToGroup: (envId: string, groupId: string | null) => void
  onAddEnvironmentGroup: (name: string) => void
  onRenameEnvironmentGroup: (groupId: string, name: string) => void
  onDeleteEnvironmentGroup: (groupId: string) => void
  onReorderEnvironmentGroups: (fromId: string, toId: string) => void
  onUpdateEnvironmentVariable: (
    envId: string,
    varId: string,
    patch: Partial<EnvironmentVariable>,
  ) => void
  onDeleteEnvironmentVariable: (envId: string, varId: string) => void
  onAddEnvironmentVariable: (envId: string) => void
  onAddGroupVariable: (groupId: string) => void
  onUpdateGroupVariable: (
    groupId: string,
    varId: string,
    patch: Partial<EnvironmentVariable>,
  ) => void
  onDeleteGroupVariable: (groupId: string, varId: string) => void
}

type Selection = { kind: 'env'; id: string } | { kind: 'group'; id: string } | null

const UNGROUPED_KEY = '__ungrouped'

interface VariablesTableProps {
  variables: EnvironmentVariable[]
  onUpdate: (varId: string, patch: Partial<EnvironmentVariable>) => void
  onDelete: (varId: string) => void
}

function VariablesTable({ variables, onUpdate, onDelete }: VariablesTableProps) {
  return (
    <div className="env-vars-table">
      <div className="env-vars-table-header">
        <span style={{ width: 20 }}></span>
        <span style={{ flex: 1 }}>KEY</span>
        <span style={{ flex: 1.2 }}>VALUE</span>
        <span style={{ width: 44 }}></span>
      </div>
      <div className="env-vars-table-body">
        {variables.map((item) => (
          <div key={item.id} className="env-vars-row">
            <input
              aria-label={`Enable ${item.key || 'variable'}`}
              type="checkbox"
              checked={item.enabled}
              onChange={(event) => onUpdate(item.id, { enabled: event.target.checked })}
              className="env-vars-checkbox"
            />
            <input
              className="input input-sm env-vars-key-input"
              value={item.key}
              onChange={(event) => onUpdate(item.id, { key: event.target.value })}
              placeholder="KEY"
              aria-label="Variable key"
            />
            <input
              className={`input input-sm env-vars-value-input ${item.secret ? 'input-secret' : ''}`}
              type={item.secret ? 'password' : 'text'}
              value={item.value || ''}
              onChange={(event) => onUpdate(item.id, { value: event.target.value })}
              placeholder={item.secret ? 'secret' : 'VALUE'}
              aria-label="Variable value"
            />
            <div className="row" style={{ gap: 2, flexShrink: 0 }}>
              <button
                className="icon-button icon-button-sm secret-toggle"
                type="button"
                onClick={() => onUpdate(item.id, { secret: !item.secret })}
                title={
                  item.secret ? 'Show value (Masked as password)' : 'Hide value (Mask as password)'
                }
                style={{ width: 20, height: 20 }}
              >
                {item.secret ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
              <button
                className="icon-button icon-button-sm env-delete-btn"
                type="button"
                onClick={() => onDelete(item.id)}
                title="Delete variable"
                style={{ width: 20, height: 20 }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EnvironmentsManager({
  environments,
  environmentGroups,
  activeEnvByGroup,
  activeEnvironmentId,
  onSelectEnvironment,
  onAddEnvironment,
  onDuplicateEnvironment,
  onRenameEnvironment,
  onDeleteEnvironment,
  onMoveEnvironmentToGroup,
  onAddEnvironmentGroup,
  onRenameEnvironmentGroup,
  onDeleteEnvironmentGroup,
  onReorderEnvironmentGroups,
  onUpdateEnvironmentVariable,
  onDeleteEnvironmentVariable,
  onAddEnvironmentVariable,
  onAddGroupVariable,
  onUpdateGroupVariable,
  onDeleteGroupVariable,
}: EnvironmentsManagerProps) {
  const [selection, setSelection] = useState<Selection>(() => {
    const initial = environments.find((e) => e.id === activeEnvironmentId) ?? environments[0]
    return initial ? { kind: 'env', id: initial.id } : null
  })
  const [search, setSearch] = useState('')
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null)
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  const [editingEnvId, setEditingEnvId] = useState<string | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [tempName, setTempName] = useState('')
  const [movingEnvId, setMovingEnvId] = useState<string | null>(null)
  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const knownGroupIds = useMemo(() => new Set(environmentGroups.map((g) => g.id)), [environmentGroups])

  const isEnvActive = (env: EnvironmentItem): boolean => {
    const hasGroup = Boolean(env.groupId && knownGroupIds.has(env.groupId))
    const effectiveId = resolveEffectiveEnvironmentId(
      environments,
      hasGroup ? env.groupId : null,
      activeEnvByGroup,
      activeEnvironmentId,
    )
    return effectiveId !== NO_ENV && effectiveId === env.id
  }

  const query = search.trim().toLowerCase()

  const sections = useMemo(() => {
    const matchEnv = (env: EnvironmentItem) => !query || env.name.toLowerCase().includes(query)
    const result = environmentGroups
      .map((group) => {
        const groupMatches = !query || group.name.toLowerCase().includes(query)
        const envs = environments
          .filter((e) => e.groupId === group.id)
          .filter((e) => groupMatches || matchEnv(e))
        return { key: group.id, group, envs, visible: groupMatches || envs.length > 0 }
      })
      .filter((section) => section.visible)

    const ungrouped = environments
      .filter((e) => !e.groupId || !knownGroupIds.has(e.groupId))
      .filter(matchEnv)

    return { groups: result, ungrouped }
  }, [environmentGroups, environments, knownGroupIds, query])

  const selectedEnv =
    selection?.kind === 'env' ? environments.find((e) => e.id === selection.id) ?? null : null
  const selectedGroup =
    selection?.kind === 'group' ? environmentGroups.find((g) => g.id === selection.id) ?? null : null

  const toggleExpanded = (key: string) =>
    setExpandedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const cancelEditing = () => {
    setEditingEnvId(null)
    setEditingGroupId(null)
    setTempName('')
  }

  const commitRename = () => {
    const name = tempName.trim()
    if (name) {
      if (editingEnvId) onRenameEnvironment(editingEnvId, name)
      if (editingGroupId) onRenameEnvironmentGroup(editingGroupId, name)
    }
    cancelEditing()
  }

  const commitNewGroup = () => {
    const name = newGroupName.trim()
    if (name) onAddEnvironmentGroup(name)
    setNewGroupName('')
    setIsAddingGroup(false)
  }

  const renderEnvCard = (env: EnvironmentItem) => {
    const isActive = isEnvActive(env)
    const isSelected = selection?.kind === 'env' && selection.id === env.id
    const isEditing = editingEnvId === env.id
    const isMoving = movingEnvId === env.id

    return (
      <div
        key={env.id}
        className={`env-card-item env-card-nested ${isSelected ? 'is-selected' : ''} ${
          isActive ? 'is-active' : ''
        }`}
        onClick={() => setSelection({ kind: 'env', id: env.id })}
      >
        {isEditing ? (
          <div className="env-card-rename-row" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              className="input input-sm"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') cancelEditing()
              }}
              autoFocus
              placeholder="Environment Name"
              style={{ flex: 1, height: 24, fontSize: 12 }}
            />
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={(e) => {
                stop(e)
                commitRename()
              }}
              title="Save Name"
              style={{ color: 'var(--primary-bright)', width: 22, height: 22 }}
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={(e) => {
                stop(e)
                cancelEditing()
              }}
              title="Cancel"
              style={{ width: 22, height: 22 }}
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <>
            <div className="env-card-main-row">
              <div className="env-card-info">
                <div className="env-card-title-row">
                  <span className="env-card-name" title={env.name}>
                    {env.name}
                  </span>
                  {isActive && (
                    <span className="env-active-badge">
                      <Zap size={10} /> Active
                    </span>
                  )}
                </div>
                <div className="env-card-meta">
                  {env.variables.length} variable{env.variables.length === 1 ? '' : 's'}
                </div>
              </div>

              <div className="env-card-actions" onClick={(e) => e.stopPropagation()}>
                {!isActive && (
                  <button
                    type="button"
                    className="icon-button icon-button-sm env-activate-btn"
                    onClick={(e) => {
                      stop(e)
                      onSelectEnvironment(env.id)
                      setSelection({ kind: 'env', id: env.id })
                    }}
                    title="Set as Active Environment"
                  >
                    <Check size={12} />
                  </button>
                )}
                <button
                  type="button"
                  className="icon-button icon-button-sm"
                  onClick={(e) => {
                    stop(e)
                    setEditingGroupId(null)
                    setEditingEnvId(env.id)
                    setTempName(env.name)
                  }}
                  title="Rename Environment"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-sm"
                  onClick={() => setMovingEnvId(isMoving ? null : env.id)}
                  title="Move to project"
                >
                  <FolderInput size={12} />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-sm"
                  onClick={() => onDuplicateEnvironment(env.id)}
                  title="Duplicate Environment"
                >
                  <Copy size={12} />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-sm env-card-delete-btn"
                  onClick={() => onDeleteEnvironment(env.id)}
                  disabled={environments.length <= 1}
                  title={
                    environments.length <= 1
                      ? 'Cannot delete the only environment'
                      : 'Delete Environment'
                  }
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {isMoving && (
              <div className="env-move-row" onClick={(e) => e.stopPropagation()}>
                <span className="env-move-label">Move to</span>
                <select
                  className="input input-sm"
                  value={env.groupId && knownGroupIds.has(env.groupId) ? env.groupId : ''}
                  onChange={(e) => {
                    onMoveEnvironmentToGroup(env.id, e.target.value || null)
                    setMovingEnvId(null)
                  }}
                  autoFocus
                  onBlur={() => setMovingEnvId(null)}
                >
                  <option value="">Ungrouped</option>
                  {environmentGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  const renderGroupHeader = (group: EnvironmentGroup, envCount: number) => {
    const isCollapsed = !expandedKeys.includes(group.id)
    const isSelected = selection?.kind === 'group' && selection.id === group.id
    const isEditing = editingGroupId === group.id

    if (isEditing) {
      return (
        <div className="env-group-header">
          <input
            type="text"
            className="input input-sm"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') cancelEditing()
            }}
            onBlur={commitRename}
            autoFocus
            placeholder="Project name"
            style={{ flex: 1, height: 24, fontSize: 12, fontWeight: 700 }}
          />
        </div>
      )
    }

    return (
      <div
        className={`env-group-header ${isSelected ? 'is-selected' : ''} ${
          dragOverGroupId === group.id && draggingGroupId !== group.id ? 'is-drag-over' : ''
        } ${draggingGroupId === group.id ? 'is-dragging' : ''}`}
        onClick={() => toggleExpanded(group.id)}
        draggable={!query}
        onDragStart={(e) => {
          setDraggingGroupId(group.id)
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', group.id)
        }}
        onDragOver={(e) => {
          if (!draggingGroupId) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          if (dragOverGroupId !== group.id) setDragOverGroupId(group.id)
        }}
        onDrop={(e) => {
          e.preventDefault()
          if (draggingGroupId) onReorderEnvironmentGroups(draggingGroupId, group.id)
          setDraggingGroupId(null)
          setDragOverGroupId(null)
        }}
        onDragEnd={() => {
          setDraggingGroupId(null)
          setDragOverGroupId(null)
        }}
      >
        <span className="env-group-chevron">
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </span>
        <span className="env-group-name" title={group.name}>
          {group.name}
        </span>
        <span className="env-group-count">{envCount}</span>
        <div className="env-group-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="icon-button icon-button-sm"
            onClick={() => setSelection({ kind: 'group', id: group.id })}
            title={`Shared variables (${group.variables.length})`}
          >
            <Braces size={12} />
          </button>
          <button
            type="button"
            className="icon-button icon-button-sm"
            onClick={() => {
              setExpandedKeys((prev) => (prev.includes(group.id) ? prev : [...prev, group.id]))
              onAddEnvironment(group.id)
            }}
            title="Add environment to this project"
          >
            <Plus size={12} />
          </button>
          <button
            type="button"
            className="icon-button icon-button-sm"
            onClick={() => {
              setEditingEnvId(null)
              setEditingGroupId(group.id)
              setTempName(group.name)
            }}
            title="Rename project"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            className="icon-button icon-button-sm env-card-delete-btn"
            onClick={() => onDeleteEnvironmentGroup(group.id)}
            title="Delete project (environments move to Ungrouped)"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="env-manager-container">
      {/* 1. Header */}
      <div className="env-section-header">
        <div className="row" style={{ gap: 6 }}>
          <Globe size={13} style={{ color: 'var(--primary-bright)' }} />
          <span className="caps" style={{ color: 'var(--text-primary)', fontWeight: 750 }}>
            Environments ({environments.length})
          </span>
        </div>
        <div className="row" style={{ gap: 4 }}>
          <button
            type="button"
            className="button button-sm"
            onClick={() => setIsAddingGroup(true)}
            title="Create New Project (environment group)"
            style={{ height: 24, padding: '0 8px', fontSize: 11 }}
          >
            <FolderPlus size={12} />
            <span>Project</span>
          </button>
          <button
            type="button"
            className="button button-sm button-primary"
            onClick={() => onAddEnvironment(null)}
            title="Create New Environment (Ungrouped)"
            style={{ height: 24, padding: '0 8px', fontSize: 11 }}
          >
            <Plus size={12} />
            <span>Env</span>
          </button>
        </div>
      </div>

      {/* 2. Search */}
      <div className="env-search-box">
        <Search size={12} className="env-search-icon" />
        <input
          type="text"
          className="input input-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects or environments..."
          aria-label="Search environments"
        />
        {search && (
          <button
            type="button"
            className="icon-button icon-button-sm"
            onClick={() => setSearch('')}
            title="Clear search"
            style={{ width: 20, height: 20 }}
          >
            <X size={11} />
          </button>
        )}
      </div>

      {isAddingGroup && (
        <div className="env-card-rename-row" style={{ padding: '0 2px' }}>
          <input
            type="text"
            className="input input-sm"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitNewGroup()
              if (e.key === 'Escape') {
                setNewGroupName('')
                setIsAddingGroup(false)
              }
            }}
            autoFocus
            placeholder="Project name (e.g. Dxp)"
            style={{ flex: 1, height: 24, fontSize: 12 }}
          />
          <button
            type="button"
            className="icon-button icon-button-sm"
            onClick={commitNewGroup}
            title="Create project"
            style={{ color: 'var(--primary-bright)', width: 22, height: 22 }}
          >
            <Check size={13} />
          </button>
          <button
            type="button"
            className="icon-button icon-button-sm"
            onClick={() => {
              setNewGroupName('')
              setIsAddingGroup(false)
            }}
            title="Cancel"
            style={{ width: 22, height: 22 }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* 3. Tree: Projects -> Environments */}
      <div className="env-list-cards">
        {sections.groups.map(({ key, group, envs }) => (
          <div key={key} className="env-group">
            {renderGroupHeader(group, environments.filter((e) => e.groupId === group.id).length)}
            {(expandedKeys.includes(group.id) || query) && (
              <div className="env-group-body">
                {envs.length === 0 ? (
                  <div className="env-group-empty">Chưa có environment nào trong project này.</div>
                ) : (
                  envs.map(renderEnvCard)
                )}
              </div>
            )}
          </div>
        ))}

        {sections.ungrouped.length > 0 && (
          <div className="env-group">
            <div
              className="env-group-header env-group-header-muted"
              onClick={() => toggleExpanded(UNGROUPED_KEY)}
            >
              <span className="env-group-chevron">
                {!expandedKeys.includes(UNGROUPED_KEY) ? (
                  <ChevronRight size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </span>
              <span className="env-group-name">Ungrouped</span>
              <span className="env-group-count">{sections.ungrouped.length}</span>
            </div>
            {(expandedKeys.includes(UNGROUPED_KEY) || query) && (
              <div className="env-group-body">{sections.ungrouped.map(renderEnvCard)}</div>
            )}
          </div>
        )}

        {sections.groups.length === 0 && sections.ungrouped.length === 0 && (
          <div className="env-group-empty">Không tìm thấy kết quả.</div>
        )}
      </div>

      {/* 4. Variables for selected project (shared) or environment */}
      {selectedGroup ? (
        <div className="env-variables-section">
          <div className="env-section-header" style={{ marginTop: 4 }}>
            <div className="row" style={{ gap: 6, minWidth: 0, flex: 1 }}>
              <span
                className="caps"
                style={{
                  color: 'var(--text-primary)',
                  fontWeight: 750,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Shared variables ({selectedGroup.name})
              </span>
            </div>
            <button
              type="button"
              className="button button-sm"
              onClick={() => onAddGroupVariable(selectedGroup.id)}
              title="Add shared variable"
              style={{ height: 24, padding: '0 8px', fontSize: 11 }}
            >
              <Plus size={11} />
              <span>Variable</span>
            </button>
          </div>

          {selectedGroup.variables.length === 0 ? (
            <div className="env-vars-empty">
              <p>Chưa có biến dùng chung nào cho project này.</p>
            </div>
          ) : (
            <VariablesTable
              variables={selectedGroup.variables}
              onUpdate={(varId, patch) => onUpdateGroupVariable(selectedGroup.id, varId, patch)}
              onDelete={(varId) => onDeleteGroupVariable(selectedGroup.id, varId)}
            />
          )}

          <div className="env-tip-text">
            Biến dùng chung cho mọi environment trong project. Nếu environment có biến cùng tên thì
            giá trị của environment được ưu tiên.
          </div>
        </div>
      ) : selectedEnv ? (
        <div className="env-variables-section">
          <div className="env-section-header" style={{ marginTop: 4 }}>
            <div className="row" style={{ gap: 6, minWidth: 0, flex: 1 }}>
              <span
                className="caps"
                style={{
                  color: 'var(--text-primary)',
                  fontWeight: 750,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Variables ({selectedEnv.name})
              </span>
            </div>
            <button
              type="button"
              className="button button-sm"
              onClick={() => onAddEnvironmentVariable(selectedEnv.id)}
              title="Add Variable"
              style={{ height: 24, padding: '0 8px', fontSize: 11 }}
            >
              <Plus size={11} />
              <span>Variable</span>
            </button>
          </div>

          {selectedEnv.variables.length === 0 ? (
            <div className="env-vars-empty">
              <p>Chưa có biến nào trong môi trường này.</p>
              <button
                type="button"
                className="button button-sm button-primary"
                onClick={() => onAddEnvironmentVariable(selectedEnv.id)}
                style={{ height: 24 }}
              >
                <Plus size={12} />
                <span>Add Variable</span>
              </button>
            </div>
          ) : (
            <VariablesTable
              variables={selectedEnv.variables}
              onUpdate={(varId, patch) => onUpdateEnvironmentVariable(selectedEnv.id, varId, patch)}
              onDelete={(varId) => onDeleteEnvironmentVariable(selectedEnv.id, varId)}
            />
          )}

          {selectedEnv.groupId && knownGroupIds.has(selectedEnv.groupId) && (
            <div className="env-tip-text">
              Kế thừa{' '}
              {environmentGroups.find((g) => g.id === selectedEnv.groupId)?.variables.length ?? 0} biến
              dùng chung từ project{' '}
              <strong>{environmentGroups.find((g) => g.id === selectedEnv.groupId)?.name}</strong>.
            </div>
          )}
          <div className="env-tip-text">
            Sử dụng <code>{'{{variable_name}}'}</code> trong URL, Headers, Params hoặc Body để tự động
            chèn giá trị.
          </div>
        </div>
      ) : null}
    </div>
  )
}
