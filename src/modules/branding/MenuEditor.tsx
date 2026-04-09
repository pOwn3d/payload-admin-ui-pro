'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAupT } from '../../utils/useTranslation.js'

const STORAGE_KEY = 'aup-menu-order'

interface MenuItem {
  slug: string
  label: string
  icon: string
  visible: boolean
  customLabel: string | null
  type: 'collection' | 'global'
}

interface DragState {
  draggedIndex: number | null
  overIndex: number | null
}

function getStoredConfig(): MenuItem[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function storeConfig(items: MenuItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // localStorage unavailable
  }
}

// Default icons based on collection slug patterns
function guessIcon(slug: string): string {
  const map: Record<string, string> = {
    users: '👤',
    media: '🖼',
    pages: '📄',
    posts: '📝',
    categories: '🏷',
    tags: '🏷',
    forms: '📋',
    'form-submissions': '📥',
    products: '🛒',
    orders: '📦',
    comments: '💬',
    redirects: '↗️',
    settings: '⚙️',
    navigation: '🧭',
    header: '🔝',
    footer: '🔻',
    menu: '☰',
  }
  return map[slug] || '📂'
}

export function MenuEditor() {
  const t = useAupT()
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [drag, setDrag] = useState<DragState>({ draggedIndex: null, overIndex: null })
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Fetch collections and globals to build the default list
  const fetchMenuItems = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-ui-pro/collections', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch collections')
      const data = await res.json()

      const defaultItems: MenuItem[] = []

      // Add collections
      if (data.collections) {
        for (const col of data.collections) {
          defaultItems.push({
            slug: col.slug,
            label: col.labels?.plural || col.slug,
            icon: guessIcon(col.slug),
            visible: true,
            customLabel: null,
            type: 'collection',
          })
        }
      }

      // Add globals
      if (data.globals) {
        for (const g of data.globals) {
          defaultItems.push({
            slug: g.slug,
            label: g.label || g.slug,
            icon: guessIcon(g.slug),
            visible: true,
            customLabel: null,
            type: 'global',
          })
        }
      }

      // Merge with stored config
      const stored = getStoredConfig()
      if (stored && stored.length > 0) {
        // Build a map of stored items by slug
        const storedMap = new Map(stored.map((s) => [s.slug, s]))
        const merged: MenuItem[] = []
        // First, add items in stored order
        for (const s of stored) {
          const fresh = defaultItems.find((d) => d.slug === s.slug)
          if (fresh) {
            merged.push({
              ...fresh,
              visible: s.visible,
              customLabel: s.customLabel,
            })
          }
        }
        // Then add any new items not in stored config
        for (const d of defaultItems) {
          if (!storedMap.has(d.slug)) {
            merged.push(d)
          }
        }
        setItems(merged)
      } else {
        setItems(defaultItems)
      }
    } catch {
      // Fallback: empty
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMenuItems()
  }, [fetchMenuItems])

  // Focus input when editing
  useEffect(() => {
    if (editingIndex !== null && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingIndex])

  const handleSave = useCallback(() => {
    storeConfig(items)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent('aup-menu-changed', { detail: items }))
  }, [items])

  const handleReset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setItems((prev) => prev.map((item) => ({ ...item, visible: true, customLabel: null })))
    fetchMenuItems()
    window.dispatchEvent(new CustomEvent('aup-menu-changed', { detail: null }))
  }, [fetchMenuItems])

  const toggleVisibility = useCallback((index: number) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], visible: !next[index].visible }
      return next
    })
  }, [])

  const updateLabel = useCallback((index: number, value: string) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], customLabel: value || null }
      return next
    })
  }, [])

  // Drag and drop handlers
  const onDragStart = useCallback((index: number) => {
    setDrag({ draggedIndex: index, overIndex: null })
  }, [])

  const onDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDrag((prev) => ({ ...prev, overIndex: index }))
  }, [])

  const onDrop = useCallback(() => {
    setDrag((prev) => {
      if (prev.draggedIndex === null || prev.overIndex === null || prev.draggedIndex === prev.overIndex) {
        return { draggedIndex: null, overIndex: null }
      }
      setItems((items) => {
        const next = [...items]
        const [moved] = next.splice(prev.draggedIndex!, 1)
        next.splice(prev.overIndex!, 0, moved)
        return next
      })
      return { draggedIndex: null, overIndex: null }
    })
  }, [])

  const onDragEnd = useCallback(() => {
    setDrag({ draggedIndex: null, overIndex: null })
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '16px 0', opacity: 0.6, fontSize: 13 }}>
        {t('loading')}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
      }}>
        <span style={{
          fontSize: 12,
          opacity: 0.6,
          fontWeight: 500,
        }}>
          {t('menuEditorHint')}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--aup-radius-sm, 6px)',
              border: 'var(--aup-border-subtle, 1px solid rgba(0,0,0,0.1))',
              background: 'transparent',
              color: 'var(--theme-text, inherit)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t('reset')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--aup-radius-sm, 6px)',
              border: 'none',
              background: saved ? 'var(--aup-green, #22c55e)' : 'var(--aup-accent, #6366f1)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 200ms',
            }}
          >
            {saved ? '✓' : t('menuEditorSave')}
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        maxHeight: 400,
        overflowY: 'auto',
      }}>
        {items.map((item, index) => (
          <div
            key={item.slug}
            draggable
            onDragStart={() => onDragStart(index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 'var(--aup-radius-sm, 6px)',
              border: drag.overIndex === index
                ? '1px solid var(--aup-accent, #6366f1)'
                : 'var(--aup-border-subtle, 1px solid rgba(0,0,0,0.08))',
              background: drag.draggedIndex === index
                ? 'var(--aup-accent-subtle, rgba(99,102,241,0.08))'
                : item.visible
                  ? 'var(--theme-elevation-50, #fff)'
                  : 'transparent',
              opacity: item.visible ? 1 : 0.45,
              cursor: 'grab',
              transition: 'all 150ms ease',
              userSelect: 'none',
            }}
          >
            {/* Drag handle */}
            <span style={{
              fontSize: 14,
              opacity: 0.35,
              cursor: 'grab',
              lineHeight: 1,
              flexShrink: 0,
            }}>
              ⠿
            </span>

            {/* Icon */}
            <span style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: 'center' }}>
              {item.icon}
            </span>

            {/* Label or rename input */}
            {editingIndex === index ? (
              <input
                ref={inputRef}
                type="text"
                value={item.customLabel ?? item.label}
                onChange={(e) => updateLabel(index, e.target.value)}
                onBlur={() => setEditingIndex(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setEditingIndex(null)
                }}
                style={{
                  flex: 1,
                  padding: '2px 6px',
                  border: '1px solid var(--aup-accent, #6366f1)',
                  borderRadius: 4,
                  background: 'var(--theme-elevation-0, #fff)',
                  color: 'var(--theme-text, inherit)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            ) : (
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--theme-text, inherit)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                onDoubleClick={() => setEditingIndex(index)}
                title={t('menuEditorRenameHint')}
              >
                {item.customLabel || item.label}
                {item.customLabel && (
                  <span style={{ fontSize: 10, opacity: 0.4, marginLeft: 6 }}>
                    ({item.label})
                  </span>
                )}
              </span>
            )}

            {/* Type badge */}
            <span style={{
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '2px 5px',
              borderRadius: 'var(--aup-radius-pill, 999px)',
              background: item.type === 'collection'
                ? 'var(--aup-accent-subtle, rgba(99,102,241,0.1))'
                : 'var(--aup-amber-subtle, rgba(245,158,11,0.1))',
              color: item.type === 'collection'
                ? 'var(--aup-accent, #6366f1)'
                : 'var(--aup-amber, #f59e0b)',
              flexShrink: 0,
            }}>
              {item.type === 'collection' ? 'col' : 'glb'}
            </span>

            {/* Rename button */}
            <button
              type="button"
              onClick={() => setEditingIndex(editingIndex === index ? null : index)}
              title={t('menuEditorRename')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                padding: '2px 4px',
                borderRadius: 4,
                opacity: 0.5,
                flexShrink: 0,
              }}
            >
              ✏️
            </button>

            {/* Visibility toggle */}
            <button
              type="button"
              onClick={() => toggleVisibility(index)}
              title={item.visible ? t('menuEditorHide') : t('menuEditorShow')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
                padding: '2px 4px',
                borderRadius: 4,
                opacity: item.visible ? 0.7 : 0.3,
                flexShrink: 0,
              }}
            >
              {item.visible ? '👁' : '👁‍🗨'}
            </button>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', opacity: 0.5, fontSize: 13 }}>
          {t('noItems')}
        </div>
      )}
    </div>
  )
}
