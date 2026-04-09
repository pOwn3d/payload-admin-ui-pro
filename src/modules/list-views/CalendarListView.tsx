'use client'

import React, { useCallback, useMemo, useState } from 'react'
import type { ListViewComponentProps } from './types.js'
import { useAupT } from '../../utils/useTranslation.js'

type DragState = { docId: string; fromDay: number } | null

const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/**
 * Calendar list view — displays documents in a monthly calendar grid.
 * Maps documents to days based on their date field (createdAt, publishedAt, or custom).
 */
export const CalendarListView: React.FC<ListViewComponentProps> = ({
  collection,
  docs,
  loading,
  cardConfig,
}) => {
  const t = useAupT()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const dateField = cardConfig?.subtitleField || 'createdAt'
  const titleField = cardConfig?.titleField || 'title'
  const [dragState, setDragState] = useState<DragState>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  // Build a map of day -> docs
  const docsByDay = useMemo(() => {
    const map = new Map<number, typeof docs>()
    for (const doc of docs) {
      const dateVal = doc[dateField] || doc.createdAt || doc.publishedAt
      if (!dateVal || typeof dateVal !== 'string') continue
      const d = new Date(dateVal)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!map.has(day)) map.set(day, [])
        map.get(day)!.push(doc)
      }
    }
    return map
  }, [docs, year, month, dateField])

  // Calendar grid data
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  // Monday=0 to Sunday=6
  const startOffset = (firstDay.getDay() + 6) % 7

  const goToPrev = useCallback(() => {
    if (month === 0) { setYear(year - 1); setMonth(11) }
    else setMonth(month - 1)
  }, [year, month])

  const goToNext = useCallback(() => {
    if (month === 11) { setYear(year + 1); setMonth(0) }
    else setMonth(month + 1)
  }, [year, month])

  const goToToday = useCallback(() => {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }, [])

  const handleDragStart = useCallback((docId: string, fromDay: number) => {
    setDragState({ docId, fromDay })
  }, [])

  const handleDrop = useCallback(async (toDay: number) => {
    if (!dragState || dragState.fromDay === toDay) { setDragState(null); return }

    const newDate = new Date(year, month, toDay)
    setUpdating(dragState.docId)
    setDragState(null)

    try {
      await fetch(`/api/${collection}/${dragState.docId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [dateField]: newDate.toISOString() }),
      })
    } catch { /* silent */ }
    setUpdating(null)
  }, [dragState, year, month, collection, dateField])

  if (loading) {
    return <div style={loadingStyle}>{t('loading')}</div>
  }

  // Build cells: empty + days
  const cells: Array<{ day: number | null }> = []
  for (let i = 0; i < startOffset; i++) cells.push({ day: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d })

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="aup-calendar-view">
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={goToPrev} type="button" style={navBtnStyle} title={t('calendarPrev')}>‹</button>
        <div style={monthLabelStyle}>
          {MONTHS_EN[month]} {year}
        </div>
        <button onClick={goToToday} type="button" style={todayBtnStyle}>{t('calendarToday')}</button>
        <button onClick={goToNext} type="button" style={navBtnStyle} title={t('calendarNext')}>›</button>
      </div>

      {/* Day headers */}
      <div className="aup-calendar-grid" style={gridStyle}>
        {DAYS_EN.map((d) => (
          <div key={d} className="aup-calendar-dayheader" style={dayHeaderStyle}>{d}</div>
        ))}

        {/* Calendar cells */}
        {cells.map((cell, i) => {
          if (cell.day === null) {
            return <div key={`empty-${i}`} className="aup-calendar-empty" style={emptyCellStyle} />
          }
          const dayDocs = docsByDay.get(cell.day) || []
          const todayClass = isToday(cell.day)

          return (
            <div
              key={cell.day}
              className="aup-calendar-cell"
              style={{
                ...cellStyle,
                ...(todayClass ? todayCellStyle : {}),
                ...(dragState ? { outline: '2px dashed var(--aup-accent-border)' } : {}),
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => cell.day != null && handleDrop(cell.day)}
            >
              <div style={{
                ...dayNumberStyle,
                ...(todayClass ? todayNumberStyle : {}),
              }}>
                {cell.day}
              </div>
              <div style={docsContainerStyle}>
                {dayDocs.slice(0, 3).map((doc) => {
                  const title = (doc[titleField] as string) || `#${doc.id}`
                  const isUpdating = updating === String(doc.id)
                  return (
                    <a
                      key={doc.id}
                      href={`/admin/collections/${collection}/${doc.id}`}
                      style={{ ...docPillStyle, opacity: isUpdating ? 0.4 : 1, cursor: 'grab' }}
                      title={title}
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); cell.day != null && handleDragStart(String(doc.id), cell.day) }}
                    >
                      {title.length > 20 ? title.substring(0, 20) + '...' : title}
                    </a>
                  )
                })}
                {dayDocs.length > 3 && (
                  <span style={moreStyle}>+{dayDocs.length - 3}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  marginBottom: '12px',
}

const monthLabelStyle: React.CSSProperties = {
  flex: 1, fontSize: '16px', fontWeight: 700,
  color: 'var(--theme-text)', textAlign: 'center',
}

const navBtnStyle: React.CSSProperties = {
  width: '32px', height: '32px', borderRadius: '8px',
  border: '1px solid var(--theme-elevation-200)',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
  fontSize: '18px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const todayBtnStyle: React.CSSProperties = {
  padding: '4px 12px', borderRadius: '6px',
  border: '1px solid var(--aup-accent-border)',
  background: 'var(--aup-accent-subtle)',
  color: 'var(--aup-accent)',
  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '1px',
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '12px',
  overflow: 'hidden',
  backgroundColor: 'var(--theme-elevation-150)',
}

const dayHeaderStyle: React.CSSProperties = {
  padding: '8px', textAlign: 'center',
  fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  color: 'var(--theme-elevation-500)',
  backgroundColor: 'var(--theme-elevation-50)',
}

const emptyCellStyle: React.CSSProperties = {
  minHeight: '100px',
  backgroundColor: 'var(--theme-elevation-50)',
}

const cellStyle: React.CSSProperties = {
  minHeight: '100px',
  padding: '4px',
  backgroundColor: 'var(--theme-elevation-0)',
  display: 'flex', flexDirection: 'column',
}

const todayCellStyle: React.CSSProperties = {
  backgroundColor: 'var(--aup-accent-subtle)',
}

const dayNumberStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 600,
  color: 'var(--theme-elevation-500)',
  padding: '4px 6px',
  lineHeight: 1,
}

const todayNumberStyle: React.CSSProperties = {
  color: '#fff',
  backgroundColor: 'var(--aup-accent)',
  borderRadius: '50%',
  width: '24px', height: '24px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const docsContainerStyle: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', gap: '2px',
  overflow: 'hidden',
}

const docPillStyle: React.CSSProperties = {
  padding: '2px 6px', borderRadius: '4px',
  fontSize: '10px', fontWeight: 500, lineHeight: 1.4,
  backgroundColor: 'var(--aup-accent-subtle)',
  color: 'var(--aup-accent)',
  textDecoration: 'none',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
}

const moreStyle: React.CSSProperties = {
  fontSize: '10px', color: 'var(--theme-elevation-400)',
  padding: '1px 6px',
}

const loadingStyle: React.CSSProperties = {
  padding: '2rem', textAlign: 'center',
  color: 'var(--theme-elevation-500)',
}
