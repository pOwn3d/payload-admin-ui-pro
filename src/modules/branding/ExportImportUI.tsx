'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'

/**
 * Export/Import UI component for settings.
 * Replaces the raw JSON field with copy/paste buttons and a preview area.
 */
export const ExportImportUI: React.FC = () => {
  const t = useAupT()
  const [config, setConfig] = useState<string>('')
  const [importValue, setImportValue] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch current config on mount
  useEffect(() => {
    fetch('/api/globals/aup-settings', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          // Strip internal fields
          const { id, globalType, createdAt, updatedAt, ...exportable } = data
          setConfig(JSON.stringify(exportable, null, 2))
        }
      })
      .catch(() => {})
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(config)
      setStatus({ type: 'success', message: t('configCopied') })
      setTimeout(() => setStatus(null), 3000)
    } catch {
      setStatus({ type: 'error', message: t('copyToClipboard') + ' ✗' })
    }
  }, [config, t])

  const handleImport = useCallback(async () => {
    if (!importValue.trim()) return

    try {
      const parsed = JSON.parse(importValue)
      // Validate it has expected shape
      if (typeof parsed !== 'object' || parsed === null) {
        setStatus({ type: 'error', message: 'Invalid config: must be a JSON object' })
        return
      }

      setLoading(true)
      const res = await fetch('/api/globals/aup-settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })

      if (res.ok) {
        setStatus({ type: 'success', message: t('configImported') })
        setImportValue('')
        // Reload to apply
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setStatus({ type: 'error', message: 'Import failed — check JSON format' })
      }
    } catch {
      setStatus({ type: 'error', message: 'Invalid JSON — please check syntax' })
    } finally {
      setLoading(false)
    }
  }, [importValue, t])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      setImportValue(text)
    } catch {
      setStatus({ type: 'error', message: t('pasteFromClipboard') + ' ✗' })
    }
  }, [])

  return (
    <div style={containerStyle}>
      {/* Export section */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={sectionTitleStyle}>📤 {t('exportConfig')}</span>
          <button onClick={handleCopy} type="button" style={buttonStyle}>
            {t('copyToClipboard')}
          </button>
        </div>
        <pre style={previewStyle}>{config || '...'}</pre>
      </div>

      {/* Import section */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={sectionTitleStyle}>📥 {t('importConfig')}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handlePaste} type="button" style={buttonSecondaryStyle}>
              {t('pasteFromClipboard')}
            </button>
            <button
              onClick={handleImport}
              type="button"
              disabled={!importValue.trim() || loading}
              style={{
                ...buttonStyle,
                opacity: !importValue.trim() || loading ? 0.5 : 1,
              }}
            >
              {loading ? '...' : t('applyImport')}
            </button>
          </div>
        </div>
        <textarea
          value={importValue}
          onChange={(e) => setImportValue(e.target.value)}
          placeholder={t('pasteJsonHere')}
          style={textareaStyle}
          rows={6}
        />
      </div>

      {/* Status message */}
      {status && (
        <div style={{
          ...statusStyle,
          backgroundColor: status.type === 'success' ? 'var(--aup-green-subtle)' : 'var(--aup-red-subtle)',
          color: status.type === 'success' ? 'var(--aup-green)' : 'var(--aup-red)',
        }}>
          {status.type === 'success' ? '✓' : '✗'} {status.message}
        </div>
      )}
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '16px',
}

const sectionStyle: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '12px',
  overflow: 'hidden',
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: '1px solid var(--theme-elevation-100)',
  backgroundColor: 'var(--theme-elevation-50)',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: 'var(--theme-text)',
}

const buttonStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: '8px',
  border: 'none', background: 'var(--aup-accent)',
  color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
}

const buttonSecondaryStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: '8px',
  border: '1px solid var(--aup-accent-border)', background: 'var(--aup-accent-subtle)',
  color: 'var(--aup-accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
}

const previewStyle: React.CSSProperties = {
  margin: 0, padding: '12px 16px',
  fontSize: '11px', lineHeight: 1.6,
  maxHeight: '200px', overflow: 'auto',
  backgroundColor: 'var(--theme-elevation-0)',
  color: 'var(--theme-elevation-600)',
  fontFamily: 'var(--aup-font-numeric)',
}

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px',
  border: 'none', outline: 'none', resize: 'vertical',
  fontSize: '11px', lineHeight: 1.6,
  fontFamily: 'var(--aup-font-numeric)',
  backgroundColor: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
}

const statusStyle: React.CSSProperties = {
  padding: '10px 16px', borderRadius: '8px',
  fontSize: '13px', fontWeight: 600,
}
