'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'

// ─── Types ──────────────────────────────────────────────────────────────────

interface SavedView {
  name: string
  query: string       // URL search params string
  viewMode?: string   // current view mode when saved
  columns?: string[]  // visible column slugs
  createdAt: number   // timestamp for ordering
}

interface SavedViewsStore {
  views: SavedView[]
}

// ─── Preference Key ─────────────────────────────────────────────────────────

const PREF_KEY_PREFIX = 'aup-saved-views:'

function prefKey(collection: string): string {
  return `${PREF_KEY_PREFIX}${collection}`
}

// ─── Server-side Preference Helpers ─────────────────────────────────────────

async function loadViews(collection: string): Promise<SavedView[]> {
  try {
    const key = encodeURIComponent(prefKey(collection))
    const res = await fetch(`/api/payload-preferences/${key}`, { credentials: 'include' })
    if (!res.ok) return []
    const data = await res.json()
    // Payload preferences store the value in `docs[0].value` or directly
    const value = data?.docs?.[0]?.value ?? data?.value
    if (value && Array.isArray(value.views)) return value.views
    return []
  } catch {
    return []
  }
}

async function persistViews(collection: string, views: SavedView[]): Promise<void> {
  const key = prefKey(collection)
  const payload: SavedViewsStore = { views }
  try {
    await fetch('/api/payload-preferences', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: payload }),
    })
  } catch {
    // Silently fail — non-critical
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * SavedViews — server-persisted saved views (replaces SavedFilters).
 * Uses Payload preferences API to store per-user, per-collection view presets.
 *
 * Captures: name, query string, current view mode, visible columns.
 */
export const SavedViews: React.FC<{ collection: string; currentViewMode?: string }> = ({
  collection,
  currentViewMode,
}) => {
  const t = useAupT()
  const [views, setViews] = useState<SavedView[]>([])
  const [showSave, setShowSave] = useState(false)
  const [viewName, setViewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Load from server on mount
  useEffect(() => {
    loadViews(collection).then((loaded) => {
      setViews(loaded)
      setLoading(false)
    })
  }, [collection])

  const saveView = useCallback(async () => {
    if (!viewName.trim()) return
    const newView: SavedView = {
      name: viewName.trim(),
      query: window.location.search,
      viewMode: currentViewMode,
      createdAt: Date.now(),
    }
    const updated = [...views, newView]
    setViews(updated)
    await persistViews(collection, updated)
    setViewName('')
    setShowSave(false)
  }, [viewName, views, collection, currentViewMode])

  const applyView = useCallback((view: SavedView) => {
    const base = window.location.pathname
    window.location.href = base + view.query
  }, [])

  const deleteView = useCallback(async (index: number) => {
    const updated = views.filter((_, i) => i !== index)
    setViews(updated)
    await persistViews(collection, updated)
  }, [views, collection])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-aup-saved-views]')) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [dropdownOpen])

  return (
    <div style={containerStyle} data-aup-saved-views>
      {/* Save current view button */}
      <button
        onClick={() => setShowSave(!showSave)}
        type="button"
        style={saveTriggerStyle}
        title={t('saveCurrentView') || 'Save current view'}
      >
        + {t('saveView') || 'Save View'}
      </button>

      {/* Dropdown toggle for saved views */}
      {views.length > 0 && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            type="button"
            style={dropdownTriggerStyle}
          >
            🔖 {views.length} {t('savedViews') || 'saved'}
            <span style={{ fontSize: '10px', marginLeft: '4px' }}>{dropdownOpen ? '▲' : '▼'}</span>
          </button>

          {dropdownOpen && (
            <div style={dropdownStyle}>
              {views.map((view, i) => (
                <div key={`${view.name}-${view.createdAt}`} style={dropdownItemStyle}>
                  <button
                    onClick={() => { applyView(view); setDropdownOpen(false) }}
                    type="button"
                    style={viewBtnStyle}
                  >
                    <span style={viewNameStyle}>{view.name}</span>
                    {view.viewMode && (
                      <span style={viewModeTagStyle}>{view.viewMode}</span>
                    )}
                  </button>
                  <button
                    onClick={() => deleteView(i)}
                    type="button"
                    style={deleteBtnStyle}
                    aria-label={t('deleteView') || 'Delete view'}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <span style={loadingStyle}>...</span>}

      {/* Inline save form */}
      {showSave && (
        <div style={saveRowStyle}>
          <input
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder={t('viewName') || 'View name...'}
            style={inputStyle}
            onKeyDown={(e) => e.key === 'Enter' && saveView()}
            autoFocus
          />
          <button
            onClick={saveView}
            type="button"
            style={confirmBtnStyle}
            disabled={!viewName.trim()}
          >
            ✓
          </button>
          <button
            onClick={() => { setShowSave(false); setViewName('') }}
            type="button"
            style={cancelBtnStyle}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
}

const saveTriggerStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--aup-accent)',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const dropdownTriggerStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '6px',
  border: '1px solid var(--theme-elevation-200)',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  minWidth: '220px',
  maxHeight: '300px',
  overflowY: 'auto',
  background: 'var(--theme-elevation-0)',
  border: '1px solid var(--theme-elevation-200)',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  zIndex: 100,
}

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  borderBottom: '1px solid var(--theme-elevation-100)',
}

const viewBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  background: 'none',
  border: 'none',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--theme-text)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
}

const viewNameStyle: React.CSSProperties = {
  flex: 1,
}

const viewModeTagStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  padding: '2px 6px',
  borderRadius: '4px',
  background: 'var(--aup-accent-subtle, var(--theme-elevation-100))',
  color: 'var(--aup-accent, var(--theme-elevation-500))',
}

const deleteBtnStyle: React.CSSProperties = {
  padding: '8px 10px',
  background: 'none',
  border: 'none',
  borderLeft: '1px solid var(--theme-elevation-100)',
  fontSize: '14px',
  color: 'var(--theme-elevation-400)',
  cursor: 'pointer',
}

const loadingStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--theme-elevation-400)',
}

const saveRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid var(--theme-elevation-200)',
  fontSize: '12px',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
  outline: 'none',
  minWidth: '140px',
}

const confirmBtnStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: '6px',
  border: 'none',
  background: 'var(--aup-accent)',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: '6px',
  border: '1px solid var(--theme-elevation-200)',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-elevation-400)',
  fontSize: '12px',
  cursor: 'pointer',
}
