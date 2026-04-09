'use client'

import React, { useCallback, useState } from 'react'
import { THEME_PRESETS, type ThemePreset } from '../../styles/theme-presets.js'
import { applyTheme, generateThemeCSS } from '../../utils/themeApplier.js'
import { useAupT } from '../../utils/useTranslation.js'

/**
 * Theme marketplace component — export current theme as JSON, import community themes.
 * Validates imported themes against the ThemePreset schema.
 */
export const ThemeMarketplace: React.FC = () => {
  const t = useAupT()
  const [importValue, setImportValue] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [previewTheme, setPreviewTheme] = useState<ThemePreset | null>(null)

  const handleExportCurrent = useCallback(async () => {
    // Read the current theme from settings
    try {
      const res = await fetch('/api/globals/aup-settings', { credentials: 'include' })
      const data = await res.json()
      const presetId = data?.theme?.preset || 'indigo-pro'
      const theme = THEME_PRESETS.find((t) => t.id === presetId)

      if (theme) {
        const json = JSON.stringify(theme, null, 2)
        await navigator.clipboard.writeText(json)
        setStatus({ type: 'success', message: 'Theme JSON copied to clipboard!' })
      } else {
        setStatus({ type: 'error', message: 'No theme found to export' })
      }
    } catch {
      setStatus({ type: 'error', message: 'Failed to export theme' })
    }
    setTimeout(() => setStatus(null), 3000)
  }, [])

  const handlePreview = useCallback(() => {
    if (!importValue.trim()) return
    try {
      const parsed = JSON.parse(importValue)
      if (!validateTheme(parsed)) {
        setStatus({ type: 'error', message: 'Invalid theme format — requires id, name, colors, login, dark' })
        return
      }
      setPreviewTheme(parsed)
      // Apply live preview
      const css = generateThemeCSS(parsed)
      let el = document.getElementById('aup-theme-override')
      if (!el) {
        el = document.createElement('style')
        el.id = 'aup-theme-override'
        document.head.appendChild(el)
      }
      el.textContent = css
      setStatus({ type: 'success', message: 'Theme previewed — save settings to keep it' })
    } catch {
      setStatus({ type: 'error', message: 'Invalid JSON syntax' })
    }
    setTimeout(() => setStatus(null), 4000)
  }, [importValue])

  const handleRevert = useCallback(() => {
    setPreviewTheme(null)
    // Re-apply saved theme
    fetch('/api/globals/aup-settings', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { if (data?.theme) applyTheme(data) })
      .catch(() => {})
  }, [])

  return (
    <div style={containerStyle}>
      <div style={rowStyle}>
        <button onClick={handleExportCurrent} type="button" style={btnPrimaryStyle}>
          📤 {t('themeExportCurrent')}
        </button>
      </div>

      <div style={importBoxStyle}>
        <textarea
          value={importValue}
          onChange={(e) => setImportValue(e.target.value)}
          placeholder={t('themePasteHere')}
          style={textareaStyle}
          rows={4}
        />
        <div style={importActionsStyle}>
          <button onClick={handlePreview} type="button" style={btnPrimaryStyle} disabled={!importValue.trim()}>
            👁 {t('themePreviewBtn')}
          </button>
          {previewTheme && (
            <button onClick={handleRevert} type="button" style={btnSecondaryStyle}>
              ↩ {t('themeRevert')}
            </button>
          )}
        </div>
      </div>

      {previewTheme && (
        <div style={previewInfoStyle}>
          {t('themePreviewing')}: <strong>{previewTheme.name}</strong> — {previewTheme.description}
        </div>
      )}

      {status && (
        <div style={{
          ...statusStyle,
          background: status.type === 'success' ? 'var(--aup-green-subtle)' : 'var(--aup-red-subtle)',
          color: status.type === 'success' ? 'var(--aup-green)' : 'var(--aup-red)',
        }}>
          {status.message}
        </div>
      )}
    </div>
  )
}

function validateTheme(obj: any): obj is ThemePreset {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.colors === 'object' &&
    typeof obj.colors.accent === 'string' &&
    typeof obj.login === 'object' &&
    typeof obj.dark === 'object'
  )
}

const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px',
}

const rowStyle: React.CSSProperties = {
  display: 'flex', gap: '8px',
}

const importBoxStyle: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '10px',
  overflow: 'hidden',
}

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  border: 'none', outline: 'none', resize: 'vertical',
  fontSize: '11px', fontFamily: 'var(--aup-font-numeric)',
  backgroundColor: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
}

const importActionsStyle: React.CSSProperties = {
  display: 'flex', gap: '8px', padding: '8px 14px',
  borderTop: '1px solid var(--theme-elevation-100)',
  backgroundColor: 'var(--theme-elevation-50)',
}

const btnPrimaryStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: '8px',
  border: 'none', background: 'var(--aup-accent)',
  color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
}

const btnSecondaryStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: '8px',
  border: '1px solid var(--theme-elevation-200)',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
  fontSize: '12px', fontWeight: 500, cursor: 'pointer',
}

const previewInfoStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: '8px',
  background: 'var(--aup-accent-subtle)',
  color: 'var(--aup-accent)',
  fontSize: '12px', fontWeight: 500,
}

const statusStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: '8px',
  fontSize: '12px', fontWeight: 600,
}
