'use client'

import React from 'react'
// @ts-ignore — @payloadcms/ui is a peer dependency
import { useField } from '@payloadcms/ui'

interface Option {
  label: string | Record<string, string>
  value: string
}

/**
 * Status badge field — replaces a select field with colored pill badges.
 * Uses Payload's useField hook.
 */
export const StatusBadgeField: React.FC<{
  path: string
  field: {
    label?: string | Record<string, string>
    options?: Array<Option | string>
    admin?: { description?: string | Record<string, string> }
  }
}> = ({ path, field }) => {
  const { value, setValue } = useField<string>({ path })
  const label = resolveLabel(field.label)
  const options = normalizeOptions(field.options)

  return (
    <div style={wrapperStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={badgesContainerStyle}>
        {options.map((opt) => {
          const isActive = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue(opt.value)}
              style={{
                ...badgeStyle,
                ...(isActive ? activeBadgeStyle(opt.value) : inactiveBadgeStyle),
              }}
            >
              {isActive && <span style={dotStyle(opt.value)} />}
              {resolveLabel(opt.label) || opt.value}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Status badge cell — compact badge for list view table cells.
 */
export const StatusBadgeCell: React.FC<{ cellData: string }> = ({ cellData }) => {
  if (!cellData) return null
  return (
    <span style={cellBadgeStyle(cellData)}>
      {cellData}
    </span>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeOptions(options: Array<Option | string> | undefined): Option[] {
  if (!options) return []
  return options.map((opt) => {
    if (typeof opt === 'string') return { label: opt, value: opt }
    return opt
  })
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

// Color mapping for common status values
function getStatusColor(status: string): { bg: string; text: string; dot: string } {
  const s = status.toLowerCase()
  if (s === 'published' || s === 'active' || s === 'completed' || s === 'approved') {
    return { bg: 'var(--color-success-100, #dcfce7)', text: 'var(--color-success-700, #15803d)', dot: 'var(--color-success-500, #22c55e)' }
  }
  if (s === 'draft' || s === 'pending' || s === 'review') {
    return { bg: 'var(--color-warning-100, #fef3c7)', text: 'var(--color-warning-700, #a16207)', dot: 'var(--color-warning-500, #eab308)' }
  }
  if (s === 'archived' || s === 'inactive' || s === 'rejected' || s === 'cancelled') {
    return { bg: 'var(--color-error-100, #fee2e2)', text: 'var(--color-error-700, #b91c1c)', dot: 'var(--color-error-500, #ef4444)' }
  }
  if (s === 'processing' || s === 'in-progress' || s === 'shipped') {
    return { bg: 'var(--color-blue-100, #dbeafe)', text: 'var(--color-blue-700, #1d4ed8)', dot: 'var(--color-blue-500, #3b82f6)' }
  }
  return { bg: 'var(--theme-elevation-100)', text: 'var(--theme-elevation-700)', dot: 'var(--theme-elevation-400)' }
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const wrapperStyle: React.CSSProperties = { padding: '0.75rem 0' }

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--theme-text)',
  marginBottom: '0.5rem',
}

const badgesContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.375rem',
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.375rem 0.75rem',
  borderRadius: '9999px',
  border: '1px solid transparent',
  fontSize: '0.8125rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

function activeBadgeStyle(status: string): React.CSSProperties {
  const colors = getStatusColor(status)
  return {
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.dot,
  }
}

const inactiveBadgeStyle: React.CSSProperties = {
  backgroundColor: 'var(--theme-elevation-50)',
  color: 'var(--theme-elevation-500)',
  borderColor: 'var(--theme-elevation-200)',
}

function dotStyle(status: string): React.CSSProperties {
  return {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: getStatusColor(status).dot,
  }
}

function cellBadgeStyle(status: string): React.CSSProperties {
  const colors = getStatusColor(status)
  return {
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    backgroundColor: colors.bg,
    color: colors.text,
  }
}
