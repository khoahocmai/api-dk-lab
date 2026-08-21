import { FlaskConical, Trash2, Wand2 } from 'lucide-react'
import type { BodyType, EnvironmentItem, KeyValueRow, RequestItem } from '../../types'
import {
  buildUrlWithQueryParams,
  convertRowsToHeadersJson,
} from '../../utils/urlHelper'
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
}

export function RequestEditor({
  activeTab,
  editorFontSize,
  environment,
  onUpdateTab,
  onFormat,
  onClear,
}: RequestEditorProps) {
  const isGraphQL = activeTab.mode === 'GRAPHQL'
  const isGetOrDelete = ['GET', 'DELETE'].includes(activeTab.method)

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
    <section className="request-editor">
      <div className="section-header">
        <div className="row wrap">
          {isGraphQL ? (
            /* GraphQL Mode Tab Order: Query -> Variables -> Headers -> Auth -> Tests */
            <>
              <button
                onClick={() => onUpdateTab({ editorTab: 'BODY' })}
                className={`editor-tab ${activeTab.editorTab === 'BODY' ? 'is-active' : ''}`}
              >
                Query
              </button>

              <button
                onClick={() => onUpdateTab({ editorTab: 'VARIABLES' })}
                className={`editor-tab ${activeTab.editorTab === 'VARIABLES' ? 'is-active' : ''}`}
              >
                Variables
              </button>

              <button
                onClick={() => onUpdateTab({ editorTab: 'HEADERS' })}
                className={`editor-tab ${activeTab.editorTab === 'HEADERS' ? 'is-active' : ''}`}
              >
                Headers {activeHeaderCount > 0 && <span className="tab-counter">{activeHeaderCount}</span>}
              </button>

              <button
                onClick={() => onUpdateTab({ editorTab: 'AUTH' })}
                className={`editor-tab ${activeTab.editorTab === 'AUTH' ? 'is-active' : ''}`}
              >
                Auth {hasAuth && <span className="tab-counter">✓</span>}
              </button>

              <button
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
                onClick={() => onUpdateTab({ editorTab: 'PARAMS' })}
                className={`editor-tab ${activeTab.editorTab === 'PARAMS' ? 'is-active' : ''}`}
              >
                Params {activeParamCount > 0 && <span className="tab-counter">{activeParamCount}</span>}
              </button>

              <button
                onClick={() => onUpdateTab({ editorTab: 'BODY' })}
                className={`editor-tab ${activeTab.editorTab === 'BODY' ? 'is-active' : ''}`}
              >
                Body
              </button>

              <button
                onClick={() => onUpdateTab({ editorTab: 'HEADERS' })}
                className={`editor-tab ${activeTab.editorTab === 'HEADERS' ? 'is-active' : ''}`}
              >
                Headers {activeHeaderCount > 0 && <span className="tab-counter">{activeHeaderCount}</span>}
              </button>

              <button
                onClick={() => onUpdateTab({ editorTab: 'AUTH' })}
                className={`editor-tab ${activeTab.editorTab === 'AUTH' ? 'is-active' : ''}`}
              >
                Auth {hasAuth && <span className="tab-counter">✓</span>}
              </button>

              <button
                onClick={() => onUpdateTab({ editorTab: 'TESTS' })}
                className={`editor-tab ${activeTab.editorTab === 'TESTS' ? 'is-active' : ''}`}
              >
                Tests {hasTestScript && <span className="tab-counter"><FlaskConical size={10} /></span>}
              </button>
            </>
          )}
        </div>

        <div className="row wrap">
          {activeTab.editorTab === 'BODY' && (!isGraphQL ? activeTab.bodyType === 'json' : true) && (
            <button onClick={onFormat} className="button button-sm">
              <Wand2 size={13} />
              Format
            </button>
          )}
          {activeTab.editorTab === 'VARIABLES' && (
            <button onClick={onFormat} className="button button-sm">
              <Wand2 size={13} />
              Format
            </button>
          )}
          <button onClick={onClear} className="button button-sm">
            <Trash2 size={13} />
            Clear
          </button>
        </div>
      </div>

      <div className="editor-body">
        {/* PARAMS TAB */}
        {activeTab.editorTab === 'PARAMS' && (
          <div className="scroll-area">
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
          <div className="scroll-area">
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
          <div className="scroll-area">
            <AuthEditor
              auth={activeTab.auth}
              onChange={(auth) => onUpdateTab({ auth })}
              environment={environment}
            />
          </div>
        )}

        {/* BODY TAB */}
        {activeTab.editorTab === 'BODY' && (
          <>
            {isGraphQL ? (
              <div className="stack" style={{ flex: 1, minHeight: 0 }}>
                <div className="caps">GraphQL Query / Mutation</div>
                <CodeEditor
                  value={activeTab.gqlQuery}
                  onChange={(val) => onUpdateTab({ gqlQuery: val })}
                  language="graphql"
                  placeholder="query { ... }"
                  height="100%"
                  minHeight="320px"
                  fontSize={editorFontSize}
                />
              </div>
            ) : (
              <div className="stack" style={{ flex: 1, minHeight: 0 }}>
                <div className="row wrap" style={{ gap: 16, marginBottom: 8 }}>
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
                  <CodeEditor
                    value={activeTab.restBody}
                    onChange={(val) => onUpdateTab({ restBody: val })}
                    language="json"
                    placeholder="{\n  \n}"
                    height="100%"
                    minHeight="320px"
                    fontSize={editorFontSize}
                  />
                ) : activeTab.bodyType === 'raw' ? (
                  <CodeEditor
                    value={activeTab.rawText}
                    onChange={(val) => onUpdateTab({ rawText: val })}
                    language="text"
                    placeholder="Raw text payload..."
                    height="100%"
                    minHeight="320px"
                    fontSize={editorFontSize}
                  />
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
          </>
        )}

        {/* VARIABLES TAB (GraphQL) */}
        {activeTab.editorTab === 'VARIABLES' && (
          <div className="stack" style={{ flex: 1, minHeight: 0 }}>
            <div className="caps">GraphQL JSON Variables</div>
            <CodeEditor
              value={activeTab.gqlVariables}
              onChange={(val) => onUpdateTab({ gqlVariables: val })}
              language="json"
              placeholder="{\n  \n}"
              height="100%"
              minHeight="320px"
              fontSize={editorFontSize}
            />
          </div>
        )}

        {/* TESTS TAB */}
        {activeTab.editorTab === 'TESTS' && (
          <div className="stack" style={{ flex: 1, minHeight: 0 }}>
            <TestScriptEditor
              script={activeTab.testScript}
              onChange={(testScript) => onUpdateTab({ testScript })}
            />
          </div>
        )}
      </div>
    </section>
  )
}
