import React from 'react'
import type { EnvironmentItem, KeyValueRow } from '../../types'
import { TemplateInput } from './TemplateInput'

export interface TemplateUrlInputProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
  onPaste?: React.ClipboardEventHandler<HTMLInputElement>
  placeholder?: string
  environment?: EnvironmentItem | null
  pathVariables?: KeyValueRow[] | null
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
  pathVariables,
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
      pathVariables={pathVariables}
      supportPathVariables={true}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      size="default"
      containerClassName="template-url-wrapper"
      inputClassName="template-url-input"
    />
  )
}
