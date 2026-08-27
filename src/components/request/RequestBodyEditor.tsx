import { FileX, Trash2, Wand2 } from 'lucide-react'
import type { BodyType, EnvironmentItem, KeyValueRow, RequestItem } from '../../types'
import { convertRowsToHeadersJson } from '../../utils/urlHelper'
import { createId, formatJsonSafely } from '../../utils/formatters'
import { CodeEditor } from '../common/CodeEditor'
import { KeyValueTable } from './KeyValueTable'

export interface RequestBodyEditorProps {
  activeTab: RequestItem
  editorFontSize?: number
  environment?: EnvironmentItem | null
  onUpdateTab: (patch: Partial<RequestItem>) => void
  onFormat?: () => void
  onClear?: () => void
}

const BODY_FORMAT_OPTIONS: { type: BodyType; label: string }[] = [
  { type: 'none', label: 'none' },
  { type: 'json', label: 'raw JSON' },
  { type: 'form-data', label: 'form-data' },
  { type: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
  { type: 'raw', label: 'raw Text' },
]

export function RequestBodyEditor({
  activeTab,
  editorFontSize,
  environment,
  onUpdateTab,
  onFormat,
  onClear,
}: RequestBodyEditorProps) {
  const isGetOrDelete = ['GET', 'DELETE'].includes(activeTab.method)

  const handleBodyTypeChange = (type: BodyType) => {
    const patch: Partial<RequestItem> = { bodyType: type }

    // Auto-sync Content-Type header in headersList if present or standard
    const contentTypeMap: Record<BodyType, string | null> = {
      json: 'application/json',
      'form-data': 'multipart/form-data',
      'x-www-form-urlencoded': 'application/x-www-form-urlencoded',
      raw: 'text/plain',
      none: null,
    }

    const targetContentType = contentTypeMap[type]
    const currentHeaders = activeTab.headersList || []
    const contentTypeHeaderIdx = currentHeaders.findIndex(
      (h) => h.key.trim().toLowerCase() === 'content-type',
    )

    if (targetContentType) {
      if (contentTypeHeaderIdx >= 0) {
        // If Content-Type exists in headers list, update it
        const updatedHeaders = currentHeaders.map((h, i) =>
          i === contentTypeHeaderIdx ? { ...h, value: targetContentType, enabled: true } : h,
        )
        patch.headersList = updatedHeaders
        patch.headersText = convertRowsToHeadersJson(updatedHeaders)
      }
    }

    onUpdateTab(patch)
  }

  const handleFormatJson = () => {
    if (onFormat) {
      onFormat()
    } else if (activeTab.restBody) {
      const formatted = formatJsonSafely(activeTab.restBody)
      onUpdateTab({ restBody: formatted })
    }
  }

  const handleClearCurrent = () => {
    if (onClear) {
      onClear()
      return
    }

    if (activeTab.bodyType === 'json') {
      onUpdateTab({ restBody: '' })
    } else if (activeTab.bodyType === 'raw') {
      onUpdateTab({ rawText: '' })
    } else if (activeTab.bodyType === 'form-data') {
      onUpdateTab({
        formData: [{ id: createId(), key: '', value: '', enabled: false, description: '' }],
      })
    } else if (activeTab.bodyType === 'x-www-form-urlencoded') {
      onUpdateTab({
        urlencoded: [{ id: createId(), key: '', value: '', enabled: false, description: '' }],
      })
    }
  }

  return (
    <div className="body-editor-container">
      {/* 1. THANH CHỌN ĐỊNH DẠNG BODY (TOOLBAR ~34px) */}
      <div className="body-editor-toolbar">
        {/* Left: Segmented Radio Group */}
        <div className="body-segmented-control" role="radiogroup" aria-label="Request Body Format">
          {BODY_FORMAT_OPTIONS.map(({ type, label }) => {
            const isActive = activeTab.bodyType === type
            const isDisabled = isGetOrDelete && type !== 'none'

            return (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={isDisabled}
                className={`body-segment-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => handleBodyTypeChange(type)}
                title={isDisabled ? `HTTP ${activeTab.method} requests typically do not have a body` : label}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="body-toolbar-actions">
          {activeTab.bodyType === 'json' && (
            <button
              type="button"
              className="body-toolbar-btn"
              onClick={handleFormatJson}
              title="Prettify and format JSON body"
            >
              <Wand2 size={12} />
              <span>Format JSON</span>
            </button>
          )}

          {activeTab.bodyType !== 'none' && (
            <button
              type="button"
              className="body-toolbar-btn"
              onClick={handleClearCurrent}
              title="Clear body content"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KHUNG NỘI DUNG CHÍNH (FULL HEIGHT 100%, NO LEFTOVER GAP) */}
      <div className="body-editor-content">
        {/* Chế độ none */}
        {activeTab.bodyType === 'none' && (
          <div className="body-empty-state">
            <FileX size={36} className="body-empty-icon" />
            <span className="body-empty-text">This request does not have a body</span>
            {isGetOrDelete && (
              <span className="text-[11px] text-amber-400/80 mt-2 font-sans">
                HTTP {activeTab.method} requests typically do not contain a request body.
              </span>
            )}
          </div>
        )}

        {/* Chế độ raw JSON */}
        {activeTab.bodyType === 'json' && (
          <div className="body-editor-pane">
            <CodeEditor
              value={activeTab.restBody || ''}
              onChange={(val) => onUpdateTab({ restBody: val })}
              language="json"
              placeholder="{\n  \n}"
              height="100%"
              minHeight="100%"
              fontSize={editorFontSize}
            />
          </div>
        )}

        {/* Chế độ raw Text */}
        {activeTab.bodyType === 'raw' && (
          <div className="body-editor-pane">
            <CodeEditor
              value={activeTab.rawText || ''}
              onChange={(val) => onUpdateTab({ rawText: val })}
              language="text"
              placeholder="Raw text payload..."
              height="100%"
              minHeight="100%"
              fontSize={editorFontSize}
            />
          </div>
        )}

        {/* Chế độ form-data */}
        {activeTab.bodyType === 'form-data' && (
          <div className="body-editor-scroll-pane custom-scrollbar">
            <KeyValueTable
              rows={activeTab.formData}
              onChange={(rows: KeyValueRow[]) => onUpdateTab({ formData: rows })}
              keyPlaceholder="Key"
              valuePlaceholder="Value"
              descriptionPlaceholder="Description"
              title="Multipart / Form-Data"
              environment={environment}
              allowFile={true}
            />
          </div>
        )}

        {/* Chế độ x-www-form-urlencoded */}
        {activeTab.bodyType === 'x-www-form-urlencoded' && (
          <div className="body-editor-scroll-pane custom-scrollbar">
            <KeyValueTable
              rows={activeTab.urlencoded}
              onChange={(rows: KeyValueRow[]) => onUpdateTab({ urlencoded: rows })}
              keyPlaceholder="Key"
              valuePlaceholder="Value"
              descriptionPlaceholder="Description"
              title="x-www-form-urlencoded"
              environment={environment}
              allowFile={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}
