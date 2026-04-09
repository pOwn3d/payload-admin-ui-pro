'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DashboardLayout, WidgetInstance } from './types.js'
import { StatsWidget } from './widgets/StatsWidget.js'
import { RecentActivityWidget } from './widgets/RecentActivityWidget.js'
import { QuickActionsWidget } from './widgets/QuickActionsWidget.js'
import { CollectionOverviewWidget } from './widgets/CollectionOverviewWidget.js'
import { WelcomeWidget } from './widgets/WelcomeWidget.js'
import { BookmarksWidget } from './widgets/BookmarksWidget.js'
import { NotesWidget } from './widgets/NotesWidget.js'
import { ChartWidget } from './widgets/ChartWidget.js'
import { ActivityAnalytics } from '../activity/ActivityAnalytics.js'
import { useAupT } from '../../utils/useTranslation.js'
import { fetchSettings } from '../../utils/settingsCache.js'
import { getRegisteredWidgets, type WidgetDefinition } from './widgetRegistry.js'

const BUILT_IN_WIDGETS: Record<string, React.FC<any>> = {
  stats: StatsWidget,
  'recent-activity': RecentActivityWidget,
  'quick-actions': QuickActionsWidget,
  'collection-overview': CollectionOverviewWidget,
  welcome: WelcomeWidget,
  bookmarks: BookmarksWidget,
  notes: NotesWidget,
  chart: ChartWidget,
  'activity-analytics': ActivityAnalytics,
}

