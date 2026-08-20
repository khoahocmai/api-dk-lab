interface StatusBadgeProps {
  status?: number
  statusText?: string
  isNetworkError?: boolean
}

export function StatusBadge({ status, statusText, isNetworkError }: StatusBadgeProps) {
  if (status === 0 || isNetworkError) {
    return (
      <span
        className="badge badge-5xx"
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 750,
        }}
        title="Could not connect to server"
      >
        Error (0)
      </span>
    )
  }

  if (!status) return null

  const getStatusClass = (code: number) => {
    if (code >= 200 && code < 300) return 'badge-2xx'
    if (code >= 300 && code < 400) return 'badge-3xx'
    if (code >= 400 && code < 500) return 'badge-4xx'
    if (code >= 500) return 'badge-5xx'
    return 'badge'
  }

  const statusLabel = `${status} ${statusText ? statusText : ''}`.trim()

  return (
    <span
      className={`badge ${getStatusClass(status)}`}
      style={{ fontFamily: 'var(--font-mono)', fontWeight: 750 }}
    >
      {statusLabel}
    </span>
  )
}
