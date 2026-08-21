import { useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  RefreshCw,
  Trash2,
  Wand2,
} from 'lucide-react'
import type { BodyType, EnvironmentItem, KeyValueRow, RequestItem } from '../../types'
import {
  buildUrlWithQueryParams,
  convertRowsToHeadersJson,
} from '../../utils/urlHelper'
import { formatJsonSafely } from '../../utils/formatters'
import { CodeEditor } from '../common/CodeEditor'
import { KeyValueTable } from './KeyValueTable'
import { AuthEditor } from './AuthEditor'
import { TestScriptEditor } from './TestScriptEditor'

interface RequestEditorProps {
  activeTab: RequestItem
  editorFontSize?: number
  environment?: EnvironmentItem | null
  onUpdateTab: (patch: Partial<RequestItem>) => void
  onFormat: () => void
  onClear: () => void
  onSyncToExplorer?: () => { success: boolean; error?: string }
}

export function RequestEditor({
  activeTab,
  editorFontSize,
  environment,
  onUpdateTab,
  onFormat,
  onClear,
  onSyncToExplorer,
}: RequestEditorProps) {
  const [isSynced, setIsSynced] = useState(false)
  const [isVariablesOpen, setIsVariablesOpen] = useState<boolean>(true)
  const isGraphQL = activeTab.mode === 'GRAPHQL'
  const isGetOrDelete = ['GET', 'DELETE'].includes(activeTab.method)

  const isQueryTabActive =
    activeTab.editorTab === 'BODY' || (isGraphQL && activeTab.editorTab === 'VARIABLES')

  const handleSyncClick = () => {
    if (!onSyncToExplorer) return
    const result = onSyncToExplorer()
    if (result.success) {
      setIsSynced(true)
      setTimeout(() => setIsSynced(false), 1200)
    }
  }

  const handleFormatVariables = () => {
    if (!activeTab.gqlVariables) return
    const formatted = formatJsonSafely(activeTab.gqlVariables)
    onUpdateTab({ gqlVariables: formatted })
  }

  const handleClearVariables = () => {
    onUpdateTab({ gqlVariables: '{}' })
  }

  // 2-way sync: Params change -> update URL
  const handleParamsChange = (newParams: KeyValueRow[]) => {
    const updatedUrl = buildUrlWithQueryParams(activeTab.url, newParams)
    onUpdateTab({
      params: newParams,
      url: updatedUrl,
    })
  }

  // Sync Headers list -> headersText
  const handleHeadersChange = (newHeaders: KeyValueRow[]) => {
    const jsonText = convertRowsToHeadersJson(newHeaders)
    onUpdateTab({
      headersList: newHeaders,
      headersText: jsonText,
    })
  }

  const handleBodyTypeChange = (type: BodyType) => {
    onUpdateTab({ bodyType: type })
  }

  const activeParamCount = (activeTab.params || []).filter((p) => p.enabled && p.key.trim()).length
  const activeHeaderCount = (activeTab.headersList || []).filter((h) => h.enabled && h.key.trim()).length
  const hasAuth = activeTab.auth && activeTab.auth.type !== 'none'
  const hasTestScript = Boolean(activeTab.testScript && activeTab.testScript.trim())

  return (
    <div className="request-editor" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* 1. HÀNG SUB-TABS TRÊN CÙNG (CỐ ĐỊNH) */}
      <div className="section-header" style={{ flexShrink: 0 }}>
        <div className="row wrap">
          {isGraphQL ? (
            /* GraphQL Mode Tab Order: Query -> Headers -> Auth -> Tests */
            <>
              <button
                type="button"
                onClick={() => onUpdateTab({ editorTab: 'BODY' })}
                className={`editor-tab ${isQueryTabActive ? 'is-active' : ''}`}
              >
                Query
              </button>

              <button
                type="button"
                onClick={() => onUpdateTab({ editorTab: 'HEADERS' })}
                className={`editor-tab ${activeTab.editorTab === 'HEADERS' ? 'is-active' : ''}`}
              >
                Headers {activeHeaderCount > 0 && <span className="tab-counter">{activeHeaderCount}</span>}
              </button>

              <button
                type="button"
                onClick={() => onUpdateTab({ editorTab: 'AUTH' })}
                className={`editor-tab ${activeTab.editorTab === 'AUTH' ? 'is-active' : ''}`}
              >
                Auth {hasAuth && <span className="tab-counter">✓</span>}
              </button>

              <button
                type="button"
                onClick={() => onUpdateTab({ editorTab: 'TESTS' })}
                className={`editor-tab ${activeTab.editorTab === 'TESTS' ? 'is-active' : ''}`}
              >
                Tests {hasTestScript && <span className="tab-counter"><FlaskConical size={10} /></span>}
              </button>
            </>
          ) : (
            /* REST Mode Tab Order: Params -> Body -> Headers -> Auth -> Tests */
            <>
              <button
                type="button"
                onClick={() => onUpdateTab({ editorTab: 'PARAMS' })}
                className={`editor-tab ${activeTab.editorTab === 'PARAMS' ? 'is-active' : ''}`}
              >
                Params {activeParamCount > 0 && <span className="tab-counter">{activeParamCount}</span>}
              </button>

              <button
                type="button"
                onClick={() => onUpdateTab({ editorTab: 'BODY' })}
                className={`editor-tab ${activeTab.editorTab === 'BODY' ? 'is-active' : ''}`}
              >
                Body
              </button>

              <button
                type="button"
                onClick={() => onUpdateTab({ editorTab: 'HEADERS' })}
                className={`editor-tab ${activeTab.editorTab === 'HEADERS' ? 'is-active' : ''}`}
              >
                Headers {activeHeaderCount > 0 && <span className="tab-counter">{activeHeaderCount}</span>}
              </button>

              <button
                type="button"
                onClick={() => onUpdateTab({ editorTab: 'AUTH' })}
                className={`editor-tab ${activeTab.editorTab === 'AUTH' ? 'is-active' : ''}`}
              >
                Auth {hasAuth && <span className="tab-counter">✓</span>}
              </button>

              <button
                type="button"
                onClick={() => onUpdateTab({ editorTab: 'TESTS' })}
                className={`editor-tab ${activeTab.editorTab === 'TESTS' ? 'is-active' : ''}`}
              >
                Tests {hasTestScript && <span className="tab-counter"><FlaskConical size={10} /></span>}
              </button>
            </>
          )}
        </div>

        {/* REST mode Toolbar buttons */}
        {!isGraphQL && (
          <div className="row wrap">
            {activeTab.editorTab === 'BODY' && activeTab.bodyType === 'json' && (
              <button onClick={onFormat} className="button button-sm" type="button">
                <Wand2 size={13} />
                Format
              </button>
            )}
            <button onClick={onClear} className="button button-sm" type="button">
              <Trash2 size={13} />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* 2. NỘI DUNG CHÍNH (BẮT BUỘC CHIẾM TRỌN DIỆN TÍCH flex-1 min-h-0) */}
      <div className="editor-body" style={{ flex: '1 1 0%', minHeight: 0, height: '100%', width: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        
        {/* GRAPHQL UNIFIED QUERY & VARIABLES PANE */}
        {isGraphQL && isQueryTabActive && (
          <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minHeight: 0, overflow: 'hidden' }}>
            
            {/* TOOLBAR TRÊN (Format, Sync, Clear) - CỐ ĐỊNH */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #232736', background: '#141720' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
                GRAPHQL QUERY / MUTATION
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={onFormat} className="button button-sm" type="button">
                  <Wand2 size={12} />
                  <span>Format</span>
                </button>
                {onSyncToExplorer && (
                  <button
                    onClick={handleSyncClick}
                    className={`button button-sm ${isSynced ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : ''}`}
                    title="Đồng bộ các trường trong Editor ngược lại cây chọn GraphQL Explorer bên trái"
                    type="button"
                  >
                    {isSynced ? <Check size={12} className="text-emerald-400" /> : <RefreshCw size={12} />}
                    <span>{isSynced ? 'Synced!' : 'Sync to Explorer'}</span>
                  </button>
                )}
                <button onClick={onClear} className="button button-sm" type="button">
                  <Trash2 size={12} />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* KHU VỰC SOẠN THẢO GRAPHQL QUERY (BUNG FULL CHIỀU CAO TRÊN + BẬT CUỘN NỘI BỘ) */}
            <div style={{ flex: '1 1 0%', minHeight: 0, width: '100%', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
                <CodeEditor
                  value={activeTab.gqlQuery || ''}
                  onChange={(val) => onUpdateTab({ gqlQuery: val })}
                  language="graphql"
                  placeholder="query { ... }"
                  height="100%"
                  minHeight="100%"
                  fontSize={editorFontSize}
                />
              </div>
            </div>

            {/* NGĂN KÉO VARIABLES DẠNG ACCORDION Ở ĐÁY */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', borderTop: '1px solid #232736', background: '#141720' }}>
              
              {/* THANH TOGGLE BAR CỦA VARIABLES (LUÔN HIỂN THỊ CỐ ĐỊNH ~32px) */}
              <div
                style={{ height: '32px', minHeight: '32px', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', background: '#141720' }}
                className="graphql-vars-header"
                onClick={() => setIsVariablesOpen(!isVariablesOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isVariablesOpen ? (
                    <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                  ) : (
                    <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
                  )}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Variables</span>
                  <span style={{ fontSize: '10px', color: '#34d399', background: 'rgba(52, 211, 153, 0.12)', padding: '1px 5px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>
                    JSON
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    title="Format JSON"
                    className="button button-xs"
                    onClick={handleFormatVariables}
                  >
                    Format
                  </button>
                  <button
                    type="button"
                    title="Clear JSON"
                    className="button button-xs"
                    onClick={handleClearVariables}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* KHUNG SOẠN THẢO JSON VARIABLES (HIỂN THỊ KHI OPEN - CỐ ĐỊNH 180PX + BẬT CUỘN NỘI BỘ) */}
              {isVariablesOpen && (
                <div style={{ height: '180px', minHeight: '180px', maxHeight: '180px', borderTop: '1px solid #232736', background: '#12141a', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
                    <CodeEditor
                      value={activeTab.gqlVariables || '{}'}
                      onChange={(val) => onUpdateTab({ gqlVariables: val })}
                      language="json"
                      placeholder="{\n  \n}"
                      height="100%"
                      minHeight="100%"
                      fontSize={editorFontSize}
                    />
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* PARAMS TAB (REST) */}
        {!isGraphQL && activeTab.editorTab === 'PARAMS' && (
          <div className="scroll-area" style={{ padding: '10px 12px' }}>
            <KeyValueTable
              rows={activeTab.params}
              onChange={handleParamsChange}
              keyPlaceholder="Parameter Key"
              valuePlaceholder="Parameter Value"
              descriptionPlaceholder="Description"
              title="Query Parameters"
              environment={environment}
            />
          </div>
        )}

        {/* HEADERS TAB */}
        {activeTab.editorTab === 'HEADERS' && (
          <div className="scroll-area" style={{ padding: '10px 12px' }}>
            <KeyValueTable
              rows={activeTab.headersList}
              onChange={handleHeadersChange}
              keyPlaceholder="Header Name (e.g. Content-Type)"
              valuePlaceholder="Header Value (e.g. application/json)"
              descriptionPlaceholder="Description"
              title="Request Headers"
              environment={environment}
            />
          </div>
        )}

        {/* AUTH TAB */}
        {activeTab.editorTab === 'AUTH' && (
          <div className="scroll-area" style={{ padding: '10px 12px' }}>
            <AuthEditor
              auth={activeTab.auth}
              onChange={(auth) => onUpdateTab({ auth })}
              environment={environment}
            />
          </div>
        )}

        {/* REST BODY TAB */}
        {!isGraphQL && activeTab.editorTab === 'BODY' && (
          <div className="stack" style={{ flex: 1, minHeight: 0, padding: '10px 12px', height: '100%', overflow: 'hidden' }}>
            <div className="row wrap" style={{ gap: 16, marginBottom: 8, flexShrink: 0 }}>
              <span className="caps" style={{ alignSelf: 'center' }}>Body Format:</span>
              <div className="segmented" role="radiogroup">
                {(['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw'] as BodyType[]).map(
                  (type) => (
                    <button
                      key={type}
                      className={`segment-button ${activeTab.bodyType === type ? 'is-active' : ''}`}
                      onClick={() => handleBodyTypeChange(type)}
                      disabled={isGetOrDelete && type !== 'none'}
                    >
                      {type === 'json'
                        ? 'raw JSON'
                        : type === 'raw'
                        ? 'raw Text'
                        : type}
                    </button>
                  ),
                )}
              </div>
            </div>

            {isGetOrDelete && activeTab.bodyType !== 'none' ? (
              <div className="response-empty">
                HTTP {activeTab.method} requests typically do not have a request body.
              </div>
            ) : activeTab.bodyType === 'none' ? (
              <div className="response-empty">This request does not have a body.</div>
            ) : activeTab.bodyType === 'json' ? (
              <div style={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                <CodeEditor
                  value={activeTab.restBody}
                  onChange={(val) => onUpdateTab({ restBody: val })}
                  language="json"
                  placeholder="{\n  \n}"
                  height="100%"
                  minHeight="100%"
                  fontSize={editorFontSize}
                />
              </div>
            ) : activeTab.bodyType === 'raw' ? (
              <div style={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                <CodeEditor
                  value={activeTab.rawText}
                  onChange={(val) => onUpdateTab({ rawText: val })}
                  language="text"
                  placeholder="Raw text payload..."
                  height="100%"
                  minHeight="100%"
                  fontSize={editorFontSize}
                />
              </div>
            ) : activeTab.bodyType === 'form-data' ? (
              <div className="scroll-area">
                <KeyValueTable
                  rows={activeTab.formData}
                  onChange={(rows) => onUpdateTab({ formData: rows })}
                  keyPlaceholder="Form Key"
                  valuePlaceholder="Form Value"
                  title="Multipart / Form-Data"
                  environment={environment}
                />
              </div>
            ) : (
              <div className="scroll-area">
                <KeyValueTable
                  rows={activeTab.urlencoded}
                  onChange={(rows) => onUpdateTab({ urlencoded: rows })}
                  keyPlaceholder="Urlencoded Key"
                  valuePlaceholder="Urlencoded Value"
                  title="x-www-form-urlencoded"
                  environment={environment}
                />
              </div>
            )}
          </div>
        )}

        {/* TESTS TAB */}
        {activeTab.editorTab === 'TESTS' && (
          <div className="stack" style={{ flex: 1, minHeight: 0, padding: '10px 12px', height: '100%' }}>
            <TestScriptEditor
              script={activeTab.testScript}
              onChange={(testScript) => onUpdateTab({ testScript })}
            />
          </div>
        )}
      </div>
    </div>
  )
}
