import { useEffect, useState } from 'react'
import { AlertCircle, Terminal } from 'lucide-react'
import type { RequestItem } from '../../types'
import { parseCurlCommand } from '../../utils/curlHelper'
import { Modal } from '../common/Modal'

interface CurlImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (parsed: Partial<RequestItem>) => void
}

export function CurlImportModal({ isOpen, onClose, onImport }: CurlImportModalProps) {
  const [curlText, setCurlText] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setCurlText('')
      setErrorMessage('')
    }
  }, [isOpen])

  const handleParseAndImport = () => {
    const text = curlText.trim()
    if (!text) {
      setErrorMessage('Please enter a cURL command.')
      return
    }

    const parsed = parseCurlCommand(text)
    if (parsed) {
      onImport(parsed)
      setCurlText('')
      setErrorMessage('')
      onClose()
    } else {
      setErrorMessage("Invalid cURL format. Please make sure the command starts with 'curl'.")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleParseAndImport()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Request from cURL"
      maxWidth="680px"
    >
      <div className="stack" style={{ gap: 12 }}>
        <div
          className="row"
          style={{
            gap: 8,
            color: 'var(--text-secondary)',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <Terminal size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span>
            Paste your full cURL command below. API DK Lab will automatically detect REST or GraphQL,
            extract URL, Method, Headers, Auth tokens, and Query / Variables.
          </span>
        </div>

        <textarea
          className="textarea"
          style={{
            minHeight: 220,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            lineHeight: 1.5,
            background: '#161922',
            borderColor: errorMessage ? 'var(--danger)' : '#272b38',
            color: '#e2e8f0',
            padding: 10,
          }}
          value={curlText}
          onChange={(e) => {
            setCurlText(e.target.value)
            if (errorMessage) setErrorMessage('')
          }}
          onKeyDown={handleKeyDown}
          placeholder={`curl --url 'https://api.example.com/graphql' \\
  -H 'Authorization: Bearer <token>' \\
  -H 'Content-Type: application/json' \\
  --data-raw '{"query":"query { ... }","variables":{}}'`}
          autoFocus
          spellCheck={false}
        />

        {errorMessage && (
          <div
            className="banner banner-danger"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              fontSize: 12,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="modal-footer" style={{ marginTop: 4, padding: '8px 0 0 0', borderTop: '1px solid var(--border)' }}>
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleParseAndImport}
            disabled={!curlText.trim()}
          >
            Parse & Import
          </button>
        </div>
      </div>
    </Modal>
  )
}
