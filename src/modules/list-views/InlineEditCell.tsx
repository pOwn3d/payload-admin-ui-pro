'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'

type InlineEditType = 'text' | 'select' | 'number'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface InlineEditCellProps {
  /** Payload collection slug */
  collection: string
  /** Document ID */
  docId: string | number
  /** Field name to update */
  fieldName: string
  /** Current value */
  value: string | number | null
  /** Input type */
  type?: InlineEditType
  /** Options for select type */
  options?: string[]
  /** Called after a successful save */
  onSaved?: (newValue: string | number) => void
  /** Children to render in display mode (defaults to value as text) */
  children?: React.ReactNode
}

/**
 * Inline editing cell — double-click to edit a field directly from list views.
 * Single click passes through to the parent (navigation link).
 * Enter or blur saves via PATCH. Escape cancels.
 */
export const InlineEditCell: React.FC<InlineEditCellProps> = ({
  collection,
  docId,
  fieldName,
  value,
  type = 'text',
  options,
  onSaved,
  children,
}) => {
  const t = useAupT()
  const [editing, setEditing] = useState(false)
  const [tempValue, setTempValue] = useState<string>(String(value ?? ''))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync tempValue when value changes externally
  useEffect(() => {
    if (!editing) {
      setTempValue(String(value ?? ''))
    }
  }, [value, editing])

  // Focus input when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      }
    }
  }, [editing])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const startEditing = useCallback((e: React.MouseEvent) => {
    // Prevent navigation from parent <a> tag
    e.preventDefault()
    e.stopPropagation()
    setEditing(true)
  }, [])

  const cancel = useCallback(() => {
    setEditing(false)
    setTempValue(String(value ?? ''))
    setSaveState('idle')
  }, [value])

  const save = useCallback(async () => {
    const newValue = type === 'number' ? Number(tempValue) : tempValue

    // No change — just close
    if (String(newValue) === String(value ?? '')) {
      setEditing(false)
      return
    }

    setSaveState('saving')

    try {
      const res = await fetch(`/api/${collection}/${docId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: newValue }),
      })

      if (!res.ok) {
        throw new Error(`PATCH failed: ${res.status}`)
      }

      setEditing(false)
      setSaveState('saved')
      onSaved?.(newValue)

      // Clear saved indicator after 1s
      savedTimerRef.current = setTimeout(() => {
        setSaveState('idle')
      }, 1000)
    } catch {
      // Revert value and show error
      setTempValue(String(value ?? ''))
      setSaveState('error')
      setEditing(false)

      // Clear error indicator after 2s
      savedTimerRef.current = setTimeout(() => {
        setSaveState('idle')
      }, 2000)
    }
  }, [collection, docId, fieldName, tempValue, type, value, onSaved])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        save()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        cancel()
      }
    },
    [save, cancel],
  )

  // Prevent click propagation in edit mode so parent <a> doesn't navigate
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (editing) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [editing])

  // ── Editing mode ─────────────────────────────────────────────────

  if (editing) {
    const sharedProps = {
      onKeyDown: handleKeyDown,
      onBlur: save,
      onClick: handleClick,
      style: inputStyle,
    }

    if (type === 'select' && options) {
      return (
        <span style={wrapperStyle} onClick={handleClick}>
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={tempValue}
            onChange={(e) => {
              setTempValue(e.target.value)
              // Auto-save on select change
              setTimeout(() => {
                e.target.blur()
              }, 0)
            }}
            {...sharedProps}
            style={selectStyle}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </span>
      )
    }

    return (
      <span style={wrapperStyle} onClick={handleClick}>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          {...sharedProps}
        />
        {saveState === 'saving' && (
          <span style={savingIndicatorStyle}>{t('inlineSaving')}</span>
        )}
      </span>
    )
  }

  // ── Display mode ─────────────────────────────────────────────────

  return (
    <span
      style={displayStyle}
      onDoubleClick={startEditing}
      title={t('inlineEdit')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        // Enter or F2 to start editing (a11y)
        if (e.key === 'Enter' || e.key === 'F2') {
          e.preventDefault()
          setEditing(true)
        }
      }}
    >
      {children ?? String(value ?? '')}
      {saveState === 'saved' && (
        <span style={savedIndicatorStyle} aria-label={t('inlineSaved')}>
          {'\u2713'}
        </span>
      )}
      {saveState === 'error' && (
        <span style={errorIndicatorStyle} aria-label={t('inlineError')}>
          {'\u2717'}
        </span>
      )}
    </span>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  position: 'relative',
}

const displayStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  cursor: 'default',
  borderBottom: '1px dashed transparent',
  transition: 'border-color 0.15s ease',
  // Dashed border on hover is applied via onMouseEnter/onMouseLeave
  // but since inline styles can't do :hover, we rely on CSS trick below
}

const inputStyle: React.CSSProperties = {
  fontSize: 'inherit',
  fontFamily: 'inherit',
  fontWeight: 'inherit',
  color: 'var(--theme-text)',
  backgroundColor: 'var(--theme-elevation-0)',
  border: '1px solid var(--aup-accent, var(--theme-elevation-300))',
  borderRadius: 'var(--style-radius-s, 4px)',
  padding: '0.125rem 0.375rem',
  outline: 'none',
  width: '100%',
  minWidth: '60px',
  maxWidth: '300px',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'auto',
}

const savingIndicatorStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  color: 'var(--theme-elevation-400)',
  whiteSpace: 'nowrap',
}

const savedIndicatorStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--aup-green, #22c55e)',
  fontWeight: 700,
  marginLeft: '0.25rem',
  animation: 'aup-fade-in 0.15s ease',
}

const errorIndicatorStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--aup-red, #ef4444)',
  fontWeight: 700,
  marginLeft: '0.25rem',
  animation: 'aup-fade-in 0.15s ease',
}
