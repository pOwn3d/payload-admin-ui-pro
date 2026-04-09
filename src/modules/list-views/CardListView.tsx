'use client'

import React from 'react'
import type { ListViewComponentProps } from './types.js'

/**
 * Card list view — displays documents as visual cards.
 * Shows image, title, subtitle, and status badge.
 * Falls back gracefully when fields are missing.
 */
export const CardListView: React.FC<ListViewComponentProps> = ({
  collection,
  docs,
  totalDocs,
  page,
  limit,
  loading,
  onPageChange,
  cardConfig,
}) => {
  const titleField = cardConfig?.titleField || 'title'
  const subtitleField = cardConfig?.subtitleField || 'updatedAt'
  const imageField = cardConfig?.imageField || 'heroImage'
  const statusField = cardConfig?.statusField || '_status'
  const totalPages = Math.ceil(totalDocs / limit)

  if (loading) {
    return <div style={loadingStyle}>Loading...</div>
  }

  return (
    <div>
      {/* Card grid */}
      <div style={gridStyle}>
        {docs.map((doc) => {
          const title = resolveField(doc, titleField) || `#${doc.id}`
          const subtitle = resolveField(doc, subtitleField)
          const status = resolveField(doc, statusField)
          const imageUrl = resolveImageUrl(doc, imageField)

          return (
            <a
              key={doc.id}
              href={`/admin/collections/${collection}/${doc.id}`}
              style={cardStyle}
            >
              {/* Image */}
              {imageUrl ? (
                <div style={imageContainerStyle}>
                  <img
                    src={imageUrl}
                    alt={typeof title === 'string' ? title : ''}
                    style={imageStyle}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div style={placeholderStyle}>
                  <span style={placeholderIconStyle}>📄</span>
                </div>
              )}

              {/* Content */}
              <div style={contentStyle}>
                <h3 style={cardTitleStyle}>{title}</h3>
                {subtitle && (
                  <p style={subtitleStyle}>
                    {isDateString(subtitle) ? formatDate(subtitle) : subtitle}
                  </p>
                )}
                {status && (
                  <span style={badgeStyle(status as string)}>
                    {status as string}
                  </span>
                )}
              </div>
            </a>
          )
        })}
      </div>

      {/* Empty state */}
      {docs.length === 0 && (
        <div style={emptyStyle}>No documents found</div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={paginationStyle}>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            style={pageBtnStyle}
            type="button"
          >
            ← Prev
          </button>
          <span style={pageInfoStyle}>
            Page {page} of {totalPages} ({totalDocs} docs)
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            style={pageBtnStyle}
            type="button"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveField(doc: Record<string, unknown>, field: string): string | null {
  const value = doc[field]
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  // Nested object with 'title' or 'name' (relationships)
  if (typeof value === 'object' && 'title' in (value as object)) {
    return String((value as Record<string, unknown>).title)
  }
  return null
}

function resolveImageUrl(doc: Record<string, unknown>, field: string): string | null {
  const value = doc[field]
  if (!value) return null

  // Direct URL string
  if (typeof value === 'string' && (value.startsWith('/') || value.startsWith('http'))) {
    return value
  }

  // Payload media object
  if (typeof value === 'object') {
    const media = value as Record<string, unknown>
    // Check for thumbnail first
    if (media.sizes && typeof media.sizes === 'object') {
      const sizes = media.sizes as Record<string, { url?: string }>
      const thumb = sizes.thumbnail || sizes.card || sizes.small
      if (thumb?.url) return thumb.url
    }
    if (typeof media.url === 'string') return media.url
    if (typeof media.filename === 'string') return `/media/${media.filename}`
  }

  return null
}

function isDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return /^\d{4}-\d{2}-\d{2}/.test(value)
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function badgeStyle(status: string): React.CSSProperties {
  const isPublished = status === 'published' || status === 'active'
  return {
    display: 'inline-block',
    fontSize: '0.6875rem',
    fontWeight: 600,
    padding: '0.125rem 0.5rem',
    borderRadius: '9999px',
    marginTop: '0.5rem',
    backgroundColor: isPublished
      ? 'var(--color-success-100, #dcfce7)'
      : 'var(--color-warning-100, #fef3c7)',
    color: isPublished
      ? 'var(--color-success-700, #15803d)'
      : 'var(--color-warning-700, #a16207)',
  }
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '1rem',
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 'var(--style-radius-m, 10px)',
  border: '1px solid var(--theme-elevation-150)',
  backgroundColor: 'var(--theme-elevation-0)',
  overflow: 'hidden',
  textDecoration: 'none',
  transition: 'box-shadow 0.2s ease, transform 0.15s ease',
}

const imageContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '160px',
  overflow: 'hidden',
  backgroundColor: 'var(--theme-elevation-50)',
}

const imageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

const placeholderStyle: React.CSSProperties = {
  ...imageContainerStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const placeholderIconStyle: React.CSSProperties = {
  fontSize: '2rem',
  opacity: 0.4,
}

const contentStyle: React.CSSProperties = {
  padding: '1rem',
}

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.9375rem',
  fontWeight: 600,
  color: 'var(--theme-text)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const subtitleStyle: React.CSSProperties = {
  margin: '0.25rem 0 0',
  fontSize: '0.8125rem',
  color: 'var(--theme-elevation-500)',
}

const loadingStyle: React.CSSProperties = {
  padding: '2rem',
  textAlign: 'center',
  color: 'var(--theme-elevation-500)',
}

const emptyStyle = loadingStyle

const paginationStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '1rem',
  padding: '1.5rem 0',
}

const pageBtnStyle: React.CSSProperties = {
  padding: '0.375rem 0.75rem',
  borderRadius: 'var(--style-radius-s, 6px)',
  border: '1px solid var(--theme-elevation-200)',
  backgroundColor: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
  fontSize: '0.8125rem',
  cursor: 'pointer',
}

const pageInfoStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--theme-elevation-500)',
}
