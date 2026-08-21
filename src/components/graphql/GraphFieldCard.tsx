import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import type { GraphField } from '../../types'
import { GraphTypeBadge } from './GraphTypeBadge'

interface GraphFieldCardProps {
  field: GraphField
  isSelected: boolean
  onToggle: (checked: boolean) => void
  onQuickInsert: () => void
}

export function GraphFieldCard({
  field,
  isSelected,
  onToggle,
  onQuickInsert,
}: GraphFieldCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasArgs = field.args.length > 0

  return (
    <div className={`graph-field-card ${isSelected ? 'is-selected' : ''}`}>
      {/* Header Row */}
      <div className="graph-card-header">
        <div className="graph-card-left">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(event) => onToggle(event.target.checked)}
            aria-label={`Select ${field.name}`}
            className="graph-card-checkbox"
          />
          <span className="graph-field-name">{field.name}</span>
          <span className="graph-colon">:</span>
          <GraphTypeBadge typeLabel={field.typeLabel} />
        </div>

        <div className="graph-card-actions">
          {hasArgs && (
            <button
              type="button"
              className="icon-button icon-button-sm graph-expand-toggle"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Hide arguments' : 'View arguments'}
            >
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          )}

          <button
            type="button"
            className="button button-sm graph-insert-btn"
            onClick={onQuickInsert}
            title="Use this API in a new Request Tab"
          >
            <Plus size={11} />
            <span>Use this API</span>
          </button>
        </div>
      </div>

      {/* Expanded Arguments List */}
      {hasArgs && isExpanded && (
        <div className="graph-args-container">
          <div className="graph-args-header">
            <span>Arguments ({field.args.length})</span>
          </div>

          <div className="graph-args-list">
            {field.args.map((arg) => (
              <div key={arg.name} className="graph-arg-block">
                <div className="graph-arg-row">
                  <span className="graph-arg-name">{arg.name}</span>
                  <span className="graph-colon">:</span>
                  <GraphTypeBadge typeLabel={arg.typeLabel} />
                </div>

                {/* Nested Input DTO fields */}
                {arg.inputFields.length > 0 && (
                  <div className="graph-nested-container">
                    <div className="graph-nested-header">
                      Input Fields ({arg.inputFields.length}):
                    </div>
                    <div className="graph-nested-list">
                      {arg.inputFields.map((inputField) => (
                        <div key={inputField.name} className="graph-nested-row">
                          <span className="graph-nested-name">{inputField.name}</span>
                          <span className="graph-colon">:</span>
                          <GraphTypeBadge typeLabel={inputField.typeLabel} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
