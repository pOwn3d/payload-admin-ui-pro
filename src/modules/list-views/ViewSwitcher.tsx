'use client'

import React from 'react'
import type { ViewMode } from './types.js'

interface ViewSwitcherProps {
  current: ViewMode
  available: ViewMode[]
  onChange: (mode: ViewMode) => void
}

const VIEW_ICONS: Record<ViewMode, { icon: string; label: string }> = {
  table: { icon: '☰', label: 'Table' },
  cards: { icon: '▦', label: 'Cards' },
  gallery: { icon: '▣', label: 'Gallery' },
  kanban: { icon: '⊞', label: 'Kanban' },
  calendar: { icon: '📅', label: 'Calendar' },
}

/**
 * View mode switcher — toolbar component that toggles between
 * table, cards, gallery, and kanban views.
 */
export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  current,
  available,
  onChange,
}) => {
  if (available.length <= 1) return null

  return (
    <div style={containerStyle} role="toolbar" aria-label="View mode">
      {available.map((mode) => {
        const { icon, label } = VIEW_ICONS[mode]
        const isActive = mode === current
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            style={{
              ...buttonStyle,
              ...(isActive ? activeButtonStyle : {}),
            }}
            type="button"
            aria-pressed={isActive}
            aria-label={label}
            title={label}
          >
            <span style={iconStyle}>{icon}</span>
          </button>
        )
      })}
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'inline-flex',
  borderRadius: 'var(--style-radius-s, 6px)',
  border: '1px solid var(--theme-elevation-200)',
  overflow: 'hidden',
}

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '32px',
  border: 'none',
  borderRight: '1px solid var(--theme-elevation-150)',
  backgroundColor: 'var(--theme-elevation-0)',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
}

const activeButtonStyle: React.CSSProperties = {
  backgroundColor: 'var(--theme-elevation-100)',
  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
}

const iconStyle: React.CSSProperties = {
  fontSize: '1rem',
  lineHeight: 1,
}
