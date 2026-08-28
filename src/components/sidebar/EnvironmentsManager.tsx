import React, { useState } from 'react'
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Pencil,
  Plus,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import type { EnvironmentItem, EnvironmentVariable } from '../../types'

export interface EnvironmentsManagerProps {
  environments: EnvironmentItem[]
  activeEnvironmentId: string
  onSelectEnvironment: (id: string) => void
  onAddEnvironment: () => void
  onDuplicateEnvironment: (id: string) => void
  onRenameEnvironment: (id: string, newName: string) => void
  onDeleteEnvironment: (id: string) => void
  onUpdateEnvironmentVariable: (
    envId: string,
    varId: string,
    patch: Partial<EnvironmentVariable>,
  ) => void
  onDeleteEnvironmentVariable: (envId: string, varId: string) => void
  onAddEnvironmentVariable: (envId: string) => void
}

export function EnvironmentsManager({
  environments,
  activeEnvironmentId,
  onSelectEnvironment,
  onAddEnvironment,
  onDuplicateEnvironment,
  onRenameEnvironment,
  onDeleteEnvironment,
  onUpdateEnvironmentVariable,
  onDeleteEnvironmentVariable,
  onAddEnvironmentVariable,
}: EnvironmentsManagerProps) {
  // State for which environment is currently selected for viewing/editing variables
  const [selectedEnvId, setSelectedEnvId] = useState<string>(() => {
    if (activeEnvironmentId && activeEnvironmentId !== 'NO_ENV') return activeEnvironmentId
    return environments[0]?.id || ''
  })

  // State for inline renaming an environment
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null)
  const [tempEnvName, setTempEnvName] = useState<string>('')

  // Determine current selected environment
  const currentSelectedEnv =
    environments.find((e) => e.id === selectedEnvId) ||
    environments.find((e) => e.id === activeEnvironmentId) ||
    environments[0] ||
    null

  // Effective selected ID
  const effectiveSelectedId = currentSelectedEnv?.id || ''

  const handleStartRename = (e: React.MouseEvent, env: EnvironmentItem) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingEnvId(env.id)
    setTempEnvName(env.name)
  }

  const handleSaveRename = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (editingEnvId && tempEnvName.trim()) {
      onRenameEnvironment(editingEnvId, tempEnvName.trim())
    }
    setEditingEnvId(null)
    setTempEnvName('')
  }

  const handleCancelRename = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setEditingEnvId(null)
    setTempEnvName('')
  }

  const handleActivateEnv = (e: React.MouseEvent, envId: string) => {
    e.preventDefault()
    e.stopPropagation()
    onSelectEnvironment(envId)
    setSelectedEnvId(envId)
  }

  return (
    <div className="env-manager-container">
      {/* 1. Header: Environments List Section */}
      <div className="env-section-header">
        <div className="row" style={{ gap: 6 }}>
          <Globe size={13} style={{ color: 'var(--primary-bright)' }} />
          <span className="caps" style={{ color: 'var(--text-primary)', fontWeight: 750 }}>
            Environments ({environments.length})
          </span>
        </div>
        <button
          type="button"
          className="button button-sm button-primary"
          onClick={onAddEnvironment}
          title="Create New Environment"
          style={{ height: 24, padding: '0 8px', fontSize: 11 }}
        >
          <Plus size={12} />
          <span>New</span>
        </button>
      </div>

      {/* 2. Environments List Cards */}
      <div className="env-list-cards">
        {environments.map((env) => {
          const isActive = env.id === activeEnvironmentId
          const isSelected = env.id === effectiveSelectedId
          const isEditing = editingEnvId === env.id

          return (
            <div
              key={env.id}
              className={`env-card-item ${isSelected ? 'is-selected' : ''} ${
                isActive ? 'is-active' : ''
              }`}
              onClick={() => setSelectedEnvId(env.id)}
            >
              {isEditing ? (
                <div
                  className="env-card-rename-row"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    className="input input-sm"
                    value={tempEnvName}
                    onChange={(e) => setTempEnvName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename()
                      if (e.key === 'Escape') handleCancelRename()
                    }}
                    autoFocus
                    placeholder="Environment Name"
                    style={{ flex: 1, height: 24, fontSize: 12 }}
                  />
                  <button
                    type="button"
                    className="icon-button icon-button-sm"
                    onClick={handleSaveRename}
                    title="Save Name"
                    style={{ color: 'var(--primary-bright)', width: 22, height: 22 }}
                  >
                    <Check size={13} />
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button-sm"
                    onClick={handleCancelRename}
                    title="Cancel"
                    style={{ width: 22, height: 22 }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
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
                        onClick={(e) => handleActivateEnv(e, env.id)}
                        title="Set as Active Environment"
                      >
                        <Check size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-button icon-button-sm"
                      onClick={(e) => handleStartRename(e, env)}
                      title="Rename Environment"
                    >
                      <Pencil size={12} />
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
              )}
            </div>
          )
        })}
      </div>

      {/* 3. Variables Table for Current Selected Environment */}
      {currentSelectedEnv ? (
        <div className="env-variables-section">
          <div className="env-section-header" style={{ marginTop: 4 }}>
            <div className="row" style={{ gap: 6, minWidth: 0, flex: 1 }}>
              <span className="caps" style={{ color: 'var(--text-primary)', fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Variables ({currentSelectedEnv.name})
              </span>
            </div>
            <button
              type="button"
              className="button button-sm"
              onClick={() => onAddEnvironmentVariable(currentSelectedEnv.id)}
              title="Add Variable"
              style={{ height: 24, padding: '0 8px', fontSize: 11 }}
            >
              <Plus size={11} />
              <span>Variable</span>
            </button>
          </div>

          {currentSelectedEnv.variables.length === 0 ? (
            <div className="env-vars-empty">
              <p>Chưa có biến nào trong môi trường này.</p>
              <button
                type="button"
                className="button button-sm button-primary"
                onClick={() => onAddEnvironmentVariable(currentSelectedEnv.id)}
                style={{ height: 24 }}
              >
                <Plus size={12} />
                <span>Add Variable</span>
              </button>
            </div>
          ) : (
            <div className="env-vars-table">
              <div className="env-vars-table-header">
                <span style={{ width: 20 }}></span>
                <span style={{ flex: 1 }}>KEY</span>
                <span style={{ flex: 1.2 }}>VALUE</span>
                <span style={{ width: 44 }}></span>
              </div>
              <div className="env-vars-table-body">
                {currentSelectedEnv.variables.map((item) => (
                  <div key={item.id} className="env-vars-row">
                    <input
                      aria-label={`Enable ${item.key || 'variable'}`}
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(event) =>
                        onUpdateEnvironmentVariable(currentSelectedEnv.id, item.id, {
                          enabled: event.target.checked,
                        })
                      }
                      className="env-vars-checkbox"
                    />
                    <input
                      className="input input-sm env-vars-key-input"
                      value={item.key}
                      onChange={(event) =>
                        onUpdateEnvironmentVariable(currentSelectedEnv.id, item.id, {
                          key: event.target.value,
                        })
                      }
                      placeholder="KEY"
                      aria-label="Variable key"
                    />
                    <input
                      className={`input input-sm env-vars-value-input ${
                        item.secret ? 'input-secret' : ''
                      }`}
                      type={item.secret ? 'password' : 'text'}
                      value={item.value || ''}
                      onChange={(event) =>
                        onUpdateEnvironmentVariable(currentSelectedEnv.id, item.id, {
                          value: event.target.value,
                        })
                      }
                      placeholder={item.secret ? 'secret' : 'VALUE'}
                      aria-label="Variable value"
                    />
                    <div className="row" style={{ gap: 2, flexShrink: 0 }}>
                      <button
                        className="icon-button icon-button-sm secret-toggle"
                        type="button"
                        onClick={() =>
                          onUpdateEnvironmentVariable(currentSelectedEnv.id, item.id, {
                            secret: !item.secret,
                          })
                        }
                        title={
                          item.secret
                            ? 'Show value (Masked as password)'
                            : 'Hide value (Mask as password)'
                        }
                        style={{ width: 20, height: 20 }}
                      >
                        {item.secret ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                      <button
                        className="icon-button icon-button-sm env-delete-btn"
                        type="button"
                        onClick={() =>
                          onDeleteEnvironmentVariable(currentSelectedEnv.id, item.id)
                        }
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
          )}

          <div className="env-tip-text">
            Sử dụng <code>{'{{variable_name}}'}</code> trong URL, Headers, Params hoặc Body để tự động chèn giá trị.
          </div>
        </div>
      ) : null}
    </div>
  )
}
