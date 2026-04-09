'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { DashboardLayout, WidgetInstance } from './types.js'
import { StatsWidget } from './widgets/StatsWidget.js'
import { RecentActivityWidget } from './widgets/RecentActivityWidget.js'
import { QuickActionsWidget } from './widgets/QuickActionsWidget.js'
import { CollectionOverviewWidget } from './widgets/CollectionOverviewWidget.js'
import { DESIGN_TOKENS_CSS } from '../../styles/tokens.js'
import { useAupT } from '../../utils/useTranslation.js'
import { fetchSettings } from '../../utils/settingsCache.js'

const BUILT_IN_WIDGETS: Record<string, React.FC<{ id: string; slug: string; width: number; height: number }>> = {
  stats: StatsWidget,
  'recent-activity': RecentActivityWidget,
  'quick-actions': QuickActionsWidget,
  'collection-overview': CollectionOverviewWidget,
}

const WIDGET_META: Record<string, { icon: string; title: string; iconBg?: string }> = {
  stats: { icon: '📊', title: 'Collections' },
  'recent-activity': { icon: '⚡', title: 'Recent Activity', iconBg: 'var(--aup-green-subtle)' },
  'quick-actions': { icon: '🚀', title: 'Quick Actions', iconBg: 'var(--aup-amber-subtle)' },
  'collection-overview': { icon: '📋', title: 'Posts' },
}

const DEFAULT_LAYOUT: WidgetInstance[] = [
  { id: 'stats-1', widget: 'stats', x: 0, y: 0, w: 7, h: 2 },
  { id: 'quick-actions-1', widget: 'quick-actions', x: 7, y: 0, w: 5, h: 2 },
  { id: 'recent-activity-1', widget: 'recent-activity', x: 0, y: 2, w: 7, h: 3 },
  { id: 'collection-overview-posts', widget: 'collection-overview', x: 7, y: 2, w: 5, h: 3 },
]

