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

  const isValid = detail.exists && detail.enabled

  const displayValue = !detail.exists
    ? '(Not found in active environment)'
    : !detail.enabled
      ? '(Disabled in active environment)'
      : detail.secret
        ? '••••••••'
        : (detail.value || '(empty)')

  return (
    <div
      className="postman-var-popover"
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
    >
      <div className="popover-row">
        <span className="popover-label">Variable:</span>
        <span className={`popover-var-name ${isValid ? 'is-valid' : 'is-unresolved'}`}>
          &#123;&#123;{detail.name}&#125;&#125;
        </span>
      </div>

      <div className="popover-row">
        <span className="popover-label">Scope:</span>
        <span className="popover-val-text">{detail.scopeName}</span>
      </div>

      <div className="popover-row">
        <span className="popover-label">Value:</span>
        <span
          className={`popover-val-text ${isValid ? '' : 'is-unresolved'}`}
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {displayValue}
        </span>
      </div>
    </div>
  )
}

