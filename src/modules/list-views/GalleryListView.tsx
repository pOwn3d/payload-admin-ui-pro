'use client'

import React, { useState } from 'react'
import type { ListViewComponentProps } from './types.js'

/**
 * Gallery list view — grid of images/thumbnails.
 * Ideal for media collections and portfolios.
 * Shows filename and file size on hover overlay.
 */
export const GalleryListView: React.FC<ListViewComponentProps> = ({
  collection,
  docs,
  totalDocs,
  page,
  limit,
  loading,
  onPageChange,
}) => {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const totalPages = Math.ceil(totalDocs / limit)

  if (loading) {
    return <div style={loadingStyle}>Loading...</div>
  }

  return (
    <div>
      {/* Gallery grid */}
      <div style={gridStyle}>
        {docs.map((doc) => {
          const url = resolveUrl(doc)
          const filename = (doc.filename as string) || (doc.title as string) || `#${doc.id}`
          const alt = (doc.alt as string) || filename
          const isImage = url && isImageFile(url)

          return (
            <div key={doc.id} style={itemStyle}>
              <a
                href={`/admin/collections/${collection}/${doc.id}`}
                style={linkStyle}
              >
                {isImage ? (
                  <img
                    src={url}
                    alt={alt}
                    style={imgStyle}
                    loading="lazy"
                    onClick={(e) => {
                      if (url) {
                        e.preventDefault()
                        setLightbox(url)
                      }
                    }}
                  />
                ) : (
                  <div style={fileIconStyle}>
                    <span style={{ fontSize: '1.5rem' }}>📎</span>
                    <span style={extStyle}>
                      {getExtension(filename)}
                    </span>
                  </div>
                )}
              </a>
              <div style={captionStyle}>
                <a
                  href={`/admin/collections/${collection}/${doc.id}`}
                  style={fileNameStyle}
                  title={filename}
                >
                  {filename}
                </a>
                {typeof doc.filesize === 'number' && (
                  <span style={sizeStyle}>
                    {formatFileSize(doc.filesize)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {docs.length === 0 && (
        <div style={loadingStyle}>No media found</div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          style={lightboxOverlay}
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label="Image preview"
        >
          <img src={lightbox} alt="" style={lightboxImg} />
          <button
            onClick={() => setLightbox(null)}
            style={lightboxClose}
            type="button"
            aria-label="Close"
          >
            ×
          </button>
        </div>
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
            Page {page} of {totalPages}
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

function resolveUrl(doc: Record<string, unknown>): string | null {
  if (typeof doc.url === 'string') return doc.url
  if (typeof doc.filename === 'string') return `/media/${doc.filename}`
  // Check for sizes
  if (doc.sizes && typeof doc.sizes === 'object') {
    const sizes = doc.sizes as Record<string, { url?: string }>
    const thumb = sizes.thumbnail || sizes.card || sizes.small
    if (thumb?.url) return thumb.url
  }
  return null
}

function isImageFile(url: string): boolean {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || ''
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp'].includes(ext)
}

function getExtension(filename: string): string {
  return (filename.split('.').pop() || '').toUpperCase()
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '0.75rem',
}

const itemStyle: React.CSSProperties = {
  borderRadius: 'var(--style-radius-m, 10px)',
  border: '1px solid var(--theme-elevation-150)',
  backgroundColor: 'var(--theme-elevation-0)',
  overflow: 'hidden',
}

const linkStyle: React.CSSProperties = {
  display: 'block',
  textDecoration: 'none',
}

const imgStyle: React.CSSProperties = {
  width: '100%',
  height: '140px',
  objectFit: 'cover',
  display: 'block',
  cursor: 'pointer',
}

const fileIconStyle: React.CSSProperties = {
  width: '100%',
  height: '140px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.25rem',
  backgroundColor: 'var(--theme-elevation-50)',
}

const extStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  color: 'var(--theme-elevation-500)',
  textTransform: 'uppercase',
}

const captionStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
}

const fileNameStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 500,
  color: 'var(--theme-text)',
  textDecoration: 'none',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const sizeStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  color: 'var(--theme-elevation-400)',
}

const lightboxOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  backgroundColor: 'rgba(0,0,0,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}

const lightboxImg: React.CSSProperties = {
  maxWidth: '90vw',
  maxHeight: '90vh',
  objectFit: 'contain',
  borderRadius: '4px',
}

const lightboxClose: React.CSSProperties = {
  position: 'absolute',
  top: '1rem',
  right: '1.5rem',
  fontSize: '2rem',
  color: '#fff',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
}

const loadingStyle: React.CSSProperties = {
  padding: '2rem',
  textAlign: 'center',
  color: 'var(--theme-elevation-500)',
}

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
