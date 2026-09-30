import React, { useMemo, useRef, useState } from 'react'
import { Eye, EyeOff, FileText, Lock, Plus, Trash2, Upload, X } from 'lucide-react'
import type { EnvironmentItem, KeyValueRow } from '../../types'
import { createId } from '../../utils/formatters'
import { registerFile, removeRegisteredFile } from '../../utils/fileRegistry'
import { TemplateInput } from '../common/TemplateInput'

export interface KeyValueTableProps {
  rows: KeyValueRow[]
  autoRows?: KeyValueRow[]
  onChange: (rows: KeyValueRow[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
  descriptionPlaceholder?: string
  title?: string
  environment?: EnvironmentItem | null
  allowFile?: boolean
  hideHeader?: boolean
  isPathVariableTable?: boolean
  hideAddRow?: boolean
}

function isRowEmpty(row: KeyValueRow): boolean {
  const hasKey = Boolean(row.key && row.key.trim() !== '')
  const hasValue = Boolean(row.value && row.value.trim() !== '')
  const hasFile = Boolean(row.fileName && row.fileName.trim() !== '')
  return !hasKey && !hasValue && !hasFile
}

export function KeyValueTable({
  rows,
  autoRows = [],
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  descriptionPlaceholder = 'Description',
  title,
  environment,
  allowFile = false,
  hideHeader = false,
  isPathVariableTable = false,
  hideAddRow = false,
}: KeyValueTableProps) {
  const currentRows = Array.isArray(rows) ? rows : []
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [showAutoHeaders, setShowAutoHeaders] = useState(false)

  // Track which keys the user has explicitly provided to mark overridden auto rows
  const userOverriddenKeys = useMemo(
    () =>
      new Set(
        currentRows
          .filter((r) => r.enabled && r.key.trim() !== '')
          .map((r) => r.key.trim().toLowerCase()),
      ),
    [currentRows],
  )

  // Compute displayRows ensuring ghost row when empty or trailing non-empty row
  const displayRows = useMemo(() => {
    if (isPathVariableTable) return currentRows

    // Sanitize any empty rows to always have enabled: false
    const sanitizedRows = currentRows.map((r) =>
      isRowEmpty(r) && r.enabled ? { ...r, enabled: false } : r,
    )

    if (sanitizedRows.length === 0) {
      return [
        {
          id: 'ghost-initial-row',
          key: '',
          value: '',
          enabled: false,
          description: '',
          type: 'text' as const,
        },
      ]
    }

    const lastRow = sanitizedRows[sanitizedRows.length - 1]
    if (lastRow && !isRowEmpty(lastRow)) {
      return [
        ...sanitizedRows,
        {
          id: 'ghost-tail-row',
          key: '',
          value: '',
          enabled: false,
          description: '',
          type: 'text' as const,
        },
      ]
    }

    return sanitizedRows
  }, [currentRows, isPathVariableTable])

  const updateRow = (id: string, patch: Partial<KeyValueRow>, index: number) => {
    let baseList = displayRows.length > 0 ? [...displayRows] : []

    // If updating a ghost placeholder row, assign a real unique ID
    if (id.startsWith('ghost-') || !baseList.some((r) => r.id === id)) {
      const realId = createId()
      if (baseList[index]) {
        baseList[index] = { ...baseList[index], id: realId }
      } else {
        baseList.push({
          id: realId,
          key: '',
          value: '',
          enabled: false,
          description: '',
          type: 'text' as const,
        })
      }
      id = realId
    }

    const nextRows = baseList.map((row, i) => {
      if (row.id !== id && !(baseList.length === 1 && i === 0)) {
        return row
      }

      const merged = { ...row, ...patch }

      // When user modifies content (key, value, fileName, type) without explicit checkbox toggle:
      if (patch.enabled === undefined) {
        const isFilled =
          (merged.key && merged.key.trim() !== '') ||
          (merged.value && merged.value.trim() !== '') ||
          Boolean(merged.fileName && merged.fileName.trim() !== '')

        if (isFilled) {
          // Rule 2.1: Auto-enable checkbox when user types key or value
          merged.enabled = true
        } else {
          // Rule 3: Auto-disable checkbox when user clears all content
          merged.enabled = false
        }
      }

      return merged
    })

    // For normal tables: handle auto-append and auto-cleanup
    if (!isPathVariableTable) {
      // Clean up multiple trailing empty rows, keeping at most 1
      while (
        nextRows.length > 1 &&
        isRowEmpty(nextRows[nextRows.length - 1]) &&
        isRowEmpty(nextRows[nextRows.length - 2])
      ) {
        nextRows.pop()
      }

      // Rule 2.2: Auto-append an empty row at the bottom if the last row is non-empty
      const lastRow = nextRows[nextRows.length - 1]
      if (lastRow && !isRowEmpty(lastRow)) {
        nextRows.push({
          id: createId(),
          key: '',
          value: '',
          enabled: false,
          description: '',
          type: 'text',
        })
      }
    }

    onChange(nextRows)
  }

  const removeRow = (id: string) => {
    removeRegisteredFile(id)
    let nextRows = currentRows.filter((row) => row.id !== id)
    if (!isPathVariableTable) {
      while (
        nextRows.length > 1 &&
        isRowEmpty(nextRows[nextRows.length - 1]) &&
        isRowEmpty(nextRows[nextRows.length - 2])
      ) {
        nextRows.pop()
      }
      if (nextRows.length === 0 || !isRowEmpty(nextRows[nextRows.length - 1])) {
        nextRows.push({
          id: createId(),
          key: '',
          value: '',
          enabled: false,
          description: '',
          type: 'text',
        })
      }
    }
    onChange(nextRows)
  }

  const addRow = () => {
    onChange([
      ...currentRows,
      {
        id: createId(),
        key: '',
        value: '',
        enabled: false,
        description: '',
        type: 'text',
      },
    ])
  }

  const handleFileSelect = (id: string, index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      let filePath = ''
      try {
        if (window.desktopApi?.getPathForFile) {
          filePath = window.desktopApi.getPathForFile(file)
        }
      } catch {
        // fallback
      }
      if (!filePath && (file as unknown as { path?: string }).path) {
        filePath = (file as unknown as { path?: string }).path || ''
      }

      registerFile(id, file)

      const currentRow = displayRows[index] || currentRows.find((r) => r.id === id)
      const currentKey = currentRow?.key?.trim() || ''
      const defaultKey = currentKey || 'file'

      updateRow(
        id,
        {
          key: defaultKey,
          value: file.name,
          fileName: file.name,
          filePath: filePath || undefined,
          enabled: true,
        },
        index,
      )
    }
  }

  return (
    <div className="kv-table-container">
      {/* Table Title & Auto Headers Toggle Toolbar */}
      <div className="kv-table-top-bar">
        {title && <div className="caps">{title}</div>}
        {autoRows && autoRows.length > 0 && (
          <button
            type="button"
            className={`kv-auto-toggle-btn ${showAutoHeaders ? 'is-active' : ''}`}
            onClick={() => setShowAutoHeaders(!showAutoHeaders)}
            title={
              showAutoHeaders
                ? 'Hide headers field(s)'
                : 'Show headers field(s) (system calculated)'
            }
          >
            {showAutoHeaders ? (
              <>
                <EyeOff size={12} className="text-gray-400" />
                <span>Hide headers field(s) </span>
              </>
            ) : (
              <>
                <Eye size={12} className="text-blue-400" />
                <span>{autoRows.length} hidden headers field(s)</span>
              </>
            )}
          </button>
        )}
      </div>

      {!hideHeader && (
        <div className={`kv-table-header ${allowFile ? 'has-type' : ''}`}>
          <div className="kv-col-check"></div>
          <div className="kv-col-key">{isPathVariableTable ? 'Key (Read-only)' : 'Key'}</div>
          {allowFile && <div className="kv-col-type">Type</div>}
          <div className="kv-col-val">Value</div>
          <div className="kv-col-desc">Description</div>
          <div className="kv-col-act"></div>
        </div>
      )}

      <div className="kv-table-body">
        {/* 1. AUTO-GENERATED SYSTEM ROWS (Toggleable, Strikethrough if Overridden) */}
        {showAutoHeaders &&
          autoRows.map((autoRow) => {
            const isOverridden = userOverriddenKeys.has(autoRow.key.trim().toLowerCase())

            return (
              <div
                key={autoRow.id}
                className={`kv-row is-auto-row is-readonly ${isOverridden ? 'is-overridden-by-user' : ''
                  } ${allowFile ? 'has-type' : ''}`}
                title={
                  isOverridden
                    ? `Header "${autoRow.key}" đã bị ghi đè bởi User Header bên dưới.`
                    : 'Header tự động của hệ thống (Read-only).'
                }
              >
                <div className="kv-col-check">
                  <input
                    type="checkbox"
                    checked={!isOverridden && autoRow.enabled}
                    disabled
                    aria-label="Auto-generated header active"
                  />
                </div>

                <div className="kv-col-key">
                  <input
                    className="input input-sm kv-input is-readonly"
                    value={autoRow.key}
                    readOnly
                    disabled
                  />
                </div>

                {allowFile && (
                  <div className="kv-col-type">
                    <select className="select select-sm kv-type-select is-readonly" disabled>
                      <option value="text">Text</option>
                    </select>
                  </div>
                )}

                <div className="kv-col-val">
                  <TemplateInput
                    size="sm"
                    placeholder={valuePlaceholder}
                    value={autoRow.value}
                    onChange={() => { }}
                    readOnly
                    disabled
                    environment={environment}
                    containerClassName="is-readonly"
                    aria-label="Auto-generated value"
                  />
                </div>

                <div className="kv-col-desc">
                  <input
                    className="input input-sm kv-input kv-desc-input is-readonly"
                    placeholder={descriptionPlaceholder}
                    value={
                      isOverridden
                        ? `${autoRow.description || 'Auto-generated'} (Overridden)`
                        : autoRow.description || 'Auto-generated header'
                    }
                    readOnly
                    disabled
                  />
                </div>

                <div className="kv-col-act">
                  <span
                    className="kv-auto-lock"
                    title={
                      isOverridden
                        ? 'Đã bị ghi đè bởi User Header'
                        : 'Header tự động của hệ thống'
                    }
                  >
                    <Lock size={12} style={{ color: 'var(--text-dim)' }} />
                  </span>
                </div>
              </div>
            )
          })}

        {/* 2. USER-CONFIGURED ROWS / PATH VARIABLE ROWS */}
        {displayRows.map((row, index) => {
          const isFileType = allowFile && row.type === 'file'

          return (
            <div
              key={row.id}
              className={`kv-row ${allowFile ? 'has-type' : ''} ${!row.enabled ? 'is-disabled' : ''}`}
            >
              <div className="kv-col-check">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  disabled={isPathVariableTable}
                  onChange={(e) => updateRow(row.id, { enabled: e.target.checked }, index)}
                  aria-label="Toggle row"
                />
              </div>

              <div className="kv-col-key">
                <input
                  className={`input input-sm kv-input ${isPathVariableTable ? 'is-readonly' : ''} ${isFileType && !row.key.trim() ? 'border-amber-500/50' : ''}`}
                  placeholder={isFileType ? 'Key (e.g. file)' : keyPlaceholder}
                  value={row.key}
                  readOnly={isPathVariableTable}
                  disabled={isPathVariableTable}
                  title={
                    isPathVariableTable
                      ? `Tên biến đường dẫn trích xuất tự động từ URL (:${row.key})`
                      : isFileType && !row.key.trim()
                      ? 'Field name is required for multipart file upload (default: file)'
                      : undefined
                  }
                  onChange={(e) => updateRow(row.id, { key: e.target.value }, index)}
                />
              </div>

              {allowFile && (
                <div className="kv-col-type">
                  <select
                    className="select select-sm kv-type-select"
                    value={row.type || 'text'}
                    onChange={(e) => {
                      const newType = e.target.value as 'text' | 'file'
                      removeRegisteredFile(row.id)
                      const patch: Partial<KeyValueRow> = {
                        type: newType,
                        value: '',
                        fileName: undefined,
                        filePath: undefined,
                      }
                      if (newType === 'file' && !row.key.trim()) {
                        patch.key = 'file'
                      }
                      updateRow(row.id, patch, index)
                    }}
                  >
                    <option value="text">Text</option>
                    <option value="file">File</option>
                  </select>
                </div>
              )}

              <div className="kv-col-val">
                {isFileType ? (
                  <div className="kv-file-input-wrapper">
                    <input
                      type="file"
                      ref={(el) => {
                        fileInputRefs.current[row.id] = el
                      }}
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileSelect(row.id, index, e)}
                    />
                    {row.value || row.fileName ? (
                      <div className="kv-file-selected">
                        <FileText size={13} className="text-primary-bright flex-shrink-0" />
                        <span className="kv-file-name" title={row.filePath || row.fileName || row.value}>
                          {row.fileName || row.value}
                        </span>
                        <button
                          type="button"
                          className="kv-file-clear"
                          title="Clear file"
                          onClick={() => {
                            removeRegisteredFile(row.id)
                            if (fileInputRefs.current[row.id]) {
                              fileInputRefs.current[row.id]!.value = ''
                            }
                            updateRow(row.id, { value: '', fileName: undefined, filePath: undefined }, index)
                          }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="kv-file-choose-btn"
                        onClick={() => fileInputRefs.current[row.id]?.click()}
                      >
                        <Upload size={12} />
                        <span>Choose File</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <TemplateInput
                    size="sm"
                    placeholder={valuePlaceholder}
                    value={row.value}
                    onChange={(val) => updateRow(row.id, { value: val }, index)}
                    environment={environment}
                    aria-label="Parameter value"
                  />
                )}
              </div>

              <div className="kv-col-desc">
                <input
                  className="input input-sm kv-input kv-desc-input"
                  placeholder={descriptionPlaceholder}
                  value={row.description || ''}
                  onChange={(e) => updateRow(row.id, { description: e.target.value }, index)}
                />
              </div>

              <div className="kv-col-act">
                {isPathVariableTable ? (
                  <span
                    className="kv-auto-lock"
                    title={`Được định nghĩa từ URL (:${row.key})`}
                  >
                    <Lock size={12} style={{ color: 'var(--text-dim)' }} />
                  </span>
                ) : (
                  <button
                    type="button"
                    className="icon-button icon-button-sm kv-delete-btn"
                    onClick={() => removeRow(row.id)}
                    title="Delete item"
                    disabled={displayRows.length === 1 && !row.key && !row.value && !row.fileName}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!hideAddRow && !isPathVariableTable && (
        <div className="kv-table-footer">
          <button type="button" className="button button-sm" onClick={addRow}>
            <Plus size={13} />
            Add Row
          </button>
        </div>
      )}
    </div>
  )
}
