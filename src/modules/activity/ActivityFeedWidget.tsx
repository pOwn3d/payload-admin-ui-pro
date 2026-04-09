'use client'

import React, { useEffect, useState } from 'react'
import type { WidgetProps } from '../dashboard/types.js'

interface ActivityEntry {
  id: string
  userName: string
  action: 'create' | 'update' | 'delete'
  collection: string
  docId: string
  docTitle: string
  changedFields: string[]
  timestamp: string
}

const ACTION_CONFIG = {
  create: { icon: '+', color: 'var(--color-success-500, #22c55e)', bg: 'var(--color-success-100, #dcfce7)', label: 'created' },
  update: { icon: '~', color: 'var(--color-blue-500, #3b82f6)', bg: 'var(--color-blue-100, #dbeafe)', label: 'updated' },
  delete: { icon: '×', color: 'var(--color-error-500, #ef4444)', bg: 'var(--color-error-100, #fee2e2)', label: 'deleted' },
}

/**
 * Activity feed widget — displays the audit trail from the activity-log collection.
 * Admin-only data: the endpoint checks permissions.
 */
export const ActivityFeedWidget: React.FC<WidgetProps> = () => {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    fetch('/api/admin-ui-pro/activity?limit=15', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted) return
        if (data?.docs) setEntries(data.docs)
        setLoading(false)
      })
      .catch(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [])

  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>Activity Log</h3>
      {loading ? (
        <div style={loadingStyle}>Loading...</div>
      ) : entries.length === 0 ? (
        <div style={loadingStyle}>No activity recorded yet</div>
      ) : (
        <div style={listStyle}>
          {entries.map((entry) => {
            const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.update

            return (
              <div key={entry.id} style={rowStyle}>
                <span style={iconStyle(config.bg, config.color)}>{config.icon}</span>
                <div style={contentStyle}>
                  <div style={mainLineStyle}>
                    <strong style={userStyle}>{entry.userName}</strong>
                    <span style={actionStyle}>{config.label}</span>
                    <a
                      href={entry.action !== 'delete'
                        ? `/admin/collections/${entry.collection}/${entry.docId}`
                        : `/admin/collections/${entry.collection}`
                      }
                      style={docLinkStyle}
                    >
                      {entry.docTitle}
                    </a>
                  </div>
                  <div style={metaLineStyle}>
                    <span>{formatCollection(entry.collection)}</span>
                    {entry.changedFields?.length > 0 && (
                      <span> · {entry.changedFields.length} field{entry.changedFields.length > 1 ? 's' : ''}</span>
                    )}
                    <span> · {timeAgo(entry.timestamp)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatCollection(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  padding: '1.25rem',
  height: '100%',
  overflow: 'auto',
}

const titleStyle: React.CSSProperties = {
  margin: '0 0 1rem 0',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'var(--theme-elevation-800)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.625rem',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'flex-start',
}

function iconStyle(bg: string, color: string): React.CSSProperties {
  return {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    fontWeight: 700,
    flexShrink: 0,
    backgroundColor: bg,
    color,
    marginTop: '2px',
  }
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
}

const mainLineStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.25rem',
  alignItems: 'baseline',
  fontSize: '0.8125rem',
}

const userStyle: React.CSSProperties = {
  fontWeight: 600,
  color: 'var(--theme-text)',
}

const actionStyle: React.CSSProperties = {
  color: 'var(--theme-elevation-500)',
}

const docLinkStyle: React.CSSProperties = {
  color: 'var(--theme-text-link, var(--theme-success-500))',
  textDecoration: 'none',
  fontWeight: 500,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '200px',
}

const metaLineStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  color: 'var(--theme-elevation-400)',
  marginTop: '0.125rem',
}

const loadingStyle: React.CSSProperties = {
  color: 'var(--theme-elevation-500)',
  fontSize: '0.875rem',
}
