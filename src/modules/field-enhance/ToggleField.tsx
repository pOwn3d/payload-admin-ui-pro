'use client'

import React from 'react'
// @ts-ignore — @payloadcms/ui is a peer dependency
import { useField } from '@payloadcms/ui'

/**
 * Toggle switch — replaces the default checkbox with a visual switch.
 * Uses Payload's useField hook for data binding.
 */
export const ToggleField: React.FC<{ path: string; field: { label?: string | Record<string, string>; admin?: { description?: string | Record<string, string> } } }> = ({ path, field }) => {
  const { value, setValue } = useField<boolean>({ path })
  const label = resolveLabel(field.label)
  const description = resolveLabel(field.admin?.description)

  return (
    <div style={wrapperStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <button
        type="button"
        role="switch"
        aria-checked={!!value}
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
