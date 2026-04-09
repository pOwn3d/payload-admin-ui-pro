'use client'

import React, { useEffect, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'

interface AnalyticsData {
  totalActions: number
  byAction: Record<string, number>
  byCollection: Record<string, number>
  topContributors: Array<{ name: string; count: number }>
}

/**
 * Activity Analytics component — shows aggregated stats from the activity log.
 * Can be used as a standalone widget or in the activity settings.
 */
export const ActivityAnalytics: React.FC<{ id?: string }> = () => {
  const t = useAupT()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin-ui-pro/activity?limit=100', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((result) => {
        if (!result?.docs) return

        const docs = result.docs as Array<{ action: string; collection: string; userName: string }>
        const byAction: Record<string, number> = {}
        const byCollection: Record<string, number> = {}
        const byUser: Record<string, number> = {}

        for (const doc of docs) {
          byAction[doc.action] = (byAction[doc.action] || 0) + 1
          byCollection[doc.collection] = (byCollection[doc.collection] || 0) + 1
          byUser[doc.userName] = (byUser[doc.userName] || 0) + 1
        }

        const topContributors = Object.entries(byUser)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))

        setData({
          totalActions: docs.length,
          byAction,
          byCollection,
          topContributors,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={loadingStyle}>{t('loading')}</div>
  if (!data || data.totalActions === 0) return <div style={emptyStyle}>{t('noActivityYet')}</div>

  return (
    <div style={containerStyle}>
      {/* Stats row */}
      <div style={statsRowStyle}>
        <div style={statCardStyle}>
          <span style={statNumberStyle}>{data.totalActions}</span>
          <span style={statLabelStyle}>Total</span>
        </div>
        {Object.entries(data.byAction).map(([action, count]) => (
          <div key={action} style={statCardStyle}>
            <span style={statNumberStyle}>{count}</span>
            <span style={statLabelStyle}>{action}</span>
          </div>
        ))}
      </div>

      {/* Top collections */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>Top Collections</h4>
        {Object.entries(data.byCollection)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([col, count]) => (
            <div key={col} style={barRowStyle}>
              <span style={barLabelStyle}>{col}</span>
              <div style={barTrackStyle}>
                <div style={{ ...barFillStyle, width: `${(count / data.totalActions) * 100}%` }} />
              </div>
              <span style={barCountStyle}>{count}</span>
            </div>
          ))}
      </div>

      {/* Top contributors */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>Top Contributors</h4>
        {data.topContributors.map((c) => (
          <div key={c.name} style={barRowStyle}>
            <span style={barLabelStyle}>{c.name}</span>
            <div style={barTrackStyle}>
              <div style={{ ...barFillStyle, width: `${(c.count / data.totalActions) * 100}%` }} />
            </div>
            <span style={barCountStyle}>{c.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '16px',
}

const statsRowStyle: React.CSSProperties = {
  display: 'flex', gap: '12px', flexWrap: 'wrap',
}

const statCardStyle: React.CSSProperties = {
  flex: '1 1 80px', padding: '12px',
  borderRadius: '10px', background: 'var(--theme-elevation-50)',
  border: 'var(--aup-border-subtle)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
}

const statNumberStyle: React.CSSProperties = {
  fontSize: '20px', fontWeight: 700, color: 'var(--aup-accent)',
  fontFamily: 'var(--aup-font-numeric)',
}

const statLabelStyle: React.CSSProperties = {
  fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
  color: 'var(--theme-elevation-400)', letterSpacing: '0.05em',
}

const sectionStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '6px',
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0, fontSize: '12px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.04em',
  color: 'var(--theme-elevation-500)',
}

const barRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
}

const barLabelStyle: React.CSSProperties = {
  width: '100px', fontSize: '12px', fontWeight: 500,
  color: 'var(--theme-text)', overflow: 'hidden', textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const barTrackStyle: React.CSSProperties = {
  flex: 1, height: '6px', borderRadius: '3px',
  background: 'var(--theme-elevation-100)',
}

const barFillStyle: React.CSSProperties = {
  height: '100%', borderRadius: '3px',
  background: 'var(--aup-gradient-accent)',
  transition: 'width 0.3s ease',
}

const barCountStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: 'var(--theme-elevation-500)',
  fontFamily: 'var(--aup-font-numeric)', minWidth: '24px', textAlign: 'right',
}

const loadingStyle: React.CSSProperties = {
  padding: '1rem', textAlign: 'center', color: 'var(--theme-elevation-400)', fontSize: '13px',
}

const emptyStyle = loadingStyle
