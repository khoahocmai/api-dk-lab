import { useState } from 'react'
import { RotateCcw, ShieldCheck, Type, Zap } from 'lucide-react'
import { type AppSettings, DEFAULT_APP_SETTINGS } from '../../types'
import { Modal } from '../common/Modal'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: AppSettings
  onSaveSettings: (settings: AppSettings) => void
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}: SettingsModalProps) {
  const [form, setForm] = useState<AppSettings>({ ...settings })

  const handleSave = () => {
    onSaveSettings(form)
    onClose()
  }

  const handleReset = () => {
    setForm({ ...DEFAULT_APP_SETTINGS })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Application Settings" maxWidth="540px">
      <div className="stack" style={{ gap: 16 }}>
        {/* Request Timeout */}
        <div className="stack" style={{ gap: 6 }}>
          <div className="row" style={{ gap: 6, fontWeight: 750, fontSize: 13 }}>
            <Zap size={15} style={{ color: 'var(--primary-bright)' }} />
            <span>Request Timeout (milliseconds)</span>
          </div>
          <input
            className="input input-sm"
            type="number"
            min={1000}
            max={300000}
            step={1000}
            value={form.requestTimeout}
            onChange={(e) => setForm({ ...form, requestTimeout: Number(e.target.value) || 30000 })}
            placeholder="30000"
          />
          <div className="meta-text">
            Maximum time to wait before timing out a request (default: 30,000 ms).
          </div>
        </div>

        {/* SSL Certificate Verification */}
        <div className="stack" style={{ gap: 6, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div className="row-between">
            <div className="row" style={{ gap: 6, fontWeight: 750, fontSize: 13 }}>
              <ShieldCheck size={15} style={{ color: 'var(--primary-bright)' }} />
              <span>SSL Certificate Verification</span>
            </div>
            <input
              type="checkbox"
              checked={form.rejectUnauthorized}
              onChange={(e) => setForm({ ...form, rejectUnauthorized: e.target.checked })}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
          </div>
          <div className="meta-text">
            {form.rejectUnauthorized
              ? 'Strict SSL enabled. Self-signed or invalid certificates will be rejected.'
              : '⚠️ SSL verification disabled. Allows testing local HTTPS servers with self-signed certs.'}
          </div>
        </div>

        {/* Code Editor Font Size */}
        <div className="stack" style={{ gap: 6, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div className="row" style={{ gap: 6, fontWeight: 750, fontSize: 13 }}>
            <Type size={15} style={{ color: 'var(--primary-bright)' }} />
            <span>Editor Font Size</span>
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            {[11, 12, 13, 14, 15, 16, 18].map((size) => (
              <button
                key={size}
                type="button"
                className={`segment-button ${form.editorFontSize === size ? 'is-active' : ''}`}
                onClick={() => setForm({ ...form, editorFontSize: size })}
                style={{ minWidth: 44, textAlign: 'center' }}
              >
                {size}px
              </button>
            ))}
          </div>
          <div className="meta-text">
            Font size for CodeMirror editors and response previews.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <button type="button" className="button button-sm" onClick={handleReset} title="Reset to Defaults">
            <RotateCcw size={13} />
            Reset
          </button>
          <button type="button" className="button button-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="button button-sm button-primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  )
}
