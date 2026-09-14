import { useEffect, useState } from 'react'
import {
  FileText,
  FlaskConical,
  PanelRightClose,
  PlayCircle,
  Plus,
  Trash2,
  Wand2,
  Zap,
} from 'lucide-react'
import { CodeEditor } from '../common/CodeEditor'

const SNIPPETS_COLLAPSED_KEY = 'scripts_snippets_collapsed'

interface ScriptSnippet {
  title: string
  description: string
  code: string
}

const PRE_REQUEST_SNIPPETS: ScriptSnippet[] = [
  {
    title: 'Set an environment variable',
    description: 'Set a key-value pair in active environment',
    code: `pm.environment.set("variable_key", "variable_value");`,
  },
  {
    title: 'Get an environment variable',
    description: 'Read an environment variable value',
    code: `const val = pm.environment.get("variable_key");`,
  },
  {
    title: 'Generate Timestamp (ISO)',
    description: 'Save current ISO timestamp to environment',
    code: `pm.environment.set("timestamp", new Date().toISOString());`,
  },
  {
    title: 'Generate Random UUID / Nonce',
    description: 'Create unique random string token',
    code: `pm.environment.set("nonce", Math.random().toString(36).substring(2, 10) + Date.now().toString(36));`,
  },
  {
    title: 'Add Request Header',
    description: 'Append or set dynamic request header',
    code: `pm.request.headers.add({ key: "X-Timestamp", value: new Date().toISOString() });`,
  },
  {
    title: 'Check environment variable',
    description: 'Check if key exists in environment',
    code: `if (!pm.environment.has("token")) {
    console.log("Token is not set");
}`,
  },
  {
    title: 'Clear environment variable',
    description: 'Remove variable from active environment',
    code: `pm.environment.unset("variable_key");`,
  },
]

const POST_RESPONSE_SNIPPETS: ScriptSnippet[] = [
  {
    title: 'Status code: 200',
    description: 'Verify status equals 200',
    code: `pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});`,
  },
  {
    title: 'Status code is 2xx',
    description: 'Verify success range (200-299)',
    code: `pm.test("Successful response (2xx)", function () {
    pm.expect(pm.response.code).to.be.below(300);
});`,
  },
  {
    title: 'Set token to environment',
    description: 'Extract access_token / token into environment',
    code: `const data = pm.response.json();
if (data.access_token || data.token) {
    pm.environment.set("token", data.access_token || data.token);
}`,
  },
  {
    title: 'Check JSON property',
    description: 'Verify root JSON key exists',
    code: `pm.test("Response contains data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("data");
});`,
  },
  {
    title: 'Response time < 200ms',
    description: 'Verify latency under 200ms',
    code: `pm.test("Response time is less than 200ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(200);
});`,
  },
  {
    title: 'Check Content-Type header',
    description: 'Verify header exists',
    code: `pm.test("Content-Type header is present", function () {
    pm.expect(pm.response.headers).to.have.property("content-type");
});`,
  },
  {
    title: 'Response body contains string',
    description: 'Verify raw response contains substring',
    code: `pm.test("Body contains string", function () {
    pm.expect(pm.response.text()).to.include("success");
});`,
  },
]

export type ScriptSubTab = 'PRE_REQUEST' | 'POST_RESPONSE'

export interface TestScriptEditorProps {
  preRequestScript?: string
  testScript?: string
  editorFontSize?: number
  onChangePreRequest?: (script: string) => void
  onChangeTest?: (script: string) => void
  // Legacy / fallback props
  script?: string
  onChange?: (script: string) => void
}

function formatJsCode(code: string): string {
  if (!code || !code.trim()) return ''
  try {
    const lines = code.split('\n')
    let indent = 0
    const result: string[] = []

    for (const raw of lines) {
      const trimmed = raw.trim()
      if (!trimmed) {
        result.push('')
        continue
      }

      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        indent = Math.max(0, indent - 1)
      }

      result.push('  '.repeat(indent) + trimmed)

      const opens = (trimmed.match(/[{[(]/g) || []).length
      const closes = (trimmed.match(/[}\])]/g) || []).length
      const net = trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')
        ? opens - (closes - 1)
        : opens - closes

      indent = Math.max(0, indent + Math.max(0, net))
    }

    return result.join('\n')
  } catch {
    return code
  }
}

