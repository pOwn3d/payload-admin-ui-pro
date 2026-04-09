'use client'

import React from 'react'
// @ts-ignore — @payloadcms/ui is a peer dependency
import { useField } from '@payloadcms/ui'

/**
 * Rating field — replaces a number input (0-5 or 0-10) with clickable stars.
 * Uses Payload's useField hook.
 */
export const RatingField: React.FC<{
  path: string
  field: {
    label?: string | Record<string, string>
    max?: number
    admin?: { description?: string | Record<string, string> }
  }
}> = ({ path, field }) => {
  const { value, setValue } = useField<number>({ path })
  const label = resolveLabel(field.label)
  const max = field.max || 5
  const description = resolveLabel(field.admin?.description)
  const current = typeof value === 'number' ? value : 0

  return (
    <div style={wrapperStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={starsContainerStyle} role="radiogroup" aria-label={label || 'Rating'}>
        {Array.from({ length: max }, (_, i) => {
          const starValue = i + 1
          const isFilled = starValue <= current
          return (
            <button
              key={starValue}
              type="button"
              role="radio"
              aria-checked={starValue === current}
              aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
              onClick={() => setValue(starValue === current ? 0 : starValue)}
              style={starBtnStyle}
            >
              <span style={{ color: isFilled ? starFilledColor : starEmptyColor, fontSize: '1.5rem', lineHeight: 1 }}>
                {isFilled ? '★' : '☆'}
              </span>
            </button>
          )
        })}
        <span style={valueStyle}>{current}/{max}</span>
      </div>
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

const wrapperStyle: React.CSSProperties = { padding: '0.75rem 0' }

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--theme-text)',
  marginBottom: '0.5rem',
}

const starsContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.125rem',
}

const starBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0.125rem',
  transition: 'transform 0.1s ease',
}

const starFilledColor = 'var(--color-warning-500, #eab308)'
const starEmptyColor = 'var(--theme-elevation-300)'

const valueStyle: React.CSSProperties = {
  marginLeft: '0.5rem',
  fontSize: '0.8125rem',
  color: 'var(--theme-elevation-500)',
  fontWeight: 500,
}

const descStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--theme-elevation-500)',
  margin: '0.375rem 0 0',
}
