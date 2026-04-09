'use client'

import React, { useEffect, useState } from 'react'
// @ts-ignore — @payloadcms/ui is a peer dependency
import { useField } from '@payloadcms/ui'

/**
 * Relation card field — shows a visual card preview for relationship fields.
 * Displays the related doc's title and image (if available).
 * Renders as an enhancement below the default relationship field.
 */
export const RelationCardField: React.FC<{
  path: string
  field: {
    label?: string | Record<string, string>
    relationTo?: string | string[]
  }
}> = ({ path, field }) => {
  const { value } = useField<string | { id: string } | null>({ path })
  const [doc, setDoc] = useState<{ title: string; imageUrl: string | null; url: string } | null>(null)

  const collection = typeof field.relationTo === 'string'
    ? field.relationTo
    : Array.isArray(field.relationTo) ? field.relationTo[0] : null

  const docId = typeof value === 'string' ? value : (value as { id: string } | null)?.id

  useEffect(() => {
    if (!collection || !docId) {
      setDoc(null)
      return
    }

    let mounted = true

    fetch(`/api/${collection}/${docId}?depth=0`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data) return

        const title = data.title || data.name || data.filename || data.email || `#${data.id}`
        let imageUrl: string | null = null

        // Try to find an image
        if (typeof data.url === 'string' && isImage(data.url)) {
          imageUrl = data.url
        } else if (typeof data.filename === 'string' && isImage(data.filename)) {
          imageUrl = `/media/${data.filename}`
        }

        setDoc({
          title: String(title),
          imageUrl,
          url: `/admin/collections/${collection}/${data.id}`,
        })
      })
      .catch(() => {
        if (mounted) setDoc(null)
      })

    return () => { mounted = false }
  }, [collection, docId])

  if (!doc) return null

  return (
    <a href={doc.url} style={cardStyle}>
      {doc.imageUrl && (
        <img src={doc.imageUrl} alt="" style={imgStyle} loading="lazy" />
      )}
      <div style={contentStyle}>
        <span style={titleStyle}>{doc.title}</span>
        <span style={collectionStyle}>{collection}</span>
      </div>
      <span style={arrowStyle}>→</span>
    </a>
  )
}

function isImage(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase().split('?')[0] || ''
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext)
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginTop: '0.5rem',
  padding: '0.625rem 0.75rem',
  borderRadius: 'var(--style-radius-m, 8px)',
  border: '1px solid var(--theme-elevation-150)',
  backgroundColor: 'var(--theme-elevation-50)',
  textDecoration: 'none',
  transition: 'background-color 0.15s ease',
}

const imgStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: 'var(--style-radius-s, 4px)',
  objectFit: 'cover',
  flexShrink: 0,
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
}

const titleStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--theme-text)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const collectionStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  color: 'var(--theme-elevation-400)',
}

const arrowStyle: React.CSSProperties = {
  fontSize: '1rem',
  color: 'var(--theme-elevation-400)',
  flexShrink: 0,
}
