'use client'

import React from 'react'
// @ts-ignore — @payloadcms/ui is a peer dependency
import { useField } from '@payloadcms/ui'

/**
 * Image preview field — shows a large inline preview for upload/relationship fields
 * that point to media. Renders below the default field component.
 */
export const ImagePreviewField: React.FC<{
  path: string
  field: { label?: string | Record<string, string> }
}> = ({ path }) => {
  const { value } = useField<string | { url?: string; filename?: string } | null>({ path })

  const url = resolveUrl(value)
  if (!url || !isImage(url)) return null

  return (
    <div style={containerStyle}>
      <img
        src={url}
        alt=""
        style={imgStyle}
        loading="lazy"
      />
    </div>
  )
}

function resolveUrl(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    if (value.startsWith('/') || value.startsWith('http')) return value
    return null
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.url === 'string') return obj.url
    if (typeof obj.filename === 'string') return `/media/${obj.filename}`
  }
  return null
}

function isImage(url: string): boolean {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || ''
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext)
}

const containerStyle: React.CSSProperties = {
  marginTop: '0.5rem',
  borderRadius: 'var(--style-radius-m, 8px)',
  overflow: 'hidden',
  border: '1px solid var(--theme-elevation-150)',
  maxWidth: '300px',
}

const imgStyle: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  display: 'block',
  maxHeight: '200px',
  objectFit: 'cover',
}
