'use client'

import { useEffect, useState } from 'react'
import type { WidgetProps } from '../types.js'

interface DocRow {
  id: string
  title: string
  status: string
  updatedAt: string
  url: string
}

/**
 * Collection overview widget — compact table showing recent docs from a collection.
 * The collection slug is derived from the widget instance id (e.g. "overview-posts" → "posts").
 */
export const CollectionOverviewWidget: React.FC<WidgetProps> = ({ id }) => {
  const [rows, setRows] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [collectionLabel, setCollectionLabel] = useState('')

  // Extract collection slug from widget instance id
  // Convention: "collection-overview-{slug}" or just use first available collection
  const extracted = id.replace(/^collection-overview-?/, '')
  // If extracted is a number (timestamp from "add widget"), fallback to 'posts'
  const collectionSlug = extracted && /^[a-z]/.test(extracted) ? extracted : 'posts'

  useEffect(() => {
    let mounted = true

    setCollectionLabel(formatLabel(collectionSlug))

    fetch(`/api/${collectionSlug}?limit=5&depth=0&sort=-updatedAt`, {
      credentials: 'include',
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!mounted) return
        if (!data?.docs) {
          setLoading(false)
          return
        }

        setRows(
          data.docs.map((doc: Record<string, unknown>) => ({
            id: doc.id,
            title: (doc.title || doc.name || doc.filename || doc.email || `#${doc.id}`) as string,
            status: ((doc._status as string) || 'published'),
            updatedAt: doc.updatedAt as string,
            url: `/admin/collections/${collectionSlug}/${doc.id}`,
          })),
        )
        setLoading(false)
      })
      .catch(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [collectionSlug])

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>{collectionLabel}</h3>
        <a href={`/admin/collections/${collectionSlug}`} style={viewAllStyle}>
          View all →
        </a>
      </div>

      {loading ? (
        <div style={loadingStyle}>Loading...</div>
      ) : rows.length === 0 ? (
        <div style={loadingStyle}>No documents</div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Title</th>
              <th style={{ ...thStyle, width: '80px' }}>Status</th>
              <th style={{ ...thStyle, width: '80px', textAlign: 'right' }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={tdStyle}>
                  <a href={row.url} style={linkStyle}>{row.title}</a>
                </td>
                <td style={tdStyle}>
                  <span style={statusStyle(row.status)}>{row.status}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--theme-elevation-500)', fontSize: '0.75rem' }}>
                  {timeAgo(row.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function formatLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function statusStyle(status: string): React.CSSProperties {
  const isPublished = status === 'published'
  return {
    fontSize: '0.6875rem',
    fontWeight: 600,
    padding: '0.125rem 0.5rem',
    borderRadius: '9999px',
    backgroundColor: isPublished
      ? 'var(--color-success-100, #dcfce7)'
      : 'var(--color-warning-100, #fef3c7)',
    color: isPublished
      ? 'var(--color-success-700, #15803d)'
      : 'var(--color-warning-700, #a16207)',
  }
}

const containerStyle: React.CSSProperties = {
  padding: '1.25rem',
  height: '100%',
  overflow: 'auto',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.75rem',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'var(--theme-elevation-800)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const viewAllStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--theme-text-link, var(--theme-success-500))',
  textDecoration: 'none',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: '0.6875rem',
  fontWeight: 600,
  color: 'var(--theme-elevation-500)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '0.375rem 0.5rem',
  borderBottom: '1px solid var(--theme-elevation-150)',
}

const tdStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  padding: '0.5rem',
  borderBottom: '1px solid var(--theme-elevation-100)',
}

const linkStyle: React.CSSProperties = {
  color: 'var(--theme-text)',
  textDecoration: 'none',
  fontWeight: 500,
}

const loadingStyle: React.CSSProperties = {
  color: 'var(--theme-elevation-500)',
  fontSize: '0.875rem',
}
