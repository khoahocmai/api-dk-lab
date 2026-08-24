import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { EnvironmentItem } from '../../types'
import {
  getVariableDetail,
  parseTemplateTokens,
  type VariableDetail,
} from '../../utils/templateHelper'
import { VariableTooltip } from './VariableTooltip'

export interface TemplateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> {
  value: string
  onChange: (value: string) => void
  environment?: EnvironmentItem | null
  size?: 'sm' | 'default'
  startIcon?: React.ReactNode
  endAction?: React.ReactNode
  containerClassName?: string
  containerStyle?: React.CSSProperties
  inputClassName?: string
}

export function TemplateInput({
  value,
  onChange,
  environment,
  size = 'default',
  startIcon,
  endAction,
  containerClassName = '',
  containerStyle,
  inputClassName = '',
  placeholder,
  disabled,
  readOnly,
  type = 'text',
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  style,
  ...restProps
}: TemplateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  const [activeTooltip, setActiveTooltip] = useState<{
    detail: VariableDetail
    rect: DOMRect
  } | null>(null)

  // Parse text into tokens
  const tokens = useMemo(() => parseTemplateTokens(value), [value])

  // Sync scroll between input and highlight underlay
  const syncScroll = () => {
    if (inputRef.current && highlightRef.current) {
      highlightRef.current.scrollLeft = inputRef.current.scrollLeft
    }
  }

  useEffect(() => {
    const animId = requestAnimationFrame(syncScroll)
    return () => cancelAnimationFrame(animId)
  }, [value])

  // Calculate which variable token is under the mouse cursor using exact DOM rects
  const handleMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    const underlay = highlightRef.current
    const input = inputRef.current
    if (!underlay || !input || tokens.length === 0 || type === 'password') {
      setActiveTooltip(null)
      return
    }

    const inputRect = input.getBoundingClientRect()
    const varSpans = underlay.querySelectorAll<HTMLSpanElement>('.template-var-token')
    let foundDetail: VariableDetail | null = null
    let foundRect: DOMRect | null = null

    for (const span of varSpans) {
      const rect = span.getBoundingClientRect()
      // Ensure span is visible within input box bounds
      const isVisibleInInput = rect.right > inputRect.left && rect.left < inputRect.right
      if (!isVisibleInInput) continue

      if (
        e.clientX >= Math.max(rect.left, inputRect.left) &&
        e.clientX <= Math.min(rect.right, inputRect.right) &&
        e.clientY >= inputRect.top &&
        e.clientY <= inputRect.bottom
      ) {
        const varName = span.getAttribute('data-var-name')
        if (varName) {
          foundDetail = getVariableDetail(varName, environment)
          foundRect = rect
          break
        }
      }
    }

    if (foundDetail && foundRect) {
      setActiveTooltip({ detail: foundDetail, rect: foundRect })
    } else {
      setActiveTooltip(null)
    }
  }

  const handleMouseLeave = () => {
    setActiveTooltip(null)
  }

  const hasStartIcon = Boolean(startIcon)
  const hasEndAction = Boolean(endAction)
  const isPassword = type === 'password'

  return (
    <div
      className={`template-input-wrapper is-${size} ${hasStartIcon ? 'has-start-icon has-icon' : ''} ${hasEndAction ? 'has-end-action' : ''} ${containerClassName}`}
      style={containerStyle}
      onMouseLeave={handleMouseLeave}
    >
      {/* Optional leading icon (non-blocking pointer-events) */}
      {hasStartIcon && <div className="template-input-icon">{startIcon}</div>}

      {/* Background Syntax Highlight Underlay (hidden for password type) */}
      {!isPassword && (
        <div
          ref={highlightRef}
          className={`template-input-underlay ${hasStartIcon ? 'has-start-icon has-icon' : ''} ${hasEndAction ? 'has-end-action' : ''}`}
          aria-hidden="true"
        >
          {tokens.map((token, index) => {
            if (token.type === 'text') {
              return (
                <span key={index} className="template-text-token">
                  {token.raw}
                </span>
              )
            }

            const detail = getVariableDetail(token.varName, environment)
            const isValid = detail.exists && detail.enabled

            return (
              <span
                key={index}
                data-var-name={token.varName}
                className={`template-var-token ${isValid ? 'is-valid' : 'is-unresolved'}`}
              >
                {token.raw}
              </span>
            )
          })}
        </div>
      )}

      {/* Foreground Real Input */}
      <input
        ref={inputRef}
        type={type}
        className={`template-input-control ${hasStartIcon ? 'has-start-icon has-icon' : ''} ${hasEndAction ? 'has-end-action' : ''} ${isPassword ? 'is-pwd' : ''} ${inputClassName}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onInput={syncScroll}
        onSelect={syncScroll}
        onClick={syncScroll}
        onKeyUp={(e) => {
          syncScroll()
          onKeyUp?.(e)
        }}
        onKeyDown={(e) => {
          syncScroll()
          onKeyDown?.(e)
        }}
        onFocus={(e) => {
          syncScroll()
          onFocus?.(e)
        }}
        onBlur={(e) => {
          syncScroll()
          onBlur?.(e)
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        spellCheck={false}
        autoComplete="off"
        style={style}
        {...restProps}
      />

      {/* Optional trailing action (e.g. show/hide password toggle) */}
      {hasEndAction && <div className="template-input-end-action">{endAction}</div>}

      {/* Postman-Style Popover Tooltip */}
      {activeTooltip && (
        <VariableTooltip
          detail={activeTooltip.detail}
          anchorRect={activeTooltip.rect}
        />
      )}
    </div>
  )
}
