import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Globe, Layers, Plus } from 'lucide-react'
import type { EnvironmentItem } from '../../types'

interface EnvironmentSelectorProps {
  environments: EnvironmentItem[]
  activeEnvironmentId: string
  activeEnvironment: EnvironmentItem | null
  onSelectEnvironment: (id: string) => void
  onAddEnvironment?: () => void
  onOpenManageEnvironments?: () => void
}

export function EnvironmentSelector({
  environments,
  activeEnvironmentId,
  activeEnvironment,
  onSelectEnvironment,
  onAddEnvironment,
  onOpenManageEnvironments,
}: EnvironmentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isNoEnv = !activeEnvironment || activeEnvironmentId === 'NO_ENV'
  const displayName = isNoEnv ? 'No Environment' : activeEnvironment.name

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="env-selector-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`env-selector-button ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title={`Active Environment: ${displayName}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 26,
          padding: '0 8px 0 10px',
          background: '#181b26',
          border: '1px solid #2a2f42',
          borderRadius: 6,
          color: '#e2e8f0',
          fontSize: 12,
          fontWeight: 550,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <Globe
          size={13}
          style={{
            color: isNoEnv ? 'var(--text-dim)' : 'var(--primary-bright)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            maxWidth: 130,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: isNoEnv ? 'var(--text-muted)' : 'var(--text-primary)',
          }}
        >
          {displayName}
        </span>
        <ChevronDown
          size={12}
          style={{
            color: 'var(--text-dim)',
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {isOpen && (
        <div
          className="env-selector-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: 210,
            maxWidth: 280,
            background: '#161822',
            border: '1px solid #2a2f42',
            borderRadius: 6,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.6), 0 4px 10px -2px rgba(0,0,0,0.4)',
            zIndex: 200,
            padding: 4,
            animation: 'fade-in 0.12s ease',
          }}
        >
          {/* Header title */}
          <div
            style={{
              padding: '4px 8px',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-dim)',
            }}
          >
            Environments
          </div>

          {/* No Environment option */}
          <button
            type="button"
            className="env-dropdown-item"
            onClick={() => {
              onSelectEnvironment('NO_ENV')
              setIsOpen(false)
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 4,
              background: isNoEnv ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
              border: 0,
              color: isNoEnv ? 'var(--primary-bright)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: isNoEnv ? 600 : 450,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <Layers size={13} style={{ flexShrink: 0, opacity: isNoEnv ? 1 : 0.6 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                No Environment
              </span>
            </div>
            {isNoEnv && <Check size={13} style={{ color: 'var(--primary-bright)', flexShrink: 0 }} />}
          </button>

          {/* Separator */}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          {/* Environments list */}
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {environments.map((env) => {
              const isSelected = !isNoEnv && activeEnvironment?.id === env.id
              const varCount = env.variables.length
              return (
                <button
                  key={env.id}
                  type="button"
                  className="env-dropdown-item"
                  onClick={() => {
                    onSelectEnvironment(env.id)
                    setIsOpen(false)
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 4,
                    background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                    border: 0,
                    color: isSelected ? 'var(--primary-bright)' : 'var(--text-primary)',
                    fontSize: 12,
                    fontWeight: isSelected ? 600 : 450,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <Globe
                      size={13}
                      style={{
                        flexShrink: 0,
                        color: isSelected ? 'var(--primary-bright)' : 'var(--text-dim)',
                      }}
                    />
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {env.name}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>
                      ({varCount})
                    </span>
                  </div>
                  {isSelected && (
                    <Check size={13} style={{ color: 'var(--primary-bright)', flexShrink: 0 }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer Action */}
          {(onAddEnvironment || onOpenManageEnvironments) && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button
                type="button"
                className="env-dropdown-item"
                onClick={() => {
                  setIsOpen(false)
                  if (onAddEnvironment) onAddEnvironment()
                  else if (onOpenManageEnvironments) onOpenManageEnvironments()
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  borderRadius: 4,
                  background: 'transparent',
                  border: 0,
                  color: 'var(--primary-bright)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Plus size={12} style={{ flexShrink: 0 }} />
                <span>Add Environment</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