const WIDGET_META: Record<string, { icon: string; title: string; iconBg?: string }> = {
  stats: { icon: '📊', title: 'Collections' },
  'recent-activity': { icon: '⚡', title: 'Recent Activity', iconBg: 'var(--aup-green-subtle)' },
  'quick-actions': { icon: '🚀', title: 'Quick Actions', iconBg: 'var(--aup-amber-subtle)' },
  'collection-overview': { icon: '📋', title: 'Posts' },
  welcome: { icon: '👋', title: 'Welcome', iconBg: 'var(--aup-accent-subtle)' },
  bookmarks: { icon: '🔖', title: 'Bookmarks' },
  notes: { icon: '📝', title: 'Notes' },
  chart: { icon: '📈', title: 'Activity Chart', iconBg: 'var(--aup-accent-subtle)' },
  'activity-analytics': { icon: '📊', title: 'Activity Analytics', iconBg: 'var(--aup-green-subtle)' },
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
  const [hasCustomLayout, setHasCustomLayout] = useState(false)
  const [canCustomize, setCanCustomize] = useState(true)
  const [dashTitle, setDashTitle] = useState('')
  const [dashSubtitle, setDashSubtitle] = useState('')
  const [customWidgets, setCustomWidgets] = useState<WidgetDefinition[]>([])
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load registered custom widgets on mount
  useEffect(() => {
    setCustomWidgets(getRegisteredWidgets())
  }, [])

  useEffect(() => {
    // Load both in parallel, then decide which layout wins
    const dashboardPromise = fetch('/api/admin-ui-pro/dashboard', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .catch(() => null)

    const settingsPromise = fetchSettings().catch(() => null)

    Promise.all([dashboardPromise, settingsPromise]).then(([dashData, settingsData]) => {
      // 1. Check settings for customization permission
      if (settingsData?.dashboardConfig?.allowCustomization === false) {
        setCanCustomize(false)
      }
      if (settingsData?.dashboardConfig?.dashboardTitle) {
        setDashTitle(settingsData.dashboardConfig.dashboardTitle)
      }
      if (settingsData?.dashboardConfig?.dashboardSubtitle) {
        setDashSubtitle(settingsData.dashboardConfig.dashboardSubtitle)
      }

      // 2. User has a saved custom layout — use it (takes priority)
      if (dashData?.layout?.widgets && Array.isArray(dashData.layout.widgets)) {
        setWidgets(dashData.layout.widgets)
        setHasCustomLayout(true)
        return
      }

      // 3. No custom layout — apply default widgets from settings
      const dw = settingsData?.dashboardConfig?.defaultWidgets
      if (Array.isArray(dw) && dw.length > 0) {
        const SIZE_MAP: Record<string, { w: number; h: number }> = {
          stats: { w: 7, h: 2 },
          'quick-actions': { w: 5, h: 2 },
          'recent-activity': { w: 7, h: 3 },
          'collection-overview': { w: 5, h: 3 },
          'activity-feed': { w: 6, h: 3 },
        }
        let y = 0
        let x = 0
        const layout: WidgetInstance[] = (dw as string[]).map((slug, i) => {
          const size = SIZE_MAP[slug] || { w: 6, h: 2 }
          if (x + size.w > 12) { x = 0; y += 3 }
          const item = { id: `${slug}-${i}`, widget: slug, x, y, w: size.w, h: size.h }
          x += size.w
          return item
        })
        setWidgets(layout)
      }
    })
  }, [])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
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

  const resizeWidget = useCallback((id: string, newW: number) => {
    const updated = widgets.map((w) => w.id === id ? { ...w, w: newW } : w)
    setWidgets(updated)
    saveLayout(updated)
  }, [widgets, saveLayout])

  // @dnd-kit sensors — require 8px movement before starting drag
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleDndEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setWidgets((prev) => {
      const oldIdx = prev.findIndex((w) => w.id === active.id)
      const newIdx = prev.findIndex((w) => w.id === over.id)
      if (oldIdx === -1 || newIdx === -1) return prev

      const updated = [...prev]
      const [moved] = updated.splice(oldIdx, 1)
      updated.splice(newIdx, 0, moved!)
      // Recalculate positions
      let x = 0, y = 0
      for (const w of updated) {
        if (x + w.w > 12) { x = 0; y += 3 }
        w.x = x; w.y = y
        x += w.w
      }
      saveLayout(updated)
      return updated
    })
  }, [saveLayout])

  const t = useAupT()

  // Defer ALL rendering to avoid hydration mismatch (SSR=en, client=fr)
  // The entire dashboard is client-only (depends on document.lang, Date, fetch)
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState('')
  useEffect(() => {
    setMounted(true)
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? t('greetingMorning') : hour < 18 ? t('greetingAfternoon') : t('greetingEvening'))
  }, [t])

  // Render nothing during SSR — the dashboard is fully client-side
  if (!mounted) {
    return <div style={{ padding: '0 2rem 3rem', maxWidth: '1400px', minHeight: '400px' }} />
  }

  return (
    <div style={{ padding: '0 2rem 3rem', maxWidth: '1400px' }}>

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
            <p suppressHydrationWarning style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--theme-text)', opacity: 0.40, margin: '0 0 4px' }}>{greeting}</p>
            <h1 suppressHydrationWarning style={{ fontSize: 'clamp(22px, 2.5vw, 30px)', fontWeight: 700, color: 'var(--theme-text)', lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>
              <span style={{ background: 'var(--aup-gradient-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{dashTitle || (mounted ? t('dashboard') : 'Dashboard')}</span>
            </h1>
            {dashSubtitle && (
              <p style={{ fontSize: '13px', color: 'var(--theme-text)', opacity: 0.5, margin: '4px 0 0', fontWeight: 400 }}>{dashSubtitle}</p>
            )}
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
                {customWidgets.map((cw) => (
                  <button key={cw.id} onClick={() => addWidget(cw.id)} type="button" style={{
                    padding: '6px 12px', borderRadius: 'var(--aup-radius-sm)',
                    border: '1px solid var(--aup-accent-border)', background: 'var(--aup-accent-subtle)',
                    color: 'var(--aup-accent)', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                  }}>+ {cw.icon} {cw.name}</button>
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

      {/* Widget grid with @dnd-kit */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDndEnd}>
        <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="aup-grid">
            {widgets.map((instance) => (
              <SortableWidget
                key={instance.id}
                instance={instance}
                editing={editing}
                onRemove={removeWidget}
                onResize={resizeWidget}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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

/** Size presets for the resize controls */
const SIZE_PRESETS = [
  { label: '¼', w: 3, icon: '▎' },
  { label: '⅓', w: 4, icon: '▍' },
  { label: '½', w: 6, icon: '▌' },
  { label: '⅔', w: 8, icon: '▊' },
  { label: 'Full', w: 12, icon: '█' },
]

/** Sortable widget wrapper using @dnd-kit */
const SortableWidget: React.FC<{
  instance: WidgetInstance
  editing: boolean
  onRemove: (id: string) => void
  onResize: (id: string, w: number) => void
}> = ({ instance, editing, onRemove, onResize }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: instance.id })

  // Resolve widget component: built-in first, then registered custom widgets
  let WidgetComponent = BUILT_IN_WIDGETS[instance.widget]
  let meta = WIDGET_META[instance.widget] || { icon: '📦', title: formatSlug(instance.widget) }

  if (!WidgetComponent) {
    const customWidget = getRegisteredWidgets().find((w) => w.id === instance.widget)
    if (!customWidget) return null
    WidgetComponent = customWidget.component
    meta = { icon: customWidget.icon, title: customWidget.name, iconBg: customWidget.iconBg }
  }

  const style: React.CSSProperties = {
    gridColumn: `span ${Math.min(instance.w, 12)}`,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: editing ? 'grab' : 'default',
    outline: editing ? '2px dashed var(--aup-accent-border)' : 'none',
    position: 'relative',
    minHeight: instance.h <= 2 ? '160px' : '240px',
  }

  return (
    <div
      ref={setNodeRef}
      className="aup-widget-card"
      style={style}
      {...(editing ? { ...attributes, ...listeners } : {})}
    >
      {editing && (
        <div style={editControlsStyle}>
          {/* Size selector */}
          <div style={sizeControlsStyle}>
            {SIZE_PRESETS.map((preset) => (
              <button
                key={preset.w}
                type="button"
                onClick={(e) => { e.stopPropagation(); onResize(instance.id, preset.w) }}
                style={{
                  ...sizeBtnStyle,
                  background: instance.w === preset.w ? 'var(--aup-accent)' : 'var(--theme-elevation-100)',
                  color: instance.w === preset.w ? '#fff' : 'var(--theme-elevation-500)',
                }}
                title={preset.label}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {/* Remove button */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(instance.id) }}
            type="button"
            aria-label="Remove"
            style={removeBtnStyle}
          >×</button>
        </div>
      )}
      <div className="aup-widget-header">
        <div className="aup-widget-header-left">
          <span className="aup-widget-icon" style={meta.iconBg ? { background: meta.iconBg } : undefined}>{meta.icon}</span>
          <h3 className="aup-widget-title">{meta.title}</h3>
        </div>
      </div>
      <div className="aup-widget-content">
        <WidgetComponent id={instance.id} slug={instance.widget} width={instance.w} height={instance.h} />
      </div>
    </div>
  )
}

const editControlsStyle: React.CSSProperties = {
  position: 'absolute', top: '6px', right: '6px', zIndex: 10,
  display: 'flex', alignItems: 'center', gap: '4px',
}

const sizeControlsStyle: React.CSSProperties = {
  display: 'flex', gap: '2px',
  background: 'var(--theme-elevation-50)',
  borderRadius: '6px',
  padding: '2px',
  border: 'var(--aup-border-subtle)',
}

const sizeBtnStyle: React.CSSProperties = {
  padding: '2px 6px', borderRadius: '4px',
  border: 'none',
  fontSize: '10px', fontWeight: 700, cursor: 'pointer',
  lineHeight: 1.4,
}

const removeBtnStyle: React.CSSProperties = {
  width: '22px', height: '22px', borderRadius: '50%', border: 'none',
  background: 'var(--aup-red)', color: '#fff', fontSize: '14px', lineHeight: 1,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

function formatSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