export const DashboardClient: React.FC = () => {
  const [widgets, setWidgets] = useState<WidgetInstance[]>(DEFAULT_LAYOUT)
  const [editing, setEditing] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [hasCustomLayout, setHasCustomLayout] = useState(false)
  const [canCustomize, setCanCustomize] = useState(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Load user preferences
    fetch('/api/admin-ui-pro/dashboard', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.layout?.widgets && Array.isArray(data.layout.widgets)) {
          setWidgets(data.layout.widgets)
          setHasCustomLayout(true)
        }
      })
      .catch(() => {})

    // Load settings (allowCustomization, default widgets)
    fetchSettings().then((data) => {
      if (data?.dashboardConfig) {
        if (data.dashboardConfig.allowCustomization === false) {
          setCanCustomize(false)
        }
        // Apply default widgets from settings if no custom layout saved
        if (!hasCustomLayout && data.dashboardConfig.defaultWidgets && Array.isArray(data.dashboardConfig.defaultWidgets)) {
          const dw = data.dashboardConfig.defaultWidgets as string[]
          if (dw.length > 0) {
            const SIZE_MAP: Record<string, { w: number; h: number }> = {
              stats: { w: 7, h: 2 },
              'quick-actions': { w: 5, h: 2 },
              'recent-activity': { w: 7, h: 3 },
              'collection-overview': { w: 5, h: 3 },
              'activity-feed': { w: 6, h: 3 },
            }
            let y = 0
            let x = 0
            const layout: WidgetInstance[] = dw.map((slug, i) => {
              const size = SIZE_MAP[slug] || { w: 6, h: 2 }
              if (x + size.w > 12) { x = 0; y += 3 }
              const item = { id: `${slug}-${i}`, widget: slug, x, y, w: size.w, h: size.h }
              x += size.w
              return item
            })
            setWidgets(layout)
          }
        }
      }
    }).catch(() => {})
  }, [])

  const saveLayout = useCallback((newWidgets: WidgetInstance[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const layout: DashboardLayout = { widgets: newWidgets, version: 1 }
      fetch('/api/admin-ui-pro/dashboard', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout }),
      }).catch(() => {})
    }, 500)
  }, [])

  const resetLayout = useCallback(() => {
    setWidgets(DEFAULT_LAYOUT)
    setHasCustomLayout(false)
    fetch('/api/admin-ui-pro/dashboard', { method: 'DELETE', credentials: 'include' }).catch(() => {})
  }, [])

  const addWidget = useCallback((slug: string) => {
    const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0)
    const newWidget: WidgetInstance = { id: `${slug}-${Date.now()}`, widget: slug, x: 0, y: maxY, w: 6, h: 2 }
    const updated = [...widgets, newWidget]
    setWidgets(updated)
    saveLayout(updated)
  }, [widgets, saveLayout])

  const removeWidget = useCallback((id: string) => {
    const updated = widgets.filter((w) => w.id !== id)
    setWidgets(updated)
    saveLayout(updated)
  }, [widgets, saveLayout])

  const handleDragStart = useCallback((id: string) => { setDraggedId(id) }, [])

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return
    setWidgets((prev) => {
      const dragIdx = prev.findIndex((w) => w.id === draggedId)
      const targetIdx = prev.findIndex((w) => w.id === targetId)
      if (dragIdx === -1 || targetIdx === -1) return prev
      const updated = [...prev]
      const dragW = updated[dragIdx]!
      const targetW = updated[targetIdx]!
      const tx = dragW.x; const ty = dragW.y
      dragW.x = targetW.x; dragW.y = targetW.y
      targetW.x = tx; targetW.y = ty
      updated[dragIdx] = targetW; updated[targetIdx] = dragW
      return updated
    })
  }, [draggedId])

  const handleDragEnd = useCallback(() => {
    if (draggedId) saveLayout(widgets)
    setDraggedId(null)
  }, [draggedId, widgets, saveLayout])

  const t = useAupT()

  // Greeting based on time
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('greetingMorning') : hour < 18 ? t('greetingAfternoon') : t('greetingEvening')

  return (
    <div style={{ padding: '0 2rem 3rem', maxWidth: '1400px' }}>
      {/* Design tokens injection */}
      <style>{DESIGN_TOKENS_CSS}</style>

      {/* Header with mesh gradient */}
      <header style={{
        position: 'relative',
        padding: '2rem 0 1.5rem',
        background: 'var(--aup-gradient-mesh)',
        marginBottom: '1.5rem',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle at top right, hsl(250,84%,60%/0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--theme-text)', opacity: 0.40, margin: '0 0 4px' }}>{greeting}</p>
            <h1 style={{ fontSize: 'clamp(22px, 2.5vw, 30px)', fontWeight: 700, color: 'var(--theme-text)', lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>
              <span style={{ background: 'var(--aup-gradient-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('dashboard')}</span>
            </h1>
          </div>
          {canCustomize && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {editing && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {Object.keys(BUILT_IN_WIDGETS).map((slug) => (
                  <button key={slug} onClick={() => addWidget(slug)} type="button" style={{
                    padding: '6px 12px', borderRadius: 'var(--aup-radius-sm)',
                    border: 'var(--aup-border-subtle)', background: 'var(--theme-elevation-50)',
                    color: 'var(--theme-text)', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                  }}>+ {formatSlug(slug)}</button>
                ))}
              </div>
            )}
            {hasCustomLayout && (
              <button onClick={resetLayout} type="button" style={{
                padding: '8px 14px', borderRadius: 'var(--aup-radius-md)',
                border: 'var(--aup-border-subtle)', background: 'var(--theme-elevation-50)',
                color: 'var(--theme-text)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              }}>{t('reset')}</button>
            )}
            <button onClick={() => setEditing(!editing)} type="button" style={{
              padding: '8px 16px', borderRadius: 'var(--aup-radius-md)',
              border: editing ? '1px solid transparent' : '1px solid var(--aup-accent-border)',
              background: editing ? 'var(--aup-accent)' : 'var(--aup-accent-subtle)',
              color: editing ? '#fff' : 'var(--aup-accent)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              transition: 'all var(--aup-duration-base) var(--aup-easing)',
            }}>{editing ? `✓ ${t('done')}` : `⚙ ${t('customize')}`}</button>
          </div>
          )}
        </div>
      </header>

      {/* Widget grid */}
      <div className="aup-grid">
        {widgets.map((instance) => {
          const WidgetComponent = BUILT_IN_WIDGETS[instance.widget]
          if (!WidgetComponent) return null
          const meta = WIDGET_META[instance.widget] || { icon: '📦', title: formatSlug(instance.widget) }

          return (
            <div
              key={instance.id}
              className="aup-widget-card"
              draggable={editing}
              onDragStart={() => handleDragStart(instance.id)}
              onDragOver={(e) => handleDragOver(e, instance.id)}
              onDragEnd={handleDragEnd}
              style={{
                gridColumn: `span ${Math.min(instance.w, 12)}`,
                opacity: draggedId === instance.id ? 0.5 : 1,
                cursor: editing ? 'grab' : 'default',
                outline: editing ? '2px dashed var(--aup-accent-border)' : 'none',
                position: 'relative',
                minHeight: '180px',
              }}
            >
              {editing && (
                <button onClick={() => removeWidget(instance.id)} type="button" aria-label="Remove" style={{
                  position: 'absolute', top: '8px', right: '8px', zIndex: 10,
                  width: '22px', height: '22px', borderRadius: '50%', border: 'none',
                  background: 'var(--aup-red)', color: '#fff', fontSize: '14px', lineHeight: 1,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>×</button>
              )}
              {/* Widget header */}
              <div className="aup-widget-header">
                <div className="aup-widget-header-left">
                  <span className="aup-widget-icon" style={meta.iconBg ? { background: meta.iconBg } : undefined}>{meta.icon}</span>
                  <h3 className="aup-widget-title">{meta.title}</h3>
                </div>
              </div>
              {/* Widget content */}
              <div className="aup-widget-content">
                <WidgetComponent id={instance.id} slug={instance.widget} width={instance.w} height={instance.h} />
              </div>
            </div>
          )
        })}
      </div>

      {widgets.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem', textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem' }}>📊</span>
          <p style={{ margin: 0, color: 'var(--theme-text)', opacity: 0.45, fontSize: '14px' }}>{t('emptyDashboard')}</p>
          <button onClick={() => { setEditing(true); addWidget('stats') }} type="button" style={{
            padding: '10px 20px', borderRadius: 'var(--aup-radius-md)',
            border: 'none', background: 'var(--aup-gradient-accent)', color: '#fff',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>{t('addWidget')}</button>
        </div>
      )}
    </div>
  )
}

function formatSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
