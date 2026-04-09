'use client'

import React, { useEffect, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'

interface TimelineEntry {
  id: string
  userName: string
  action: string
  changedFields: string[]
  timestamp: string
}

/**
 * Document timeline — shows modification history for the current document.
 * Injected via afterDocument or as a field UI component.
 * Reads from activity-log filtered by collection + docId.
 */
export const DocumentTimeline: React.FC = () => {
  const t = useAupT()
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    // Extract collection + docId from URL
    const match = window.location.pathname.match(/\/admin\/collections\/([^/]+)\/(\d+)/)
    if (!match) { setLoading(false); return }

    const collection = match[1]
    const docId = match[2]

    fetch(`/api/admin-ui-pro/activity?collection=${collection}&limit=20`, {
      credentials: 'include',
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.docs) {
          const filtered = data.docs
            .filter((d: any) => String(d.docId) === docId)
            .map((d: any) => ({
              id: d.id,
              userName: d.userName || 'Unknown',
              action: d.action || 'update',
              changedFields: d.changedFields || [],
              timestamp: d.timestamp || d.createdAt || '',
            }))
          setEntries(filtered)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Don't render on create pages or non-document pages
  if (typeof window !== 'undefined' && !window.location.pathname.match(/\/admin\/collections\/[^/]+\/\d+/)) {
    return null
  }

  if (loading) return null
  if (entries.length === 0 && !loading) return null

  return (
    <div style={containerStyle}>
      <button onClick={() => setCollapsed(!collapsed)} type="button" style={headerBtnStyle}>
        <span style={headerIconStyle}>📜</span>
        <span style={headerTitleStyle}>{t('documentHistory')}</span>
        <span style={countBadge}>{entries.length}</span>
        <span style={chevronStyle}>{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div style={timelineStyle}>
          {entries.map((entry, i) => (
            <div key={entry.id} style={entryStyle}>
              <div style={dotContainerStyle}>
                <div style={{
                  ...dotStyle,
                  background: entry.action === 'create' ? 'var(--aup-green)'
                    : entry.action === 'delete' ? 'var(--aup-red)'
                    : 'var(--aup-accent)',
                }} />
                {i < entries.length - 1 && <div style={lineStyle} />}
              </div>
              <div style={entryContentStyle}>
                <div style={entryHeaderStyle}>
                  <strong style={userNameStyle}>{entry.userName}</strong>
                  <span style={actionStyle}>
                    {entry.action === 'create' ? '✚' : entry.action === 'delete' ? '✕' : '✎'}
                    {' '}{entry.action}
                  </span>
                  <span style={timeStyle}>{timeAgo(entry.timestamp)}</span>
                </div>
                {entry.changedFields.length > 0 && (
                  <div style={fieldsStyle}>
                    {entry.changedFields.map((f) => (
                      <span key={f} style={fieldBadgeStyle}>{f}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function timeAgo(ts: string): string {
  const seconds = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (seconds < 60) return 'now'
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(ts).toLocaleDateString()
}

const containerStyle: React.CSSProperties = {
  margin: '16px 0',
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '12px',
  overflow: 'hidden',
  backgroundColor: 'var(--theme-elevation-0)',
}

const headerBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
  width: '100%', padding: '12px 16px',
  background: 'none', border: 'none', cursor: 'pointer',
  textAlign: 'left',
}

const headerIconStyle: React.CSSProperties = { fontSize: '16px' }

const headerTitleStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 700, color: 'var(--theme-text)', flex: 1,
}

const countBadge: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600,
  padding: '1px 8px', borderRadius: '9999px',
  backgroundColor: 'var(--aup-accent-subtle)', color: 'var(--aup-accent)',
}

const chevronStyle: React.CSSProperties = {
  fontSize: '12px', color: 'var(--theme-elevation-400)',
}

const timelineStyle: React.CSSProperties = {
  padding: '0 16px 16px',
}

const entryStyle: React.CSSProperties = {
  display: 'flex', gap: '12px',
}

const dotContainerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  paddingTop: '4px', width: '12px', flexShrink: 0,
}

const dotStyle: React.CSSProperties = {
  width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
}

const lineStyle: React.CSSProperties = {
  width: '2px', flex: 1, background: 'var(--theme-elevation-150)',
  margin: '4px 0',
}

const entryContentStyle: React.CSSProperties = {
  flex: 1, paddingBottom: '14px',
}

const entryHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
}

const userNameStyle: React.CSSProperties = {
  fontSize: '12.5px', color: 'var(--theme-text)',
}

const actionStyle: React.CSSProperties = {
  fontSize: '11.5px', color: 'var(--theme-elevation-500)',
}

const timeStyle: React.CSSProperties = {
  fontSize: '11px', color: 'var(--theme-elevation-400)', marginLeft: 'auto',
}

const fieldsStyle: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px',
}

const fieldBadgeStyle: React.CSSProperties = {
  fontSize: '10px', fontWeight: 600,
  padding: '1px 7px', borderRadius: '4px',
  backgroundColor: 'var(--theme-elevation-100)',
  color: 'var(--theme-elevation-600)',
  fontFamily: 'var(--aup-font-numeric)',
}
