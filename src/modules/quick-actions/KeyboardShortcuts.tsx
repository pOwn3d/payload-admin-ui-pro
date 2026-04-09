'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'

interface ShortcutDef {
  key: string
  mod: boolean
  shift?: boolean
  label: string
  action: () => void
}

/**
 * Global keyboard shortcuts handler.
 * Injected via providers to run on every admin page.
 * Shortcuts:
 * - ⌘/ → show shortcut help
 * - ⌘E → toggle sidebar
 * - ⌘S → save (triggers Payload's save button)
 * - ⌘G → go to collections (focuses search)
 */
export const KeyboardShortcuts: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useAupT()
  const [showHelp, setShowHelp] = useState(false)

  const shortcutsRef = useRef<ShortcutDef[]>([])
  shortcutsRef.current = [
    {
      key: '/', mod: true,
      label: t('shortcuts'),
      action: () => setShowHelp((v) => !v),
    },
    {
      key: 'e', mod: true,
      label: 'Toggle sidebar',
      action: () => {
        const toggler = document.querySelector<HTMLButtonElement>('[class*="nav-toggler"], .template-default__nav-toggler')
        toggler?.click()
      },
    },
    {
      key: 's', mod: true,
      label: 'Save document',
      action: () => {
        const saveBtn = document.querySelector<HTMLButtonElement>('.form-submit .btn, button[type="submit"]')
        saveBtn?.click()
      },
    },
  ]

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey

    for (const s of shortcutsRef.current) {
      if (s.mod && !mod) continue
      if (s.shift && !e.shiftKey) continue
      if (e.key.toLowerCase() !== s.key) continue

      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow ⌘S even in inputs
        if (s.key !== 's') continue
      }

      e.preventDefault()
      s.action()
      return
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <>
      {children}
      {showHelp && (
        <>
          <div
            style={overlayStyle}
            onClick={() => setShowHelp(false)}
            aria-hidden="true"
          />
          <div style={dialogStyle} role="dialog" aria-label="Keyboard shortcuts">
            <h3 style={titleStyle}>⌨ {t('shortcuts')}</h3>
            <div style={listStyle}>
              {shortcutsRef.current.map((s) => (
                <div key={s.key} style={rowStyle}>
                  <span style={labelStyle}>{s.label}</span>
                  <kbd style={kbdStyle}>
                    {s.mod ? '⌘' : ''}{s.shift ? '⇧' : ''}{s.key.toUpperCase()}
                  </kbd>
                </div>
              ))}
              <div style={rowStyle}>
                <span style={labelStyle}>Command palette</span>
                <kbd style={kbdStyle}>⌘K</kbd>
              </div>
            </div>
            <button onClick={() => setShowHelp(false)} type="button" style={closeBtnStyle}>
              {t('close')} <kbd style={{ ...kbdStyle, marginLeft: '6px' }}>ESC</kbd>
            </button>
          </div>
        </>
      )}
    </>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'hsl(220 40% 10% / 0.40)',
  backdropFilter: 'blur(4px)',
  zIndex: 99998,
}

const dialogStyle: React.CSSProperties = {
  position: 'fixed', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'min(420px, calc(100vw - 32px))',
  background: 'var(--theme-elevation-50)',
  borderRadius: '16px',
  border: 'var(--aup-border-subtle)',
  boxShadow: 'var(--aup-shadow-4)',
  padding: '24px',
  zIndex: 99999,
}

const titleStyle: React.CSSProperties = {
  margin: '0 0 16px', fontSize: '16px', fontWeight: 700,
  color: 'var(--theme-text)',
}

const listStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '8px',
}

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '8px 12px', borderRadius: '8px',
  background: 'var(--theme-elevation-0)',
  border: 'var(--aup-border-subtle)',
}

const labelStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 500, color: 'var(--theme-text)',
}

const kbdStyle: React.CSSProperties = {
  padding: '3px 8px', borderRadius: '6px',
  background: 'var(--theme-elevation-100)',
  border: '1px solid var(--theme-elevation-200)',
  fontSize: '11px', fontWeight: 600,
  fontFamily: 'var(--aup-font-numeric)',
  color: 'var(--theme-elevation-600)',
}

const closeBtnStyle: React.CSSProperties = {
  marginTop: '16px', width: '100%',
  padding: '10px', borderRadius: '10px',
  border: 'var(--aup-border-subtle)',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
