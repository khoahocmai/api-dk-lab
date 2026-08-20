import { useMemo, useState } from 'react'
import { Clock, Search, Trash2 } from 'lucide-react'
import type { HistoryItem } from '../../types'

interface HistoryListProps {
  history: HistoryItem[]
  onRestoreHistory: (item: HistoryItem) => void
  onDeleteHistoryItem: (id: string) => void
  onClearHistory: () => void
}

export function HistoryList({
  history,
  onRestoreHistory,
  onDeleteHistoryItem,
  onClearHistory,
}: HistoryListProps) {
  const [search, setSearch] = useState('')

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return history
    return history.filter(
      (item) =>
        item.url.toLowerCase().includes(q) ||
        item.method.toLowerCase().includes(q) ||
        String(item.status || '').includes(q),
    )
  }, [history, search])

  const groupedByDate = useMemo(() => {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    const groups: Record<string, HistoryItem[]> = {
      Today: [],
      Yesterday: [],
      Older: [],
    }

    filteredHistory.forEach((item) => {
      const itemDate = new Date(item.timestamp).toDateString()
      if (itemDate === today) {
        groups.Today.push(item)
      } else if (itemDate === yesterday) {
        groups.Yesterday.push(item)
      } else {
        groups.Older.push(item)
      }
    })

    return groups
  }, [filteredHistory])

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return ''
    }
  }

  const getStatusClass = (status?: number) => {
    if (!status) return 'badge-status-generic'
    if (status >= 200 && status < 300) return 'badge-2xx'
    if (status >= 300 && status < 400) return 'badge-3xx'
    if (status >= 400 && status < 500) return 'badge-4xx'
    if (status >= 500) return 'badge-5xx'
    return 'badge-status-generic'
  }

  return (
    <div className="history-list-section stack" style={{ gap: 6 }}>
      <div className="row-between">
        <div className="caps">Request History ({history.length})</div>
        <button
          type="button"
          className="button button-sm button-danger"
          onClick={onClearHistory}
          disabled={history.length === 0}
          title="Clear all history"
          style={{ height: 22, padding: '0 6px' }}
        >
          <Trash2 size={11} />
          Clear
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        <Search
          size={12}
          style={{ position: 'absolute', top: 7, left: 8, color: 'var(--text-dim)' }}
        />
        <input
          className="input input-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter history..."
          style={{ paddingLeft: 26 }}
        />
      </div>

      {filteredHistory.length === 0 ? (
        <div className="response-empty" style={{ minHeight: 140, fontStyle: 'italic' }}>
          <Clock size={16} style={{ marginBottom: 4, opacity: 0.4 }} />
          {history.length === 0 ? 'No requests sent yet.' : 'No matching history found.'}
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {Object.entries(groupedByDate).map(([groupTitle, items]) => {
            if (items.length === 0) return null

            return (
              <div key={groupTitle} className="history-group">
                <div className="caps" style={{ marginBottom: 4, opacity: 0.6, fontSize: 9 }}>
                  {groupTitle}
                </div>
                <div className="stack" style={{ gap: 2 }}>
                  {items.map((item) => (
                    <div key={item.id} className="history-item-row row-between">
                      <button
                        type="button"
                        className="history-item-button"
                        onClick={() => onRestoreHistory(item)}
                        title={`${item.method} ${item.url}`}
                      >
                        <div className="row" style={{ gap: 4 }}>
                          <span
                            className={`method-tag method-tag-sm ${
                              item.mode === 'GRAPHQL' ? 'method-graphql' : 'method-rest'
                            }`}
                          >
                            {item.method}
                          </span>
                          <span className="history-url">{item.url}</span>
                        </div>
                        <div className="row" style={{ gap: 4, marginTop: 1 }}>
                          {item.status ? (
                            <span className={`badge-status-mini ${getStatusClass(item.status)}`}>
                              {item.status}
                            </span>
                          ) : (
                            <span className="badge-status-mini badge-5xx">ERR</span>
                          )}
                          {item.duration !== undefined && (
                            <span className="meta-text" style={{ fontSize: 10 }}>{item.duration} ms</span>
                          )}
                          <span className="meta-text" style={{ fontSize: 10 }}>{formatTime(item.timestamp)}</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="icon-button icon-button-sm"
                        onClick={() => onDeleteHistoryItem(item.id)}
                        title="Delete from history"
                        style={{ width: 20, height: 20 }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
