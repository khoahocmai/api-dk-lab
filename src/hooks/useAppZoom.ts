import { useEffect } from 'react'

export const useAppZoom = () => {
  useEffect(() => {
    // Zoom limits: 50% (0.5) to 200% (2.0)
    const MIN_ZOOM = 0.5
    const MAX_ZOOM = 2.0
    const STEP = 0.1

    const savedZoom = localStorage.getItem('app_zoom_factor')
    let currentZoom = savedZoom ? parseFloat(savedZoom) : 1.0
    if (isNaN(currentZoom) || currentZoom < MIN_ZOOM || currentZoom > MAX_ZOOM) {
      currentZoom = 1.0
    }

    const applyZoom = (factor: number) => {
      const clamped = Math.min(Math.max(factor, MIN_ZOOM), MAX_ZOOM)
      currentZoom = Math.round(clamped * 100) / 100

      if (window.desktopApi?.setZoomFactor) {
        window.desktopApi.setZoomFactor(currentZoom)
      } else {
        document.body.style.zoom = `${currentZoom}`
      }
      localStorage.setItem('app_zoom_factor', currentZoom.toFixed(2))
    }

    // Apply saved or default zoom factor on initialization
    applyZoom(currentZoom)

    // 1. Keyboard Shortcuts handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return

      // Zoom In: Ctrl + '=' or Ctrl + '+' or NumpadAdd
      if (
        e.key === '=' ||
        e.key === '+' ||
        e.code === 'Equal' ||
        e.code === 'NumpadAdd'
      ) {
        e.preventDefault()
        applyZoom(currentZoom + STEP)
      }
      // Zoom Out: Ctrl + '-' or Ctrl + '_' or NumpadSubtract
      else if (
        e.key === '-' ||
        e.key === '_' ||
        e.code === 'Minus' ||
        e.code === 'NumpadSubtract'
      ) {
        e.preventDefault()
        applyZoom(currentZoom - STEP)
      }
      // Reset Zoom: Ctrl + '0' or Digit0 or Numpad0
      else if (
        e.key === '0' ||
        e.code === 'Digit0' ||
        e.code === 'Numpad0'
      ) {
        e.preventDefault()
        applyZoom(1.0)
      }
    }

    // 2. Mouse Wheel Zoom (Ctrl + Wheel)
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()

      if (e.deltaY < 0) {
        // Scroll Up -> Zoom In
        applyZoom(currentZoom + STEP)
      } else if (e.deltaY > 0) {
        // Scroll Down -> Zoom Out
        applyZoom(currentZoom - STEP)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [])
}
