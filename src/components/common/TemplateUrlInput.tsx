import React from 'react'
import type { EnvironmentItem } from '../../types'
import { TemplateInput } from './TemplateInput'

export interface TemplateUrlInputProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
  onPaste?: React.ClipboardEventHandler<HTMLInputElement>
  placeholder?: string
  environment?: EnvironmentItem | null
  ariaLabel?: string
  autoFocus?: boolean
}

export function TemplateUrlInput({
  value,
  onChange,
  onKeyDown,
  onPaste,
  placeholder,
  environment,
  ariaLabel = 'Request URL',
  autoFocus,
}: TemplateUrlInputProps) {
  return (
    <TemplateInput
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      placeholder={placeholder}
      environment={environment}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      size="default"
      containerClassName="template-url-wrapper"
      inputClassName="template-url-input"
    />
  )
}

