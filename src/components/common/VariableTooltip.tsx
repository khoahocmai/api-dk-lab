import type { VariableDetail } from '../../utils/templateHelper'

interface VariableTooltipProps {
  detail: VariableDetail
  anchorRect: DOMRect | null
  onClose?: () => void
}

export function VariableTooltip({ detail, anchorRect }: VariableTooltipProps) {
  if (!anchorRect) return null

  const top = anchorRect.bottom + 6
  const left = Math.max(12, Math.min(window.innerWidth - 320, anchorRect.left))

  const isPathVariable = detail.type === 'path'
  const hasValue = Boolean(detail.value && detail.value.trim())
  const isValid = isPathVariable ? hasValue : detail.exists && detail.enabled

  let displayValue = ''
  if (isPathVariable) {
    displayValue = hasValue ? detail.value : '(Empty)'
  } else {
    displayValue = !detail.exists
      ? '(Not found in active environment)'
      : !detail.enabled
        ? '(Disabled in active environment)'
        : detail.secret
          ? '••••••••'
          : detail.value || '(empty)'
  }

  return (
    <div
      className="postman-var-popover"
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
    >
      <div className="popover-row">
        <span className="popover-label">{isPathVariable ? 'Path Var:' : 'Variable:'}</span>
        {isPathVariable ? (
          <span className="popover-path-token">
            :{detail.name}
          </span>
        ) : (
          <span className={`popover-var-name ${isValid ? 'is-valid' : 'is-unresolved'}`}>
            &#123;&#123;{detail.name}&#125;&#125;
          </span>
        )}
      </div>

      <div className="popover-row">
        <span className="popover-label">{isPathVariable ? 'Type:' : 'Scope:'}</span>
        <span className="popover-val-text">{detail.scopeName}</span>
      </div>

      <div className="popover-row">
        <span className="popover-label">Value:</span>
        <span
          className={`popover-val-text ${
            (!isPathVariable && !isValid) || (isPathVariable && !hasValue) ? 'is-unresolved' : ''
          }`}
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {displayValue}
        </span>
      </div>
    </div>
  )
}
