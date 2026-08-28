interface StatusBadgeProps {
  status?: number
  statusText?: string
  isNetworkError?: boolean
}

const HTTP_STATUS_PHRASES: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
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

  // Use concise standard HTTP status phrase on toolbar badge
  const phrase =
    HTTP_STATUS_PHRASES[status] ||
    (statusText && statusText.length <= 18 ? statusText : '')

  const statusLabel = `${status} ${phrase}`.trim()

  return (
    <span
      className={`badge ${getStatusClass(status)}`}
      style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 750,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
      title={statusText ? `${status} ${statusText}` : statusLabel}
    >
      {statusLabel}
    </span>
  )
}
