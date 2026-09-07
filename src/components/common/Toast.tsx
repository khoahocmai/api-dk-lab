import { useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export interface ToastData {
  id: string
  message: string
  type?: 'success' | 'info' | 'warning' | 'error'
}

// eslint-disable-next-line react-refresh/only-export-components
export function emitToast(
  message: string,
  type: 'success' | 'info' | 'warning' | 'error' = 'success',
) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app:toast', {
        detail: { message, type },
      }),
    )
  }
}

interface ToastProps {
  toast: ToastData | null
  onClose: () => void
}

export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      onClose()
    }, 2600)
    return () => clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null

  const type = toast.type ?? 'success'

  return (
    <div className={`toast-container toast-${type}`} role="status" aria-live="polite">
      <div className="toast-icon">
        {type === 'success' && <CheckCircle2 size={16} />}
        {type === 'error' && <AlertCircle size={16} />}
        {type === 'warning' && <AlertCircle size={16} />}
        {type === 'info' && <Info size={16} />}
      </div>
      <div className="toast-message">{toast.message}</div>
      <button className="toast-close" onClick={onClose} aria-label="Close notification">
        <X size={14} />
      </button>
    </div>
  )
}