export function TestScriptEditor({
  preRequestScript = '',
  testScript = '',
  editorFontSize,
  onChangePreRequest,
  onChangeTest,
  script,
  onChange,
}: TestScriptEditorProps) {
  const [activeSubTab, setActiveSubTab] = useState<ScriptSubTab>('POST_RESPONSE')
  const [isSnippetsOpen, setIsSnippetsOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SNIPPETS_COLLAPSED_KEY)
      if (saved !== null) {
        return saved !== 'true'
      }
    } catch {
      // ignore
    }
    return true
  })

  useEffect(() => {
    try {
      localStorage.setItem(SNIPPETS_COLLAPSED_KEY, String(!isSnippetsOpen))
    } catch {
      // ignore
    }
  }, [isSnippetsOpen])

  const handleToggleSnippets = (open?: boolean) => {
    setIsSnippetsOpen((prev) => (typeof open === 'boolean' ? open : !prev))
  }

  const effectiveTestScript = testScript || script || ''
  const effectivePreRequestScript = preRequestScript || ''

  const handleTestScriptChange = (val: string) => {
    if (onChangeTest) {
      onChangeTest(val)
    } else if (onChange) {
      onChange(val)
    }
  }

  const handlePreRequestScriptChange = (val: string) => {
    if (onChangePreRequest) {
      onChangePreRequest(val)
    }
  }

  const handleFormat = () => {
    if (activeSubTab === 'PRE_REQUEST') {
      const formatted = formatJsCode(effectivePreRequestScript)
      handlePreRequestScriptChange(formatted)
    } else {
      const formatted = formatJsCode(effectiveTestScript)
      handleTestScriptChange(formatted)
    }
  }

  const handleClear = () => {
    if (activeSubTab === 'PRE_REQUEST') {
      handlePreRequestScriptChange('')
    } else {
      handleTestScriptChange('')
    }
  }

  const handleInsertSnippet = (snippetCode: string) => {
    if (activeSubTab === 'PRE_REQUEST') {
      const updated = effectivePreRequestScript.trim()
        ? `${effectivePreRequestScript.trim()}\n\n${snippetCode}`
        : snippetCode
      handlePreRequestScriptChange(updated)
    } else {
      const updated = effectiveTestScript.trim()
        ? `${effectiveTestScript.trim()}\n\n${snippetCode}`
        : snippetCode
      handleTestScriptChange(updated)
    }
  }

  const hasPreReq = Boolean(effectivePreRequestScript.trim())
  const hasTest = Boolean(effectiveTestScript.trim())
  const currentSnippets =
    activeSubTab === 'PRE_REQUEST' ? PRE_REQUEST_SNIPPETS : POST_RESPONSE_SNIPPETS

  return (
    <div className="scripts-editor-container">
      {/* 1. HEADER TOOLBAR TINH GỌN (TẦNG 1) */}
      <div className="scripts-editor-toolbar">
        {/* Left: Segmented Sub-tab Switcher (Icon-only when space is narrow) */}
        <div className="scripts-segmented-control" role="tablist" aria-label="Script Type">
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'PRE_REQUEST'}
            className={`scripts-segment-btn ${activeSubTab === 'PRE_REQUEST' ? 'is-active' : ''}`}
            onClick={() => setActiveSubTab('PRE_REQUEST')}
            title="Pre-request Script"
          >
            <Zap size={13} style={{ color: activeSubTab === 'PRE_REQUEST' ? '#eab308' : '#ca8a04', flexShrink: 0 }} />
            <span className="scripts-tab-text max-[1100px]:hidden">Pre-request</span>
            {hasPreReq && <span className="scripts-dot-indicator scripts-dot-prerequest" title="Script has content" />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'POST_RESPONSE'}
            className={`scripts-segment-btn ${activeSubTab === 'POST_RESPONSE' ? 'is-active' : ''}`}
            onClick={() => setActiveSubTab('POST_RESPONSE')}
            title="Post-response / Tests"
          >
            <FlaskConical size={13} style={{ color: activeSubTab === 'POST_RESPONSE' ? '#60a5fa' : '#3b82f6', flexShrink: 0 }} />
            <span className="scripts-tab-text max-[1100px]:hidden">Post-response / Tests</span>
            {hasTest && <span className="scripts-dot-indicator scripts-dot-test" title="Script has content" />}
          </button>
        </div>

        {/* Right: Quick Action Controls (Format, Clear & Snippets Toggle) */}
        <div className="scripts-toolbar-actions">
          <button
            type="button"
            className="scripts-toolbar-btn"
            onClick={handleFormat}
            title="Format"
          >
            <Wand2 size={12} style={{ flexShrink: 0 }} />
            <span className="scripts-btn-text max-[1100px]:hidden">Format</span>
          </button>

          <button
            type="button"
            className="scripts-toolbar-btn"
            onClick={handleClear}
            title="Clear"
          >
            <Trash2 size={12} style={{ flexShrink: 0 }} />
            <span className="scripts-btn-text max-[1100px]:hidden">Clear</span>
          </button>

          {!isSnippetsOpen && (
            <button
              type="button"
              className="scripts-toolbar-btn scripts-toolbar-snippets-btn"
              onClick={() => handleToggleSnippets(true)}
              title="Snippets"
              aria-label="Open Snippets"
            >
              <FileText size={12} className="scripts-toolbar-snippets-icon" />
              <span className="scripts-btn-text max-[1100px]:hidden">Snippets</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. BỐ CỤC 2 CỘT NGANG (SPLIT LAYOUT - TẦNG 2) */}
      <div className="scripts-editor-content">
        {/* CỘT TRÁI: CodeMirror Editor full height (flex-1) */}
        <div className="scripts-editor-pane">
          {activeSubTab === 'PRE_REQUEST' ? (
            <CodeEditor
              value={effectivePreRequestScript}
              onChange={handlePreRequestScriptChange}
              language="javascript"
              placeholder={`// Pre-request Script (executed before sending the request)\n// Example: Set a dynamic timestamp or calculate authorization token\npm.environment.set("timestamp", new Date().toISOString());`}
              height="100%"
              minHeight="100%"
              fontSize={editorFontSize}
            />
          ) : (
            <CodeEditor
              value={effectiveTestScript}
              onChange={handleTestScriptChange}
              language="javascript"
              placeholder={`// Post-response / Test Script (executed after receiving response)\nconst data = pm.response.json();\npm.environment.set("token", data.access_token);\n\npm.test("Status code is 200", function () {\n    pm.response.to.have.status(200);\n});`}
              height="100%"
              minHeight="100%"
              fontSize={editorFontSize}
            />
          )}
        </div>

        {/* CỘT PHẢI: Snippets Sidebar (Collapsible Drawer / Toggle Sidebar) */}
        <div
          className={`scripts-snippets-sidebar ${!isSnippetsOpen ? 'is-collapsed' : ''}`}
          aria-hidden={!isSnippetsOpen}
        >
          <div className="scripts-snippets-inner">
            <div className="scripts-snippets-header">
              <div className="scripts-snippets-header-title">
                <PlayCircle size={13} style={{ color: 'var(--primary-bright)', flexShrink: 0 }} />
                <span>SNIPPETS</span>
              </div>
              <button
                type="button"
                className="scripts-snippets-collapse-btn"
                onClick={() => handleToggleSnippets(false)}
                title="Collapse Snippets"
                aria-label="Collapse Snippets"
              >
                <PanelRightClose size={14} />
              </button>
            </div>

            <div className="scripts-snippets-list custom-scrollbar">
              {currentSnippets.map((snippet) => (
                <button
                  key={snippet.title}
                  type="button"
                  className="scripts-snippet-item"
                  onClick={() => handleInsertSnippet(snippet.code)}
                  title={snippet.description}
                >
                  <div className="scripts-snippet-title">
                    <Plus size={11} style={{ color: 'var(--primary-bright)', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {snippet.title}
                    </span>
                  </div>
                  <div className="scripts-snippet-desc">
                    {snippet.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
