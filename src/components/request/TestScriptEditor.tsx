import { PlayCircle, Plus } from 'lucide-react'
import { CodeEditor } from '../common/CodeEditor'

interface TestSnippet {
  title: string
  description: string
  code: string
}

const TEST_SNIPPETS: TestSnippet[] = [
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
    title: 'Response time < 200ms',
    description: 'Verify latency under 200ms',
    code: `pm.test("Response time is less than 200ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(200);
});`,
  },
  {
    title: 'Check JSON property',
    description: 'Verify root JSON key exists',
    code: `pm.test("Response contains data", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("data");
});`,
  },
  {
    title: 'Set environment variable',
    description: 'Save token to active environment',
    code: `pm.test("Set environment variable", function () {
    var jsonData = pm.response.json();
    if (jsonData.token) {
        pm.environment.set("token", jsonData.token);
    }
});`,
  },
  {
    title: 'Check Content-Type header',
    description: 'Verify header exists',
    code: `pm.test("Content-Type header is present", function () {
    pm.expect(pm.response.headers).to.have.property("content-type");
});`,
  },
]

interface TestScriptEditorProps {
  script: string
  onChange: (script: string) => void
}

export function TestScriptEditor({ script, onChange }: TestScriptEditorProps) {
  const handleInsertSnippet = (snippetCode: string) => {
    const updated = script.trim() ? `${script.trim()}\n\n${snippetCode}` : snippetCode
    onChange(updated)
  }

  return (
    <div
      className="test-script-layout"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 190px',
        gap: 8,
        height: '100%',
      }}
    >
      <div className="stack" style={{ height: '100%', minHeight: 300, gap: 4 }}>
        <div className="caps">Test Script (JavaScript Sandbox)</div>
        <CodeEditor
          value={script}
          onChange={onChange}
          language="javascript"
          placeholder={`// Write test assertions using pm.test and pm.expect\npm.test("Status code is 200", function () {\n    pm.response.to.have.status(200);\n});`}
          height="100%"
          minHeight="300px"
        />
      </div>

      <div
        className="test-snippets-panel stack"
        style={{
          borderLeft: '1px solid var(--border)',
          paddingLeft: 8,
          overflowY: 'auto',
          gap: 6,
        }}
      >
        <div className="row" style={{ gap: 4, color: 'var(--primary-bright)', fontWeight: 750, fontSize: 11 }}>
          <PlayCircle size={13} />
          <span>Snippets</span>
        </div>

        <div className="stack" style={{ gap: 4 }}>
          {TEST_SNIPPETS.map((snippet) => (
            <button
              key={snippet.title}
              type="button"
              className="snippet-button"
              onClick={() => handleInsertSnippet(snippet.code)}
              title={snippet.description}
            >
              <div className="row" style={{ gap: 4, fontWeight: 700, fontSize: 11 }}>
                <Plus size={11} style={{ color: 'var(--primary-bright)' }} />
                <span>{snippet.title}</span>
              </div>
              <div className="meta-text" style={{ fontSize: 10, textAlign: 'left', marginTop: 1 }}>
                {snippet.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
