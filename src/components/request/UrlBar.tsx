import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  Code,
  Columns2,
  Copy,
  Rows2,
  Save,
  Send,
  StopCircle,
  Terminal,
} from 'lucide-react'
import type { EnvironmentItem, HttpMethod, Mode, RequestItem, SplitLayout } from '../../types'
import { generateCurlCommand, parseCurlCommand } from '../../utils/curlHelper'
import { parseUrlToQueryParams, syncPathVariables } from '../../utils/urlHelper'
import { isTabDirty } from '../../utils/formatters'
import { TemplateUrlInput } from '../common/TemplateUrlInput'

interface UrlBarProps {
  activeTab: RequestItem
  activeEnvironment: EnvironmentItem | null
  previewUrl?: string
  splitLayout: SplitLayout
  onToggleSplitLayout: () => void
  onUpdateTab: (patch: Partial<RequestItem>) => void
  onImportCurl?: (parsed: Partial<RequestItem>) => void
  onSend: () => Promise<void>
  onCancel: () => void
  onSave: () => void
  onOpenImportCurlModal: () => void
  onOpenCodeSnippetModal: () => void
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'var(--method-get)',
  POST: 'var(--method-post)',
  PUT: 'var(--method-put)',
  PATCH: 'var(--method-patch)',
  DELETE: 'var(--method-delete)',
}

export function UrlBar({
  activeTab,
  activeEnvironment,
  splitLayout,
  onToggleSplitLayout,
  onUpdateTab,
  onImportCurl,
  onSend,
  onCancel,
  onSave,
  onOpenImportCurlModal,
  onOpenCodeSnippetModal,
}: UrlBarProps) {
  const [copiedCurl, setCopiedCurl] = useState(false)

  const handleUrlChange = (newUrl: string) => {
    const trimmed = newUrl.trim()
    if (
      trimmed.toLowerCase().startsWith('curl') ||
      trimmed.startsWith('$ curl') ||
      trimmed.startsWith('> curl') ||
      trimmed.startsWith('PS > curl')
    ) {
      const parsed = parseCurlCommand(trimmed)
      if (parsed) {
        if (onImportCurl) {
          onImportCurl(parsed)
        } else {
          onUpdateTab(parsed)
        }
        return
      }
    }

    const { params } = parseUrlToQueryParams(newUrl, activeTab.params)
    const pathVariables = syncPathVariables(newUrl, activeTab.pathVariables)
    onUpdateTab({
      url: newUrl,
      params,
      pathVariables,
    })
  }

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    const trimmed = text.trim()
    if (
      trimmed.toLowerCase().startsWith('curl') ||
      trimmed.startsWith('$ curl') ||
      trimmed.startsWith('> curl') ||
      trimmed.startsWith('PS > curl')
    ) {
      const parsed = parseCurlCommand(trimmed)
      if (parsed) {
        e.preventDefault()
        if (onImportCurl) {
          onImportCurl(parsed)
        } else {
          onUpdateTab(parsed)
        }
      }
    }
  }

  const handleCopyAsCurl = async () => {
    const curl = generateCurlCommand(activeTab, activeEnvironment)
    await navigator.clipboard.writeText(curl)
    setCopiedCurl(true)
    setTimeout(() => setCopiedCurl(false), 1500)
  }

  return (
    <div className="request-topbar">
      {/* Top Header Row */}
      <div className="row-between wrap" style={{ marginBottom: 8 }}>
        <div className="row wrap" style={{ gap: 8 }}>
          <input
            className="input input-sm"
            value={activeTab.name}
            onChange={(event) => onUpdateTab({ name: event.target.value })}
            aria-label="Request name"
            style={{ maxWidth: 220, fontWeight: 700, height: 26 }}
          />

          <div className="segmented" role="tablist" aria-label="Request mode">
            {(['REST', 'GRAPHQL'] as Mode[]).map((mode) => (
              <button
                key={mode}
                className={`segment-button ${activeTab.mode === mode ? 'is-active' : ''}`}
                onClick={() =>
                  onUpdateTab({
                    mode,
                    method: mode === 'GRAPHQL' ? 'POST' : activeTab.method,
                    editorTab: mode === 'GRAPHQL' ? 'BODY' : 'PARAMS',
                  })
                }
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="row wrap" style={{ gap: 4 }}>
          <button
            type="button"
            className="button button-sm"
            onClick={onOpenCodeSnippetModal}
            title="Generate Code Snippet"
          >
            <Code size={12} />
            <span>Code</span>
          </button>

          <button
            type="button"
            className="button button-sm"
            onClick={onOpenImportCurlModal}
            title="Import cURL command"
          >
            <Terminal size={12} />
            <span>Import cURL</span>
          </button>

          <button
            type="button"
            className="button button-sm"
            onClick={() => void handleCopyAsCurl()}
            title="Copy as cURL"
          >
            {copiedCurl ? (
              <>
                <Check size={12} style={{ color: 'var(--success)' }} />
                <span style={{ color: 'var(--success)' }}>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy cURL</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="icon-button icon-button-sm"
            onClick={onToggleSplitLayout}
            title={
              splitLayout === 'horizontal'
                ? 'Switch to Top-Bottom Layout'
                : 'Switch to Side-by-Side Layout'
            }
          >
            {splitLayout === 'horizontal' ? <Rows2 size={13} /> : <Columns2 size={13} />}
          </button>
        </div>
      </div>

      {/* Main URL Bar Row */}
      <div className="row" style={{ gap: 4 }}>
        {activeTab.mode === 'REST' && (
          <select
            className="select"
            value={activeTab.method}
            onChange={(event) =>
              onUpdateTab({ method: event.target.value as HttpMethod })
            }
            aria-label="HTTP method"
            style={{
              width: 88,
              fontWeight: 800,
              color: METHOD_COLORS[activeTab.method],
              fontFamily: 'var(--font-mono)',
            }}
          >
            {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        )}

        <TemplateUrlInput
          value={activeTab.url}
          onChange={handleUrlChange}
          onPaste={handleUrlPaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !activeTab.loading) {
              e.preventDefault()
              void onSend()
            }
          }}
          placeholder={
            activeTab.mode === 'GRAPHQL'
              ? '{{Domain}}/graphql'
              : '{{Domain}}/api/v1/resource (or paste cURL)'
          }
          environment={activeEnvironment}
          pathVariables={activeTab.pathVariables}
          ariaLabel="Request URL"
        />

        {activeTab.loading ? (
          <button onClick={onCancel} className="button button-danger" style={{ minWidth: 78 }}>
            <StopCircle size={13} />
            Cancel
          </button>
        ) : (
          <button onClick={() => void onSend()} className="button button-primary" style={{ minWidth: 78 }}>
            <Send size={13} />
            Send
          </button>
        )}

        <button
          onClick={onSave}
          className={`button ${activeTab.isDirty ?? isTabDirty(activeTab) ? 'button-save-dirty' : ''}`}
          style={{ minWidth: 64, position: 'relative' }}
          title={activeTab.isDirty ?? isTabDirty(activeTab) ? 'Save changes (Ctrl+S)' : 'Save request'}
        >
          <Save size={13} />
          <span>Save</span>
          {(activeTab.isDirty ?? isTabDirty(activeTab)) && <span className="save-dirty-dot" />}
        </button>
      </div>

      {/* Error Banners */}

      {activeTab.clientError && (
        <div className="banner banner-danger" style={{ marginTop: 8 }}>
          <AlertTriangle size={14} />
          {activeTab.clientError}
        </div>
      )}
    </div>
  )
}

