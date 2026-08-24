import React, { useRef } from 'react'
import { FileText, Plus, Trash2, Upload, X } from 'lucide-react'
import type { EnvironmentItem, KeyValueRow } from '../../types'
import { createId } from '../../utils/formatters'
import { TemplateInput } from '../common/TemplateInput'

export interface KeyValueTableProps {
  rows: KeyValueRow[]
  onChange: (rows: KeyValueRow[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
  descriptionPlaceholder?: string
  title?: string
  environment?: EnvironmentItem | null
  allowFile?: boolean
  hideHeader?: boolean
}

export function KeyValueTable({
  rows,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  descriptionPlaceholder = 'Description',
  title,
  environment,
  allowFile = false,
  hideHeader = false,
}: KeyValueTableProps) {
  const currentRows = Array.isArray(rows) && rows.length > 0 ? rows : []
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const updateRow = (id: string, patch: Partial<KeyValueRow>, index: number) => {
    let baseList =
      currentRows.length > 0
        ? [...currentRows]
        : [{ id, key: '', value: '', enabled: true, description: '', type: 'text' as const }]
    if (!baseList.some((r) => r.id === id)) {
      baseList = [
        ...baseList,
        { id, key: '', value: '', enabled: true, description: '', type: 'text' as const, ...patch },
      ]
    }

    const nextRows = baseList.map((row, i) =>
      row.id === id || (baseList.length === 1 && i === 0) ? { ...row, ...patch } : row,
    )

    // Auto-append an empty row if editing the very last row and it now has a key, value, or file
    if (
      index === nextRows.length - 1 &&
      (patch.key !== undefined ||
        patch.value !== undefined ||
        patch.fileName !== undefined ||
        patch.type !== undefined)
    ) {
      const updatedRow = nextRows[index]
      if (
        updatedRow &&
        (updatedRow.key.trim() !== '' ||
          updatedRow.value.trim() !== '' ||
          Boolean(updatedRow.fileName))
      ) {
        nextRows.push({
          id: createId(),
          key: '',
          value: '',
          enabled: true,
          description: '',
          type: 'text',
        })
      }
    }

    onChange(nextRows)
  }

  const removeRow = (id: string) => {
    const nextRows = currentRows.filter((row) => row.id !== id)
    if (nextRows.length === 0) {
      nextRows.push({
        id: createId(),
        key: '',
        value: '',
        enabled: true,
        description: '',
        type: 'text',
      })
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
        enabled: true,
        description: '',
        type: 'text',
      },
    ])
  }

  const handleFileSelect = (id: string, index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      updateRow(
        id,
        {
          value: file.name,
          fileName: file.name,
        },
        index,
      )
    }
  }

  const displayRows =
    currentRows.length > 0
      ? currentRows
      : [{ id: 'empty-initial-row', key: '', value: '', enabled: true, description: '', type: 'text' as const }]

  return (
    <div className="kv-table-container">
      {title && <div className="caps" style={{ marginBottom: 8 }}>{title}</div>}
      {!hideHeader && (
        <div className={`kv-table-header ${allowFile ? 'has-type' : ''}`}>
          <div className="kv-col-check"></div>
          <div className="kv-col-key">Key</div>
          {allowFile && <div className="kv-col-type">Type</div>}
          <div className="kv-col-val">Value</div>
          <div className="kv-col-desc">Description</div>
          <div className="kv-col-act"></div>
        </div>
      )}

      <div className="kv-table-body">
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
                  onChange={(e) => updateRow(row.id, { enabled: e.target.checked }, index)}
                  aria-label="Toggle row"
                />
              </div>

              <div className="kv-col-key">
                <input
                  className="input input-sm kv-input"
                  placeholder={keyPlaceholder}
                  value={row.key}
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
                      updateRow(
                        row.id,
                        {
                          type: newType,
                          value: '',
                          fileName: undefined,
                        },
                        index,
                      )
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
                        <span className="kv-file-name" title={row.fileName || row.value}>
                          {row.fileName || row.value}
                        </span>
                        <button
                          type="button"
                          className="kv-file-clear"
                          title="Clear file"
                          onClick={() => {
                            if (fileInputRefs.current[row.id]) {
                              fileInputRefs.current[row.id]!.value = ''
                            }
                            updateRow(row.id, { value: '', fileName: undefined }, index)
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
                <button
                  type="button"
                  className="icon-button icon-button-sm kv-delete-btn"
                  onClick={() => removeRow(row.id)}
                  title="Delete item"
                  disabled={displayRows.length === 1 && !row.key && !row.value && !row.fileName}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="kv-table-footer">
        <button type="button" className="button button-sm" onClick={addRow}>
          <Plus size={13} />
          Add Row
        </button>
      </div>
    </div>
  )
}
