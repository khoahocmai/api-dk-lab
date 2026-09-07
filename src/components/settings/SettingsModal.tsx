import { useEffect, useState } from 'react'
import { Bug, RotateCcw, ShieldCheck, Type, Zap } from 'lucide-react'
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

  useEffect(() => {
    if (isOpen) {
      setForm({ ...settings })
    }
  }, [isOpen, settings])

  const handleSave = () => {
    onSaveSettings(form)
    onClose()
  }

  const handleReset = () => {
    setForm({ ...DEFAULT_APP_SETTINGS })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Application Settings" maxWidth="560px">
      <div className="stack" style={{ gap: 16 }}>
        {/* Request Timeout */}
        <div className="stack" style={{ gap: 6 }}>
          <div className="row" style={{ gap: 6, fontWeight: 750, fontSize: 13 }}>
            <Zap size={15} style={{ color: 'var(--primary-bright)' }} />
            <span>Request Timeout (ms)</span>
          </div>
          <input
            className="input input-sm"
            type="number"
            min={0}
            step={1000}
            value={form.requestTimeout}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
              setForm({ ...form, requestTimeout: isNaN(val) ? 0 : Math.max(0, val) })
            }}
            placeholder="30000 (hoặc 0 để tắt timeout)"
          />
          <div className="meta-text" style={{ lineHeight: 1.5 }}>
            Đặt <code style={{ color: 'var(--primary-bright)', background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4 }}>0</code> để tắt timeout hoàn toàn (không giới hạn thời gian chờ - khuyên dùng khi debug code tại breakpoint).
          </div>

          {/* Localhost Debug Mode Toggle */}
          <div
            className="row-between"
            style={{
              marginTop: 6,
              padding: '8px 12px',
              background: 'var(--bg-input)',
              borderRadius: 6,
              border: '1px solid var(--border)',
            }}
          >
            <label
              htmlFor="disable-localhost-timeout"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                cursor: 'pointer',
                flex: 1,
                marginRight: 12,
              }}
            >
              <div className="row" style={{ gap: 6, fontWeight: 700, fontSize: 12.5 }}>
                <Bug
                  size={14}
                  style={{
                    color: form.disableLocalhostTimeout ? 'var(--warning)' : 'var(--text-muted)',
                  }}
                />
                <span>Disable timeout for localhost / 127.0.0.1 (Debug Mode)</span>
              </div>
              <span className="meta-text" style={{ fontSize: 11.5, lineHeight: 1.4 }}>
                Khi bật tùy chọn này, bất kỳ request nào gửi tới domain <code>localhost</code> hoặc <code>127.0.0.1</code> sẽ tự động áp dụng <code>timeout: 0</code> mà không ảnh hưởng tới các domain staging/production khác.
              </span>
            </label>
            <input
              id="disable-localhost-timeout"
              type="checkbox"
              checked={Boolean(form.disableLocalhostTimeout)}
              onChange={(e) => setForm({ ...form, disableLocalhostTimeout: e.target.checked })}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
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
