'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'

interface SavedFilter {
  name: string
  query: string // URL search params string
}

const STORAGE_KEY_PREFIX = 'aup-filters-'

/**
 * Saved filters component — allows users to save and recall URL-based filter presets.
 * Stored in localStorage per collection.
 */
export const SavedFilters: React.FC<{ collection: string }> = ({ collection }) => {
  const t = useAupT()
  const storageKey = STORAGE_KEY_PREFIX + collection
  const [filters, setFilters] = useState<SavedFilter[]>([])
  const [showSave, setShowSave] = useState(false)
  const [filterName, setFilterName] = useState('')

  // Load on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]')
      if (Array.isArray(stored)) setFilters(stored)
    } catch {}
  }, [storageKey])

  const saveFilter = useCallback(() => {
    if (!filterName.trim()) return
    const currentQuery = window.location.search
    const newFilter: SavedFilter = { name: filterName.trim(), query: currentQuery }
    const updated = [...filters, newFilter]
    setFilters(updated)
    try { localStorage.setItem(storageKey, JSON.stringify(updated)) } catch {}
    setFilterName('')
    setShowSave(false)
  }, [filterName, filters, storageKey])

  const applyFilter = useCallback((filter: SavedFilter) => {
    const base = window.location.pathname
    window.location.href = base + filter.query
  }, [])

  const deleteFilter = useCallback((index: number) => {
    const updated = filters.filter((_, i) => i !== index)
    setFilters(updated)
    try { localStorage.setItem(storageKey, JSON.stringify(updated)) } catch {}
  }, [filters, storageKey])

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>🔖 {t('savedFilters')}</span>
        <button onClick={() => setShowSave(!showSave)} type="button" style={addBtnStyle}>
          + {t('saveFilter')}
        </button>
      </div>

      {showSave && (
        <div style={saveRowStyle}>
          <input
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder={t('filterName')}
            style={inputStyle}
            onKeyDown={(e) => e.key === 'Enter' && saveFilter()}
          />
          <button onClick={saveFilter} type="button" style={saveBtnStyle} disabled={!filterName.trim()}>
            ✓
          </button>
        </div>
      )}

      {filters.length === 0 ? (
        null
      ) : (
        <div style={listStyle}>
          {filters.map((filter, i) => (
            <div key={i} style={filterItemStyle}>
              <button onClick={() => applyFilter(filter)} type="button" style={filterBtnStyle}>
                {filter.name}
              </button>
              <button onClick={() => deleteFilter(i)} type="button" style={deleteBtnStyle} aria-label={t('deleteFilter')}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
  flexWrap: 'wrap',
}

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--theme-elevation-400)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
}

const addBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none',
  color: 'var(--aup-accent)', fontSize: '12px', fontWeight: 600,
  cursor: 'pointer',
}

const saveRowStyle: React.CSSProperties = {
  display: 'flex', gap: '6px',
}

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '6px 10px', borderRadius: '6px',
  border: '1px solid var(--theme-elevation-200)',
  fontSize: '12px', background: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)', outline: 'none',
}

const saveBtnStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: '6px',
  border: 'none', background: 'var(--aup-accent)',
  color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
}

const listStyle: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: '6px',
}

const filterItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '2px',
  borderRadius: '6px',
  border: '1px solid var(--theme-elevation-200)',
  overflow: 'hidden',
}

const filterBtnStyle: React.CSSProperties = {
  padding: '4px 10px', background: 'var(--theme-elevation-0)',
  border: 'none', fontSize: '12px', fontWeight: 500,
  color: 'var(--theme-text)', cursor: 'pointer',
}

const deleteBtnStyle: React.CSSProperties = {
  padding: '4px 6px', background: 'var(--theme-elevation-50)',
  border: 'none', borderLeft: '1px solid var(--theme-elevation-200)',
  fontSize: '12px', color: 'var(--theme-elevation-400)',
  cursor: 'pointer',
}
