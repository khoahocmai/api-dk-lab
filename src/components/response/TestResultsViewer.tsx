import { CheckCircle2, FlaskConical, Variable, XCircle } from 'lucide-react'
import type { TestRunReport } from '../../types'

interface TestResultsViewerProps {
  report: TestRunReport | null
}

export function TestResultsViewer({ report }: TestResultsViewerProps) {
  if (!report || report.total === 0) {
    return (
      <div className="response-empty" style={{ minHeight: 220 }}>
        <FlaskConical size={24} style={{ opacity: 0.5, marginBottom: 8 }} />
        No test assertions were executed for this request.
        <div className="meta-text" style={{ marginTop: 6 }}>
          Add test scripts under the <strong>Tests</strong> tab to automate assertions.
        </div>
      </div>
    )
  }

  const allPassed = report.failed === 0
  const envKeys = Object.keys(report.envMutations)

  return (
    <div className="test-results-container stack" style={{ padding: 16, gap: 14 }}>
      <div className="row-between wrap" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span className="caps">Test Summary:</span>
          <span
            className={`badge-status-mini ${allPassed ? 'badge-2xx' : 'badge-5xx'}`}
            style={{ fontSize: 12, padding: '3px 8px' }}
          >
            {report.passed} / {report.total} Passed
          </span>
        </div>

        {envKeys.length > 0 && (
          <div className="row" style={{ gap: 6, color: 'var(--primary-bright)', fontSize: 12, fontWeight: 750 }}>
            <Variable size={14} />
            <span>Updated {envKeys.length} Environment Variable(s)</span>
          </div>
        )}
      </div>

      <div className="stack" style={{ gap: 8 }}>
        {report.results.map((res) => (
          <div
            key={res.id}
            className={`test-result-card ${res.passed ? 'is-passed' : 'is-failed'}`}
          >
            <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
              {res.passed ? (
                <CheckCircle2 size={16} style={{ color: 'var(--success)', marginTop: 2 }} />
              ) : (
                <XCircle size={16} style={{ color: 'var(--danger)', marginTop: 2 }} />
              )}
              <div className="stack" style={{ gap: 3, flex: 1 }}>
                <div style={{ fontWeight: 750, fontSize: 13, color: res.passed ? 'var(--text)' : '#fca5a5' }}>
                  {res.name}
                </div>
                {res.error && (
                  <div className="test-error-message">
                    {res.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {envKeys.length > 0 && (
        <div className="stack" style={{ marginTop: 8, gap: 6, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div className="caps">Mutated Environment Variables</div>
          <div className="stack" style={{ gap: 4 }}>
            {envKeys.map((k) => (
              <div key={k} className="row" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                <span style={{ color: 'var(--primary-bright)' }}>{k}</span>
                <span style={{ color: 'var(--text-faint)' }}>=</span>
                <span style={{ color: 'var(--text-soft)' }}>{report.envMutations[k]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
