'use client'

import React, { useCallback, useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark' | 'auto'

const STORAGE_KEY = 'aup-theme-mode'

/**
 * Dark mode toggle button injected into the admin header via afterNavLinks.
 * Cycles through: auto → light → dark.
 * Persists preference in localStorage.
 */
export const DarkModeToggle: React.FC = () => {
  const [mode, setMode] = useState<ThemeMode>('auto')

  // Read preference on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
      if (stored && ['light', 'dark', 'auto'].includes(stored)) {
        setMode(stored)
        applyMode(stored)
      }
    } catch {}
  }, [])

  const cycle = useCallback(() => {
    const next: ThemeMode = mode === 'auto' ? 'light' : mode === 'light' ? 'dark' : 'auto'
    setMode(next)
    applyMode(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
  }, [mode])

  const icon = mode === 'dark' ? '🌙' : mode === 'light' ? '☀️' : '🌓'
  const label = mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'Auto'

  return (
    <button
      onClick={cycle}
      type="button"
      title={`Theme: ${label}`}
      aria-label={`Switch theme (current: ${label})`}
      style={btnStyle}
    >
      <span style={{ fontSize: '14px' }}>{icon}</span>
    </button>
  )
}

function applyMode(mode: ThemeMode) {
  const html = document.documentElement

  if (mode === 'auto') {
    // Remove override, let system preference apply
    html.removeAttribute('data-theme')
    // Payload uses data-theme attribute — let it handle auto
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    html.setAttribute('data-theme', mode)
  }
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '6px 8px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 150ms',
}
