interface GraphTypeBadgeProps {
  typeLabel: string
}

export function GraphTypeBadge({ typeLabel }: GraphTypeBadgeProps) {
  if (!typeLabel) return null

  const isList = typeLabel.includes('[')
  const isNonNull = typeLabel.includes('!')
  const baseType = typeLabel.replace(/[[\]!]/g, '').trim()

  let colorClass = 'type-badge-object'
  if (baseType === 'String' || baseType === 'ID') {
    colorClass = 'type-badge-string'
  } else if (baseType === 'Int' || baseType === 'Float') {
    colorClass = 'type-badge-number'
  } else if (baseType === 'Boolean') {
    colorClass = 'type-badge-boolean'
  }

  return (
    <span className={`graph-type-badge ${colorClass}`} title={typeLabel}>
      {isList && <span className="type-bracket">[</span>}
      <span className="type-base">{baseType}</span>
      {typeLabel.includes('!]') && <span className="type-nonnull">!</span>}
      {isList && <span className="type-bracket">]</span>}
      {isNonNull && (typeLabel.endsWith('!') || !isList) && (
        <span className="type-nonnull">!</span>
      )}
    </span>
  )
}
