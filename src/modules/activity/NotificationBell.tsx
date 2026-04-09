'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'

interface Notification {
  id: string
  userName: string
  action: string
  collection: string
  docTitle: string
  timestamp: string
}

/**
 * Notification bell icon with dropdown feed.
 * Injected via afterNavLinks. Fetches recent activity log entries.
 * Shows a red dot when there are unread notifications.
 */
export const NotificationBell: React.FC = () => {
  const t = useAupT()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [lastSeen, setLastSeen] = useState<string>(() => {
    try { return localStorage.getItem('aup-notif-last-seen') || '' } catch { return '' }
  })
  const ref = useRef<HTMLDivElement>(null)

  // Fetch recent activity
  const fetchNotifications = useCallback(() => {
    fetch('/api/admin-ui-pro/activity?limit=20', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.docs && Array.isArray(data.docs)) {
          setItems(data.docs.map((d: any) => ({
            id: d.id,
            userName: d.userName || 'Unknown',
            action: d.action || 'update',
            collection: d.collection || '',
            docTitle: d.docTitle || '',
            timestamp: d.timestamp || d.createdAt || '',
          })))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const unreadCount = items.filter((n) => n.timestamp > lastSeen).length

  const handleOpen = useCallback(() => {
    setOpen((v) => !v)
    if (!open && items.length > 0) {
      const latest = items[0]?.timestamp || ''
      setLastSeen(latest)
      try { localStorage.setItem('aup-notif-last-seen', latest) } catch {}
    }
  }, [open, items])

  const markAllRead = useCallback(() => {
    if (items.length > 0) {
      const latest = items[0]?.timestamp || ''
      setLastSeen(latest)
      try { localStorage.setItem('aup-notif-last-seen', latest) } catch {}
    }
  }, [items])

  const actionIcon = (action: string) => {
    if (action === 'create') return '+'
    if (action === 'delete') return '×'
    return '✎'
  }

  const actionColor = (action: string) => {
    if (action === 'create') return 'var(--aup-green)'
    if (action === 'delete') return 'var(--aup-red)'
    return 'var(--aup-accent)'
  }

  return (
    <div ref={ref} style={wrapperStyle}>
      <button onClick={handleOpen} type="button" style={bellBtnStyle} aria-label={t('notifications')}>
        🔔
        {unreadCount > 0 && (
          <span style={badgeStyle}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="aup-notif-dropdown" style={dropdownStyle}>
          <div style={dropdownHeaderStyle}>
            <span style={dropdownTitleStyle}>{t('notifications')}</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} type="button" style={markReadBtnStyle}>
                {t('markAllRead')}
              </button>
            )}
          </div>

          <div style={listStyle}>
            {items.length === 0 ? (
              <div style={emptyStyle}>{t('noNotifications')}</div>
            ) : (
              items.slice(0, 15).map((n) => (
                <div key={n.id} style={{
                  ...itemStyle,
                  background: n.timestamp > lastSeen ? 'var(--aup-accent-subtle)' : 'transparent',
                }}>
                  <span style={{ ...actionBadgeStyle, color: actionColor(n.action) }}>
                    {actionIcon(n.action)}
                  </span>
                  <div style={itemContentStyle}>
                    <span style={itemTextStyle}>
                      <strong>{n.userName}</strong> {n.action === 'create' ? 'created' : n.action === 'delete' ? 'deleted' : 'updated'}{' '}
                      <em>{n.docTitle || n.collection}</em>
                    </span>
                    <span style={timeStyle}>{timeAgo(n.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function timeAgo(ts: string): string {
  const seconds = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

const wrapperStyle: React.CSSProperties = {
  position: 'relative', display: 'inline-flex',
}

const bellBtnStyle: React.CSSProperties = {
  position: 'relative',
  background: 'none', border: 'none',
  fontSize: '18px', cursor: 'pointer',
  padding: '6px', borderRadius: '8px',
  transition: 'background 150ms',
}

const badgeStyle: React.CSSProperties = {
  position: 'absolute', top: '2px', right: '0',
  minWidth: '16px', height: '16px',
  borderRadius: '9999px',
  background: 'var(--aup-red)',
  color: '#fff',
  fontSize: '9px', fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '0 4px',
}

const dropdownStyle: React.CSSProperties = {
  position: 'absolute', top: '100%', right: 0,
  width: '360px',
  background: 'var(--theme-elevation-50)',
  border: 'var(--aup-border-subtle)',
  borderRadius: '12px',
  boxShadow: 'var(--aup-shadow-4)',
  zIndex: 9999,
  overflow: 'hidden',
  marginTop: '8px',
}

const dropdownHeaderStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid var(--theme-elevation-100)',
}

const dropdownTitleStyle: React.CSSProperties = {
  fontSize: '14px', fontWeight: 700, color: 'var(--theme-text)',
}

const markReadBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none',
  color: 'var(--aup-accent)', fontSize: '12px', fontWeight: 600,
  cursor: 'pointer',
}

const listStyle: React.CSSProperties = {
  maxHeight: '350px', overflowY: 'auto',
}

const emptyStyle: React.CSSProperties = {
  padding: '2rem', textAlign: 'center',
  fontSize: '13px', color: 'var(--theme-elevation-400)',
}

const itemStyle: React.CSSProperties = {
  display: 'flex', gap: '10px', alignItems: 'flex-start',
  padding: '10px 16px',
  borderBottom: '1px solid var(--theme-elevation-50)',
  transition: 'background 150ms',
}

const actionBadgeStyle: React.CSSProperties = {
  width: '24px', height: '24px', borderRadius: '6px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '14px', fontWeight: 700, flexShrink: 0,
  background: 'var(--theme-elevation-100)',
}

const itemContentStyle: React.CSSProperties = {
  flex: 1, minWidth: 0,
}

const itemTextStyle: React.CSSProperties = {
  fontSize: '12.5px', color: 'var(--theme-text)', lineHeight: 1.4,
  display: 'block',
}

const timeStyle: React.CSSProperties = {
  fontSize: '11px', color: 'var(--theme-elevation-400)',
  marginTop: '2px', display: 'block',
}
