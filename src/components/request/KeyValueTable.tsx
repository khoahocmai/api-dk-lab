import { Plus, Trash2 } from 'lucide-react'
import type { EnvironmentItem, KeyValueRow } from '../../types'
import { createId } from '../../utils/formatters'
import { TemplateInput } from '../common/TemplateInput'

interface KeyValueTableProps {
  rows: KeyValueRow[]
  onChange: (rows: KeyValueRow[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
  descriptionPlaceholder?: string
  title?: string
  environment?: EnvironmentItem | null
}

export function KeyValueTable({
  rows,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  descriptionPlaceholder = 'Description',
  title,
  environment,
}: KeyValueTableProps) {
  const currentRows = Array.isArray(rows) && rows.length > 0 ? rows : []

  const updateRow = (id: string, patch: Partial<KeyValueRow>, index: number) => {
    let baseList = currentRows.length > 0 ? [...currentRows] : [{ id, key: '', value: '', enabled: true, description: '' }]
    if (!baseList.some((r) => r.id === id)) {
      baseList = [...baseList, { id, key: '', value: '', enabled: true, description: '', ...patch }]
    }

    const nextRows = baseList.map((row, i) => (row.id === id || (baseList.length === 1 && i === 0) ? { ...row, ...patch } : row))

    // Auto-append an empty row if editing the very last row and it now has a key or value
    if (index === nextRows.length - 1 && (patch.key !== undefined || patch.value !== undefined)) {
      const updatedRow = nextRows[index]
      if (updatedRow && (updatedRow.key.trim() !== '' || updatedRow.value.trim() !== '')) {
        nextRows.push({
          id: createId(),
          key: '',
          value: '',
          enabled: true,
          description: '',
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
      },
    ])
  }

  const displayRows = currentRows.length > 0
    ? currentRows
    : [{ id: 'empty-initial-row', key: '', value: '', enabled: true, description: '' }]

  return (
    <div className="kv-table-container">
      {title && <div className="caps" style={{ marginBottom: 8 }}>{title}</div>}
      <div className="kv-table-header">
        <div className="kv-col-check"></div>
        <div className="kv-col-key">Key</div>
        <div className="kv-col-val">Value</div>
        <div className="kv-col-desc">Description</div>
        <div className="kv-col-act"></div>
      </div>

      <div className="kv-table-body">
        {displayRows.map((row, index) => (
          <div key={row.id} className={`kv-row ${!row.enabled ? 'is-disabled' : ''}`}>
            <div className="kv-col-check">
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(e) => updateRow(row.id, { enabled: e.target.checked }, index)}
                aria-label="Toggle parameter"
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
            <div className="kv-col-val">
              <TemplateInput
                size="sm"
                placeholder={valuePlaceholder}
                value={row.value}
                onChange={(val) => updateRow(row.id, { value: val }, index)}
                environment={environment}
                aria-label="Parameter value"
              />
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
                disabled={displayRows.length === 1 && !row.key && !row.value}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
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
