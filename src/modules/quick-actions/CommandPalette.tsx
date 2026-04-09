'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaletteItem {
  id: string
  label: string
  category: string
  href?: string
  icon?: string
  shortcut?: string
}

import { fetchCollections } from '../../utils/collectionsCache.js'
import { useAupT } from '../../utils/useTranslation.js'

interface CommandPaletteProps {
  /** Custom actions registered via plugin config */
  customActions?: Array<{
    id: string
    label: string
    icon?: string
    href: string
    shortcut?: string
  }>
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Command palette (⌘K / Ctrl+K).
 * Fuzzy search across collections, globals, admin views, and recent docs.
 *
 * Security:
 * - No external data injection — all items come from Payload API
 * - No dangerouslySetInnerHTML — React text rendering only
 * - No eval/Function — navigation via window.location
 * - Custom actions hrefs validated (must start with /)
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ customActions }) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const t = useAupT()
  const [items, setItems] = useState<PaletteItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [shortcutKey, setShortcutKey] = useState('k') // default ⌘K
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const [maxRecentDocs, setMaxRecentDocs] = useState(10)

  // ── Read shortcut + recentDocsCount from settings ──────────────
  useEffect(() => {
    import('../../utils/settingsCache.js').then(({ fetchSettings }) => {
      fetchSettings().then((data) => {
        const s = data?.commandPalette?.shortcut
        if (s === 'mod+p') setShortcutKey('p')
        else if (s === 'mod+/') setShortcutKey('/')
        else setShortcutKey('k')

        if (data?.commandPalette?.recentDocsCount !== undefined) {
          setMaxRecentDocs(data.commandPalette.recentDocsCount)
        }
      })
    }).catch(() => {})
  }, [])

  // ── Build search index on mount ──────────────────────────────────
  useEffect(() => {
    let mounted = true

    fetchCollections()
      .then(async (data) => {
        if (!mounted || !data) return

        const index: PaletteItem[] = []

        // Collections
        if (data.collections) {
          for (const col of data.collections as Array<{ slug: string; label: string }>) {
            if (col.slug.startsWith('payload-') || col.slug === 'dashboard-preferences') continue
            index.push({
              id: `col-${col.slug}`,
              label: col.label || formatLabel(col.slug),
              category: t('categoryCollections'),
              href: `/admin/collections/${col.slug}`,
              icon: '📁',
            })
            index.push({
              id: `new-${col.slug}`,
              label: t('newItem', { label: col.label || formatLabel(col.slug) }),
              category: t('categoryCreate'),
              href: `/admin/collections/${col.slug}/create`,
              icon: '➕',
            })
          }
        }

        // Globals
        if (data.globals) {
          for (const glob of data.globals as Array<{ slug: string; label: string }>) {
            index.push({
              id: `glob-${glob.slug}`,
              label: glob.label || formatLabel(glob.slug),
              category: t('categoryGlobals'),
              href: `/admin/globals/${glob.slug}`,
              icon: '⚙️',
            })
          }
        }

        // Built-in pages
        index.push(
          { id: 'dashboard', label: t('dashboard'), category: t('categoryPages'), href: '/admin', icon: '🏠' },
          { id: 'account', label: t('account'), category: t('categoryPages'), href: '/admin/account', icon: '👤' },
        )

        // Custom actions (validated)
        if (customActions) {
          for (const action of customActions) {
            if (action.href && action.href.startsWith('/')) {
              index.push({
                id: `action-${action.id}`,
                label: action.label,
                category: t('categoryActions'),
                href: action.href,
                icon: action.icon || '⚡',
                shortcut: action.shortcut,
              })
            }
          }
        }

        // Fetch recent docs
        try {
          const collections = (data.collections as Array<{ slug: string }>)
            .map((c) => c.slug)
            .filter((s) => !s.startsWith('payload-') && s !== 'dashboard-preferences')
          const docsPerCollection = Math.max(1, Math.ceil(maxRecentDocs / Math.min(collections.length, 4)))
          for (const slug of collections.slice(0, 4)) {
            const res = await fetch(`/api/${slug}?limit=${docsPerCollection}&depth=0&sort=-updatedAt`, {
              credentials: 'include',
            })
            if (!res.ok) continue
            const json = await res.json()
            for (const doc of json.docs || []) {
              const title = doc.title || doc.name || doc.filename || doc.email || `#${doc.id}`
              index.push({
                id: `recent-${slug}-${doc.id}`,
                label: String(title),
                category: t('categoryRecent'),
                href: `/admin/collections/${slug}/${doc.id}`,
                icon: '📄',
              })
            }
          }
        } catch {
          // Non-critical
        }

        if (mounted) setItems(index)
      })
      .catch(() => {})

    return () => { mounted = false }
  }, [customActions])

  // ── Keyboard shortcut (⌘K / Ctrl+K) ─────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === shortcutKey) {
        e.preventDefault()
        setOpen((prev) => !prev)
        setQuery('')
        setSelectedIndex(0)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // ── Focus input when opened ──────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // ── Filter items by query ────────────────────────────────────────
  const filtered = query.length === 0
    ? items.slice(0, 20)
    : items.filter((item) =>
        fuzzyMatch(query.toLowerCase(), item.label.toLowerCase()),
      ).slice(0, 20)

  // ── Keyboard navigation ──────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filtered[selectedIndex]
        if (selected?.href) {
          window.location.href = selected.href
          setOpen(false)
        }
      }
    },
    [filtered, selectedIndex],
  )

  // ── Scroll selected item into view ───────────────────────────────
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.querySelector(`[data-idx="${selectedIndex}"]`) as HTMLElement | null
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!open) return null

  // ── Build flat render list with category headers ─────────────────
  const renderItems: Array<{ type: 'header'; category: string } | { type: 'item'; item: PaletteItem; flatIndex: number }> = []
  let currentCategory = ''
  let fi = 0
  for (const item of filtered) {
    if (item.category !== currentCategory) {
      currentCategory = item.category
      renderItems.push({ type: 'header', category: currentCategory })
    }
    renderItems.push({ type: 'item', item, flatIndex: fi })
    fi++
  }

  return (
    <>
      {/* Backdrop */}
      <div className="aup-palette-overlay" onClick={() => setOpen(false)} aria-hidden="true" />

      {/* Modal */}
      <div className="aup-palette-dialog" role="dialog" aria-label="Command palette">
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: 'var(--aup-border-subtle)' }}>
          <span style={{ fontSize: '16px', opacity: 0.40 }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder={t('searchPlaceholder')}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '16px', fontWeight: 500, color: 'var(--theme-text)' }}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="aup-kbd">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '2rem 20px', textAlign: 'center', color: 'var(--theme-text)', opacity: 0.4, fontSize: '14px' }}>
              {t('noResults', { query })}
            </div>
          ) : (
            renderItems.map((entry, i) => {
              if (entry.type === 'header') {
                return (
                  <div key={`h-${entry.category}-${i}`} style={{
                    fontSize: '11px', fontWeight: 600, letterSpacing: '0.07em',
                    textTransform: 'uppercase', color: 'var(--theme-text)', opacity: 0.35,
                    padding: '8px 20px 4px', marginTop: '4px',
                  }}>{entry.category}</div>
                )
              }
              const { item, flatIndex: idx } = entry
              const isSelected = idx === selectedIndex
              return (
                <a
                  key={`${item.id}-${idx}`}
                  href={item.href}
                  data-idx={idx}
                  className="aup-palette-item"
                  aria-selected={isSelected}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span className="aup-palette-item-icon">{item.icon}</span>
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: 'var(--theme-text)' }}>{item.label}</span>
                  {item.shortcut && <kbd className="aup-kbd" style={{ fontSize: '10px' }}>{item.shortcut}</kbd>}
                </a>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px',
          padding: '10px 20px', borderTop: 'var(--aup-border-subtle)',
          fontSize: '11px', color: 'var(--theme-text)', opacity: 0.35,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><kbd className="aup-kbd">↑↓</kbd> {t('navigate')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><kbd className="aup-kbd">↵</kbd> {t('open')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><kbd className="aup-kbd">esc</kbd> {t('close')}</span>
        </div>
      </div>
    </>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Simple fuzzy match — checks if all query chars appear in order */
function fuzzyMatch(query: string, text: string): boolean {
  let qi = 0
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) qi++
  }
  return qi === query.length
}

// Old inline styles removed — using CSS classes from tokens.ts
