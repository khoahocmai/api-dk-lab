import { useEffect, useRef, useState } from 'react'
import {
  Bookmark,
  Check,
  ChevronDown,
  Pencil,
  Plus,
  Save,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import type { DataPreset } from '../../types'
import { createId } from '../../utils/formatters'
import { sanitizeTrailingCommas } from '../../utils/jsonHelper'
import { emitToast } from '../common/Toast'

export interface PresetSelectorProps {
  presets?: DataPreset[]
  activePresetId?: string
  currentContent: string
  onSelectPreset: (preset: DataPreset) => void
  onUpdatePresets: (newPresets: DataPreset[], nextActivePresetId?: string) => void
  onShowToast?: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void
  containerStyle?: React.CSSProperties
}

export function PresetSelector({
  presets = [],
  activePresetId,
  currentContent,
  onSelectPreset,
  onUpdatePresets,
  onShowToast,
  containerStyle,
}: PresetSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSavePopoverOpen, setIsSavePopoverOpen] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [editingPresetName, setEditingPresetName] = useState('')
  const [isCreatingNewVariant, setIsCreatingNewVariant] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const savePopoverRef = useRef<HTMLDivElement>(null)
  const inputNewRef = useRef<HTMLInputElement>(null)
  const inputEditRef = useRef<HTMLInputElement>(null)

  const activePreset = presets.find((p) => p.id === activePresetId)
  const isContentModified = Boolean(
    activePreset && activePreset.content.trim() !== currentContent.trim(),
  )

  const triggerToast = (
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'success',
  ) => {
    if (onShowToast) {
      onShowToast(message, type)
    } else {
      emitToast(message, type)
    }
  }

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false)
        setEditingPresetId(null)
      }
      if (savePopoverRef.current && !savePopoverRef.current.contains(target)) {
        setIsSavePopoverOpen(false)
        setIsCreatingNewVariant(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false)
        setIsSavePopoverOpen(false)
        setEditingPresetId(null)
        setIsCreatingNewVariant(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Auto focus input when popover opens
  useEffect(() => {
    if (isSavePopoverOpen && (isCreatingNewVariant || !activePreset)) {
      setTimeout(() => {
        inputNewRef.current?.focus()
      }, 50)
    }
  }, [isSavePopoverOpen, isCreatingNewVariant, activePreset])

  useEffect(() => {
    if (editingPresetId) {
      setTimeout(() => {
        inputEditRef.current?.focus()
      }, 50)
    }
  }, [editingPresetId])

  const handleSelect = (preset: DataPreset) => {
    setIsDropdownOpen(false)
    setEditingPresetId(null)
    onSelectPreset(preset)
  }

  const handleSaveNew = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmedName = newPresetName.trim()
    if (!trimmedName) {
      triggerToast('Vui lòng nhập tên preset', 'warning')
      return
    }

    const cleanContent = sanitizeTrailingCommas(currentContent || '{}').trim()
    const newPreset: DataPreset = {
      id: createId(),
      name: trimmedName,
      content: cleanContent || '{}',
      createdAt: Date.now(),
    }

    const updatedPresets = [...presets, newPreset]
    onUpdatePresets(updatedPresets, newPreset.id)
    triggerToast(`Đã lưu preset: "${newPreset.name}"`, 'success')

    setNewPresetName('')
    setIsSavePopoverOpen(false)
    setIsCreatingNewVariant(false)
  }

  const handleOverwriteActive = () => {
    if (!activePreset) return

    const cleanContent = sanitizeTrailingCommas(currentContent || '{}').trim()
    const updatedPresets = presets.map((p) =>
      p.id === activePreset.id ? { ...p, content: cleanContent || '{}' } : p,
    )

    onUpdatePresets(updatedPresets, activePreset.id)
    triggerToast(`Đã cập nhật đè preset: "${activePreset.name}"`, 'success')
    setIsSavePopoverOpen(false)
  }

  const handleStartRename = (preset: DataPreset, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPresetId(preset.id)
    setEditingPresetName(preset.name)
  }

  const handleConfirmRename = (presetId: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation()
    const trimmed = editingPresetName.trim()
    if (!trimmed) {
      triggerToast('Tên preset không được để trống', 'warning')
      return
    }

    const updatedPresets = presets.map((p) =>
      p.id === presetId ? { ...p, name: trimmed } : p,
    )

    onUpdatePresets(updatedPresets, activePresetId)
    triggerToast(`Đã đổi tên preset thành "${trimmed}"`, 'info')
    setEditingPresetId(null)
  }

  const handleDelete = (preset: DataPreset, e: React.MouseEvent) => {
    e.stopPropagation()
    const updatedPresets = presets.filter((p) => p.id !== preset.id)
    const nextActiveId = activePresetId === preset.id ? undefined : activePresetId

    onUpdatePresets(updatedPresets, nextActiveId)
    triggerToast(`Đã xóa preset: "${preset.name}"`, 'info')
  }

  return (
    <div
      className="preset-selector-root"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        position: 'relative',
        ...containerStyle,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. NÚT CHỌN PRESET (DROPDOWN) */}
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => {
            setIsDropdownOpen((prev) => !prev)
            setIsSavePopoverOpen(false)
          }}
          className={`preset-dropdown-btn ${activePreset ? 'is-active-preset' : ''}`}
          title={
            activePreset
              ? `Preset: ${activePreset.name}${isContentModified ? ' (đã chỉnh sửa)' : ''}`
              : 'Chọn bộ dữ liệu mẫu (Preset)'
          }
        >
          <Tag size={12} className="preset-icon" />
          <span className="preset-btn-label">
            {activePreset ? (
              <>
                <span className="preset-label-prefix">Preset:</span>{' '}
                <span className="preset-label-name">{activePreset.name}</span>
                {isContentModified && <span className="preset-modified-indicator">*</span>}
              </>
            ) : (
              `Preset (${presets.length})`
            )}
          </span>
          <ChevronDown size={12} className={`preset-chevron ${isDropdownOpen ? 'is-open' : ''}`} />
        </button>

        {/* DROPDOWN MENU */}
        {isDropdownOpen && (
          <div className="preset-dropdown-menu">
            <div className="preset-dropdown-header">
              <span className="preset-dropdown-title">
                <Bookmark size={12} /> BỘ DỮ LIỆU PRESET ({presets.length})
              </span>
              <button
                type="button"
                className="preset-quick-add-btn"
                onClick={() => {
                  setIsDropdownOpen(false)
                  setIsCreatingNewVariant(true)
                  setIsSavePopoverOpen(true)
                }}
                title="Lưu nội dung hiện tại thành preset mới"
              >
                <Plus size={11} />
                <span>Mới</span>
              </button>
            </div>

            <div className="preset-dropdown-list custom-scrollbar">
              {presets.length === 0 ? (
                <div className="preset-empty-state">
                  <span>Chưa có preset nào cho request này.</span>
                  <button
                    type="button"
                    className="preset-empty-add-btn"
                    onClick={() => {
                      setIsDropdownOpen(false)
                      setIsSavePopoverOpen(true)
                    }}
                  >
                    <Plus size={12} /> Lưu nội dung hiện tại làm Preset
                  </button>
                </div>
              ) : (
                presets.map((preset) => {
                  const isActive = preset.id === activePresetId
                  const isEditing = editingPresetId === preset.id

                  return (
                    <div
                      key={preset.id}
                      className={`preset-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => !isEditing && handleSelect(preset)}
                      title={!isEditing ? `Bấm để áp dụng preset "${preset.name}"` : undefined}
                    >
                      {isEditing ? (
                        <div
                          className="preset-edit-row"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            ref={inputEditRef}
                            type="text"
                            value={editingPresetName}
                            onChange={(e) => setEditingPresetName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleConfirmRename(preset.id, e)
                              if (e.key === 'Escape') setEditingPresetId(null)
                            }}
                            className="preset-inline-input"
                            placeholder="Tên preset..."
                          />
                          <button
                            type="button"
                            className="preset-action-btn preset-confirm-btn"
                            onClick={(e) => handleConfirmRename(preset.id, e)}
                            title="Lưu tên mới"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            type="button"
                            className="preset-action-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingPresetId(null)
                            }}
                            title="Hủy"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="preset-item-left">
                            <span
                              className={`preset-check-icon ${isActive ? 'is-active' : ''}`}
                            >
                              {isActive && <Check size={12} />}
                            </span>
                            <span className="preset-item-name">{preset.name}</span>
                          </div>

                          <div
                            className="preset-item-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="preset-item-btn"
                              onClick={(e) => handleStartRename(preset, e)}
                              title="Đổi tên preset"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              type="button"
                              className="preset-item-btn preset-delete-btn"
                              onClick={(e) => handleDelete(preset, e)}
                              title="Xóa preset"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {presets.length > 0 && (
              <div className="preset-dropdown-footer">
                <button
                  type="button"
                  className="preset-dropdown-footer-btn"
                  onClick={() => {
                    setIsDropdownOpen(false)
                    setIsCreatingNewVariant(true)
                    setIsSavePopoverOpen(true)
                  }}
                >
                  <Plus size={12} />
                  <span>Lưu nội dung hiện tại làm Preset mới</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. NÚT SAVE PRESET (POPOVER MINI TẠI CHỖ) */}
      <div style={{ position: 'relative' }} ref={savePopoverRef}>
        <button
          type="button"
          onClick={() => {
            setIsSavePopoverOpen((prev) => !prev)
            setIsDropdownOpen(false)
            setIsCreatingNewVariant(false)
            setNewPresetName('')
          }}
          className={`preset-save-btn ${isContentModified ? 'has-unsaved-changes' : ''}`}
          title={
            activePreset
              ? isContentModified
                ? `Preset "${activePreset.name}" đã bị thay đổi - Bấm để lưu`
                : 'Lưu hoặc cập nhật Preset'
              : 'Lưu nội dung hiện tại thành Preset mới'
          }
        >
          <Save size={12} />
          <span>Save Preset</span>
          {isContentModified && <span className="preset-save-badge">!</span>}
        </button>

        {/* POPOVER MINI TẠI CHỖ */}
        {isSavePopoverOpen && (
          <div className="preset-save-popover">
            <div className="preset-popover-header">
              <span className="preset-popover-title">
                <Save size={12} className="text-blue-400" />
                {activePreset && !isCreatingNewVariant
                  ? 'Cập nhật Preset'
                  : 'Lưu Preset mới'}
              </span>
              <button
                type="button"
                className="preset-popover-close"
                onClick={() => {
                  setIsSavePopoverOpen(false)
                  setIsCreatingNewVariant(false)
                }}
              >
                <X size={12} />
              </button>
            </div>

            {/* TRƯỜNG HỢP 2: ĐÃ CÓ ACTIVE PRESET */}
            {activePreset && !isCreatingNewVariant ? (
              <div className="preset-popover-body">
                <div className="preset-popover-info">
                  Đang chọn preset: <strong>{activePreset.name}</strong>
                  {isContentModified ? (
                    <span className="text-amber-400 text-[11px] block mt-1">
                      ⚠️ Nội dung editor đã thay đổi so với preset gốc.
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px] block mt-1">
                      Nội dung editor hiện trùng khớp với preset này.
                    </span>
                  )}
                </div>

                <div className="preset-popover-actions">
                  <button
                    type="button"
                    className="preset-btn-primary"
                    onClick={handleOverwriteActive}
                  >
                    <Save size={12} />
                    <span>Cập nhật đè lên "{activePreset.name}"</span>
                  </button>

                  <div className="preset-popover-divider">
                    <span>hoặc</span>
                  </div>

                  <button
                    type="button"
                    className="preset-btn-secondary"
                    onClick={() => {
                      setIsCreatingNewVariant(true)
                      setNewPresetName(`${activePreset.name} (Copy)`)
                    }}
                  >
                    <Plus size={12} />
                    <span>Lưu thành Preset mới...</span>
                  </button>
                </div>
              </div>
            ) : (
              /* TRƯỜNG HỢP 1: TẠO PRESET MỚI */
              <form onSubmit={handleSaveNew} className="preset-popover-body">
                <label className="preset-popover-label">
                  Tên Preset:
                  <input
                    ref={inputNewRef}
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Ví dụ: CN Quận 1 (Bình thường)"
                    className="preset-popover-input"
                    autoFocus
                  />
                </label>

                <div className="preset-popover-btn-row">
                  <button
                    type="button"
                    className="preset-btn-cancel"
                    onClick={() => {
                      setIsSavePopoverOpen(false)
                      setIsCreatingNewVariant(false)
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="preset-btn-submit"
                    disabled={!newPresetName.trim()}
                  >
                    <Check size={12} />
                    <span>Lưu</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
