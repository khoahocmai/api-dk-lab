import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Modal } from '../common/Modal'

interface UnsavedChangesModalProps {
  isOpen: boolean
  tabName: string
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function UnsavedChangesModal({
  isOpen,
  tabName,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesModalProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        onSave()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, onSave, onCancel])

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Unsaved Changes" maxWidth="460px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div
            style={{
              padding: 8,
              borderRadius: '50%',
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              color: '#eab308',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={22} />
          </div>
          <div style={{ fontSize: 13, lineHeight: '1.5', color: 'var(--text-secondary)' }}>
            Do you want to save the changes you made to request{' '}
            <strong style={{ color: 'var(--text-primary)' }}>"{tabName || 'Untitled Request'}"</strong>?
            <div style={{ marginTop: 4, color: 'var(--text-dim)', fontSize: 12 }}>
              Your changes will be lost if you don't save them.
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 8,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
          }}
        >
          <button type="button" className="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="button"
            style={{ color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}
            onClick={onDiscard}
          >
            Don't Save
          </button>
          <button type="button" className="button button-primary" onClick={onSave} autoFocus>
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
