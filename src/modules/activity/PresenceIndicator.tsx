'use client'

import React, { useEffect, useState } from 'react'

interface ActiveEditor {
  userId: string
  userName: string
  color: string
  lastSeen: number
}

const COLORS = [
  'hsl(250, 84%, 60%)', 'hsl(158, 64%, 42%)', 'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)', 'hsl(280, 72%, 58%)', 'hsl(200, 80%, 50%)',
  'hsl(320, 70%, 55%)', 'hsl(45, 85%, 45%)',
]

const HEARTBEAT_INTERVAL = 10_000 // 10s
const STALE_THRESHOLD = 30_000 // 30s

/**
 * Presence indicator — shows colored avatars of other users editing the same document.
 * Uses a simple heartbeat system via Payload preferences.
 * Injected via afterDocControls on document edit pages.
 */
export const PresenceIndicator: React.FC = () => {
  const [editors, setEditors] = useState<ActiveEditor[]>([])

  useEffect(() => {
    // Detect current document from URL
    const match = window.location.pathname.match(/\/admin\/collections\/([^/]+)\/([^/]+)/)
    if (!match) return

    const collection = match[1]
    const docId = match[2]
    if (docId === 'create') return

    const presenceKey = `presence:${collection}:${docId}`

    // Heartbeat: announce our presence
    const sendHeartbeat = () => {
      fetch('/api/admin-ui-pro/presence', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: presenceKey }),
      }).catch(() => {})
    }

    // Fetch active editors
    const fetchPresence = () => {
      fetch(`/api/admin-ui-pro/presence?key=${encodeURIComponent(presenceKey)}`, {
        credentials: 'include',
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.editors && Array.isArray(data.editors)) {
            const now = Date.now()
            const active = data.editors
              .filter((e: any) => now - e.lastSeen < STALE_THRESHOLD)
              .map((e: any, i: number) => ({
                userId: e.userId,
                userName: e.userName || 'User',
                color: COLORS[i % COLORS.length],
                lastSeen: e.lastSeen,
              }))
            setEditors(active)
          }
        })
        .catch(() => {})
    }

    sendHeartbeat()
    fetchPresence()
    const heartbeat = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)
    const poll = setInterval(fetchPresence, HEARTBEAT_INTERVAL)

    // Announce departure — use sendBeacon for reliability on page unload
    return () => {
      clearInterval(heartbeat)
      clearInterval(poll)
      const body = JSON.stringify({ key: presenceKey })
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/admin-ui-pro/presence?_method=DELETE', new Blob([body], { type: 'application/json' }))
      } else {
        fetch('/api/admin-ui-pro/presence', {
          method: 'DELETE', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body,
        }).catch(() => {})
      }
    }
  }, [])

  if (editors.length <= 1) return null // Only show when multiple editors

  return (
    <div style={containerStyle} title={editors.map((e) => e.userName).join(', ')}>
      {editors.slice(0, 5).map((editor) => (
        <div key={editor.userId} style={{
          ...avatarStyle,
          backgroundColor: editor.color,
          borderColor: editor.color,
        }} title={editor.userName}>
          {editor.userName.charAt(0).toUpperCase()}
        </div>
      ))}
      {editors.length > 5 && (
        <div style={{ ...avatarStyle, backgroundColor: 'var(--theme-elevation-200)', color: 'var(--theme-text)' }}>
          +{editors.length - 5}
        </div>
      )}
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  gap: '0px', // Overlapping
}

const avatarStyle: React.CSSProperties = {
  width: '28px', height: '28px',
  borderRadius: '50%',
  border: '2px solid var(--theme-elevation-0)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '11px', fontWeight: 700, color: '#fff',
  marginLeft: '-6px',
  cursor: 'default',
}
