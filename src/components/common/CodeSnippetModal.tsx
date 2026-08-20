import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import type { EnvironmentItem, RequestItem } from '../../types'
import {
  CODE_SNIPPET_OPTIONS,
  type CodeSnippetLang,
  generateCodeSnippet,
} from '../../utils/codeGenerators'
import { CodeEditor } from './CodeEditor'
import { Modal } from './Modal'

interface CodeSnippetModalProps {
  isOpen: boolean
  onClose: () => void
  request: RequestItem
  environment: EnvironmentItem | null
}

export function CodeSnippetModal({
  isOpen,
  onClose,
  request,
  environment,
}: CodeSnippetModalProps) {
  const [selectedLang, setSelectedLang] = useState<CodeSnippetLang>('curl')
  const [copied, setCopied] = useState(false)

  const activeOption = useMemo(
    () => CODE_SNIPPET_OPTIONS.find((o) => o.id === selectedLang) || CODE_SNIPPET_OPTIONS[0],
    [selectedLang],
  )

  const code = useMemo(
    () => generateCodeSnippet(selectedLang, request, environment),
    [selectedLang, request, environment],
  )

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Generate Code Snippet — ${request.name}`}
      maxWidth="780px"
    >
      <div className="stack" style={{ gap: 14 }}>
        <div className="row-between wrap" style={{ gap: 10 }}>
          <div className="row wrap" style={{ alignItems: 'center' }}>
            <span className="caps">Language / Library:</span>
            <select
              className="select select-sm"
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as CodeSnippetLang)}
              style={{ minWidth: 200, fontWeight: 750 }}
            >
              {CODE_SNIPPET_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button type="button" className="button button-sm button-primary" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
          </button>
        </div>

        <div className="codemirror-wrapper" style={{ height: 360 }}>
          <CodeEditor
            value={code}
            language={activeOption.language}
            readOnly
            height="100%"
          />
        </div>
      </div>
    </Modal>
  )
}
