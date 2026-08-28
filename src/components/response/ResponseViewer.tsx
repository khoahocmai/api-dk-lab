import { AlertTriangle, Check, Copy, FlaskConical, WifiOff, WrapText } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { EnvironmentItem, RequestItem } from '../../types'
import { resolveTemplates } from '../../services/templateService'
import { CodeEditor } from '../common/CodeEditor'
import { StatusBadge } from './StatusBadge'
import { TestResultsViewer } from './TestResultsViewer'

interface ResponseViewerProps {
  activeTab: RequestItem
  activeEnvironment?: EnvironmentItem | null
  editorFontSize?: number
  onUpdateTab: (patch: Partial<RequestItem>) => void
  onCopyResponse: () => Promise<void>
}

export function ResponseViewer({
  activeTab,
  activeEnvironment,
  editorFontSize,
  onUpdateTab,
  onCopyResponse,
}: ResponseViewerProps) {
  const [copiedResponse, setCopiedResponse] = useState(false)
  const [copiedHeaders, setCopiedHeaders] = useState(false)
  const [isWrapEnabled, setIsWrapEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('api_lab_response_wrap_lines')
    return saved !== null ? saved === 'true' : true
  })

  const toggleWrap = () => {
    setIsWrapEnabled((prev) => {
      const next = !prev
      localStorage.setItem('api_lab_response_wrap_lines', String(next))
      return next
    })
  }

  const handleCopy = async () => {
    await onCopyResponse()
    setCopiedResponse(true)
    setTimeout(() => setCopiedResponse(false), 2000)
  }

  const handleCopyHeaders = async () => {
    if (!activeTab.response?.headers) return
    await navigator.clipboard.writeText(
      JSON.stringify(activeTab.response.headers, null, 2),
    )
    setCopiedHeaders(true)
    setTimeout(() => setCopiedHeaders(false), 2000)
  }

  const isNetworkError = Boolean(
    activeTab.response?.isNetworkError ||
      activeTab.response?.status === 0 ||
      (!activeTab.response?.status && activeTab.response?.error && !activeTab.response?.data),
  )

  // Extract server error or notice message to display in the dedicated alert banner
  const serverErrorMessage = useMemo(() => {
    if (!activeTab.response || isNetworkError) return null
    const { data, status, statusText, error } = activeTab.response

    // Only extract when there's an HTTP error (>= 400) or error payload
    if (status && status < 400 && !error) return null

    if (data && typeof data === 'object') {
      const payload = data as Record<string, any>
      // 1. payload.message
      if (typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message.trim()
      }
      // 2. payload.responseStatus.message (e.g. ServiceStack / KiotViet)
      if (
        payload.responseStatus &&
        typeof payload.responseStatus.message === 'string' &&
        payload.responseStatus.message.trim()
      ) {
        return payload.responseStatus.message.trim()
      }
      // 3. payload.error
      if (typeof payload.error === 'string' && payload.error.trim()) {
        return payload.error.trim()
      }
      if (
        payload.error &&
        typeof payload.error.message === 'string' &&
        payload.error.message.trim()
      ) {
        return payload.error.message.trim()
      }
      // 4. GraphQL errors
      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        const firstErr = payload.errors[0]
        if (typeof firstErr === 'string' && firstErr.trim()) return firstErr.trim()
        if (firstErr && typeof firstErr.message === 'string' && firstErr.message.trim()) {
          return firstErr.message.trim()
        }
      }
      // 5. payload.detail or payload.title
      if (typeof payload.detail === 'string' && payload.detail.trim()) {
        return payload.detail.trim()
      }
      if (
        typeof payload.title === 'string' &&
        payload.title.trim() &&
        payload.title !== 'Bad Request' &&
        payload.title !== 'Unauthorized'
      ) {
        return payload.title.trim()
      }
    }

    // 6. If statusText has a descriptive sentence from backend
    if (statusText && statusText.trim() && statusText.length > 18) {
      return statusText.trim()
    }

    // 7. If response.error string exists
    if (error && typeof error === 'string' && error.trim() && !error.includes('[object Object]')) {
      return error.trim()
    }

    return null
  }, [activeTab.response, isNetworkError])

  const resolvedUrl = resolveTemplates(activeTab.url || '', activeEnvironment)

  const rawContent =
    typeof activeTab.response?.data === 'string'
      ? activeTab.response.data
      : JSON.stringify(
          activeTab.response?.data ?? activeTab.response?.details ?? '',
          null,
          2,
        )

  const headersObject = activeTab.response?.headers || {}
  const headerKeys = Object.keys(headersObject)
  const testReport = activeTab.testResults

  return (
    <section className="response-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* 1. TOP SUB-TABS HEADER: Pretty JSON | Headers | Test Results */}
      <div className="section-header" style={{ flexShrink: 0 }}>
        <div className="row wrap">
          <button
            type="button"
            className={`editor-tab ${activeTab.responseTab === 'PRETTY' ? 'is-active' : ''}`}
            onClick={() => onUpdateTab({ responseTab: 'PRETTY' })}
          >
            Pretty JSON
          </button>
          <button
            type="button"
            className={`editor-tab ${activeTab.responseTab === 'HEADERS' ? 'is-active' : ''}`}
            onClick={() => onUpdateTab({ responseTab: 'HEADERS' })}
          >
            Headers {headerKeys.length > 0 && <span className="tab-counter">{headerKeys.length}</span>}
          </button>
          <button
            type="button"
            className={`editor-tab ${activeTab.responseTab === 'TESTS' ? 'is-active' : ''}`}
            onClick={() => onUpdateTab({ responseTab: 'TESTS' })}
          >
            <FlaskConical size={12} />
            Test Results {testReport && testReport.total > 0 && (
              <span className="tab-counter">
                {testReport.passed}/{testReport.total}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. DEDICATED METRICS & ACTIONS TOOLBAR (1 HÀNG PHẲNG) */}
      {activeTab.response && !activeTab.loading && (
        <div
          className="response-toolbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            background: 'var(--bg-input)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
            gap: 8,
          }}
        >
          {/* Left metrics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
            <StatusBadge
              status={activeTab.response?.status}
              statusText={activeTab.response?.statusText}
              isNetworkError={isNetworkError}
            />
            <span className="badge" style={{ fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
              {activeTab.response?.time ?? '-'}
            </span>
            <span className="badge" style={{ fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
              {activeTab.response?.size ?? '-'}
            </span>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {!isNetworkError && activeTab.responseTab === 'PRETTY' && (
              <button
                type="button"
                className={`button button-sm ${isWrapEnabled ? 'button-wrap-active' : ''}`}
                onClick={toggleWrap}
                title={isWrapEnabled ? 'Disable line wrapping' : 'Enable line wrapping'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  height: 24,
                  padding: '0 8px',
                  fontSize: 11,
                }}
              >
                <WrapText size={12} />
                <span>Wrap</span>
              </button>
            )}

            {!isNetworkError && (
              activeTab.responseTab === 'HEADERS' && headerKeys.length > 0 ? (
                <button
                  type="button"
                  className="button button-sm"
                  onClick={() => void handleCopyHeaders()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    height: 24,
                    padding: '0 8px',
                    fontSize: 11,
                  }}
                >
                  {copiedHeaders ? <Check size={12} /> : <Copy size={12} />}
                  <span>Copy Headers</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="button button-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    height: 24,
                    padding: '0 8px',
                    fontSize: 11,
                  }}
                >
                  {copiedResponse ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                  <span>{copiedResponse ? 'Copied' : 'Copy'}</span>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* 3. CONTENT AREA */}
      <div className="scroll-area" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab.loading ? (
          <div className="response-empty">
            <div className="spinner" style={{ width: 22, height: 22, marginBottom: 8 }} />
            <div>Sending request to server...</div>
          </div>
        ) : !activeTab.response ? (
          <div className="response-empty">
            Nhấn <strong>Send</strong> (hoặc <code>Cmd/Ctrl + Enter</code>) để gửi request.
          </div>
        ) : isNetworkError && activeTab.responseTab === 'PRETTY' ? (
          /* NETWORK ERROR / SERVER OFFLINE BANNER */
          <div style={{ padding: '24px 20px', maxWidth: 640, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--danger)',
                  flexShrink: 0,
                }}
              >
                <WifiOff size={22} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--text-primary)', marginBottom: 2 }}>
                  Could not get any response
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  There was an error connecting to{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-bright)' }}>
                    {resolvedUrl || 'the server'}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message Details Box */}
            {activeTab.response.error && (
              <div
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 6,
                  padding: '10px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: '#f87171',
                  marginBottom: 16,
                  wordBreak: 'break-all',
                }}
              >
                <strong>Error:</strong> {activeTab.response.error}
              </div>
            )}

            {/* Common Causes & Troubleshooting */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '14px 16px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                Common causes & troubleshooting:
              </div>
              <ul
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  paddingLeft: 18,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <li>
                  <strong>The server is offline:</strong> Check if your backend server (e.g. Express, NestJS, FastAPI, Spring Boot) is running locally.
                </li>
                <li>
                  <strong>Incorrect URL, Protocol or Port:</strong> Verify that the host and port in the URL match your running service.
                </li>
                <li>
                  <strong>Firewall or Network issue:</strong> Ensure no proxy, VPN, or firewall is blocking the connection.
                </li>
                <li>
                  <strong>SSL Certificate:</strong> If using self-signed HTTPS, check <em>Reject Unauthorized SSL</em> in App Settings.
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            {activeTab.response.previewTruncated && (
              <div className="banner banner-warning" style={{ margin: '6px 10px' }}>
                Response payload lớn (&gt;1MB) đã được cắt ngắn để đảm bảo hiệu năng.
              </div>
            )}

            {/* ALERT BANNER: FULL ERROR / NOTICE MESSAGE FROM SERVER */}
            {serverErrorMessage && activeTab.responseTab === 'PRETTY' && (
              <div
                style={{
                  margin: '10px 12px 6px 12px',
                  padding: '8px 12px',
                  borderRadius: 4,
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: 12,
                  color: '#fcd34d',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.5,
                }}
              >
                <AlertTriangle
                  size={14}
                  style={{
                    color: '#f59e0b',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <span style={{ flex: 1, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                  {serverErrorMessage}
                </span>
              </div>
            )}

            {/* PRETTY TAB */}
            {activeTab.responseTab === 'PRETTY' && (
              <CodeEditor
                value={rawContent}
                language="json"
                readOnly
                height="100%"
                minHeight="350px"
                fontSize={editorFontSize}
                wrapLines={isWrapEnabled}
              />
            )}

            {/* HEADERS TAB */}
            {activeTab.responseTab === 'HEADERS' && (
              <div style={{ padding: 10 }}>
                {headerKeys.length === 0 ? (
                  <div className="meta-text" style={{ fontStyle: 'italic', padding: 6 }}>
                    No response headers received.
                  </div>
                ) : (
                  <table className="headers-table">
                    <thead>
                      <tr>
                        <th>Header</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {headerKeys.map((key) => {
                        const val = headersObject[key]
                        const displayVal = Array.isArray(val) ? val.join(', ') : String(val)
                        return (
                          <tr key={key}>
                            <td className="hdr-key">{key}</td>
                            <td className="hdr-val">{displayVal}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TESTS RESULTS TAB */}
            {activeTab.responseTab === 'TESTS' && (
              <TestResultsViewer report={activeTab.testResults} />
            )}
          </>
        )}
      </div>
    </section>
  )
}
