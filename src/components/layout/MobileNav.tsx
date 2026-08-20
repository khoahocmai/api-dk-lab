import type { MobileView } from '../../types'

interface MobileNavProps {
  mobileView: MobileView
  onChangeView: (view: MobileView) => void
}

export function MobileNav({ mobileView, onChangeView }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Mobile workspace navigation">
      <button
        className={`button ${mobileView === 'COLLECTIONS' ? 'button-primary' : ''}`}
        onClick={() => onChangeView('COLLECTIONS')}
      >
        Workspace
      </button>
      <button
        className={`button ${mobileView === 'REQUEST' ? 'button-primary' : ''}`}
        onClick={() => onChangeView('REQUEST')}
      >
        Request
      </button>
      <button
        className={`button ${mobileView === 'EXPLORER' ? 'button-primary' : ''}`}
        onClick={() => onChangeView('EXPLORER')}
      >
        Explorer
      </button>
    </nav>
  )
}
