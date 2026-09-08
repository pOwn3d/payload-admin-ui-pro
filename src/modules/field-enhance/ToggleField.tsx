'use client'

import React, { useId } from 'react'
// @ts-ignore — @payloadcms/ui is a peer dependency
import { useField } from '@payloadcms/ui'
import { withAupErrorBoundary } from '../../utils/ErrorBoundary.js'

/**
 * Toggle switch — replaces the default checkbox with a visual switch.
 * Uses Payload's useField hook for data binding.
 */
const ToggleFieldInner: React.FC<{ path: string; field: { label?: string | Record<string, string>; admin?: { description?: string | Record<string, string> } } }> = ({ path, field }) => {
  const { value, setValue } = useField<boolean>({ path })
  const label = resolveLabel(field.label)
  const description = resolveLabel(field.admin?.description)

  // `useId` and not a literal: this component renders once per enhanced
  // checkbox, and a localised collection renders it once per language tab.
  // Duplicated ids break the very association being created here.
  const reactId = useId()
  const labelId = `${reactId}-label`

  return (
    <div style={wrapperStyle}>
      {/*
        The switch used to have NO accessible name at all: `role="switch"` and
        `aria-checked` were correct, but the label next to it was a bare
        `<label>` bound to nothing, so a screen reader announced "switch, off"
        with no indication of WHICH setting was being toggled.

        `htmlFor` is what restores the click target (a `<button>` is a labelable
        element), and `aria-labelledby` is what makes the name unambiguous —
        the accessible-name algorithm prefers a button's own content, which is
        empty here.
      */}
      {label && <label id={labelId} htmlFor={reactId} style={labelStyle}>{label}</label>}
      <button
        type="button"
        id={reactId}
        role="switch"
        aria-checked={!!value}
        aria-labelledby={label ? labelId : undefined}
        onClick={() => setValue(!value)}
        style={{
          ...trackStyle,
          backgroundColor: value
            ? 'var(--theme-success-500)'
            : 'var(--theme-elevation-200)',
        }}
      >
        <span
          style={{
            ...thumbStyle,
            transform: value ? 'translateX(18px)' : 'translateX(2px)',
          }}
        />
      </button>
      {description && <p style={descStyle}>{description}</p>}
    </div>
  )
}

function resolveLabel(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    const obj = val as Record<string, string>
    return obj.fr || obj.en || Object.values(obj)[0] || null
  }
  return null
}

const wrapperStyle: React.CSSProperties = {
  padding: '0.75rem 0',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--theme-text)',
  marginBottom: '0.5rem',
}

const trackStyle: React.CSSProperties = {
  position: 'relative',
  width: '42px',
  height: '24px',
  borderRadius: '12px',
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  padding: 0,
}

const thumbStyle: React.CSSProperties = {
  position: 'absolute',
  top: '2px',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: '#fff',
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  transition: 'transform 0.2s ease',
}

const descStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--theme-elevation-500)',
  margin: '0.375rem 0 0',
}

/** Exported through the boundary: Payload mounts this straight from the
  * import map, so the module itself is the only place a boundary fits. */
export const ToggleField = withAupErrorBoundary(ToggleFieldInner, 'ToggleField')
