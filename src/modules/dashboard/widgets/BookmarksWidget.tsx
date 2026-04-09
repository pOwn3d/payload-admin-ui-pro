'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useAupT } from '../../../utils/useTranslation.js'

interface Bookmark {
  title: string
  href: string
  collection?: string
  addedAt: string
}

const STORAGE_KEY = 'aup-bookmarks'

/**
 * Bookmarks widget — shows pinned documents/pages.
 * Also exports utility functions for the BookmarkButton.
 */
export const BookmarksWidget: React.FC<{ id: string }> = () => {
  const t = useAupT()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  useEffect(() => {
    setBookmarks(getBookmarks())
  }, [])

  const handleRemove = useCallback((href: string) => {
    removeBookmark(href)
    setBookmarks(getBookmarks())
  }, [])

  if (bookmarks.length === 0) {
    return (
      <div style={emptyStyle}>
        <span style={{ fontSize: '1.5rem' }}>🔖</span>
        <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.5 }}>{t('noBookmarks')}</p>
      </div>
    )
  }

  return (
    <div style={listStyle}>
      {bookmarks.map((bm) => (
        <div key={bm.href} style={itemStyle}>
          <a href={bm.href} style={linkStyle}>
            <span style={titleStyle}>{bm.title}</span>
            {bm.collection && <span style={collStyle}>{bm.collection}</span>}
          </a>
          <button
            onClick={() => handleRemove(bm.href)}
            type="button"
            style={removeBtnStyle}
            title={t('removeBookmark')}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Public API for other components ────────────────────────────────────────

export function getBookmarks(): Bookmark[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

export function addBookmark(bookmark: Bookmark): void {
  const existing = getBookmarks()
  if (existing.some((b) => b.href === bookmark.href)) return
  existing.unshift(bookmark)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 50))) } catch {}
}

export function removeBookmark(href: string): void {
  const existing = getBookmarks().filter((b) => b.href !== href)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(existing)) } catch {}
}

export function isBookmarked(href: string): boolean {
  return getBookmarks().some((b) => b.href === href)
}

// ── Styles ─────────────────────────────────────────────────────────────────

const emptyStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', height: '100%', gap: '4px',
  color: 'var(--theme-elevation-400)',
}

const listStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '2px',
}

const itemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '6px 0',
  borderBottom: '1px solid var(--theme-elevation-50)',
}

const linkStyle: React.CSSProperties = {
  flex: 1, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '1px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 500, color: 'var(--theme-text)',
}

const collStyle: React.CSSProperties = {
  fontSize: '10px', color: 'var(--theme-elevation-400)', textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const removeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none',
  color: 'var(--theme-elevation-400)', fontSize: '16px',
  cursor: 'pointer', padding: '2px 6px',
}
