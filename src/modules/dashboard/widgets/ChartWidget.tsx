'use client'

import { useEffect, useRef, useState } from 'react'
import type { WidgetProps } from '../types.js'
import { fetchCollections } from '../../../utils/collectionsCache.js'
import { useAupT } from '../../../utils/useTranslation.js'

interface DayBucket {
  date: string   // YYYY-MM-DD
  count: number
}

interface ChartData {
  buckets: DayBucket[]
  total: number
  trendPercent: number
}

/**
 * Activity Chart Widget — SVG-only bar/area chart showing document creation
 * over the last 30 days. No external charting library.
 */
export const ChartWidget: React.FC<WidgetProps> = ({ width }) => {
  const [data, setData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgWidth, setSvgWidth] = useState(400)
  const t = useAupT()

  // Responsive: observe container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSvgWidth(Math.max(200, entry.contentRect.width))
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const colData = await fetchCollections()
        if (!mounted || !colData?.collections) { setLoading(false); return }

        // Pick first user-facing collection with createdAt
        const slugs = colData.collections
          .map((c) => c.slug)
          .filter((s) => !s.startsWith('payload-') && !s.startsWith('admin-ui-pro'))
          .slice(0, 5)

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const isoDate = thirtyDaysAgo.toISOString()

        // Fetch docs created in last 30 days across collections
        const allDocs: { createdAt: string }[] = []

        for (const slug of slugs) {
          try {
            const res = await fetch(
              `/api/${slug}?where[createdAt][greater_than]=${encodeURIComponent(isoDate)}&limit=500&depth=0&select[createdAt]=true`,
              { credentials: 'include' },
            )
            if (!res.ok) continue
            const json = await res.json()
            if (json.docs) {
              allDocs.push(...json.docs.map((d: any) => ({ createdAt: d.createdAt })))
            }
          } catch {
            // skip this collection
          }
        }

        if (!mounted) return

        // Build 30-day buckets
        const buckets: DayBucket[] = []
        for (let i = 29; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          buckets.push({ date: toDateStr(d), count: 0 })
        }

        for (const doc of allDocs) {
          const ds = toDateStr(new Date(doc.createdAt))
          const bucket = buckets.find((b) => b.date === ds)
          if (bucket) bucket.count++
        }

        // Calculate trend: compare last 15 days vs first 15 days
        const firstHalf = buckets.slice(0, 15).reduce((s, b) => s + b.count, 0)
        const secondHalf = buckets.slice(15).reduce((s, b) => s + b.count, 0)
        const trendPercent = firstHalf === 0
          ? (secondHalf > 0 ? 100 : 0)
          : Math.round(((secondHalf - firstHalf) / firstHalf) * 100)

        setData({
          buckets,
          total: allDocs.length,
          trendPercent,
        })
      } catch {
        // silent fail
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <div className="aup-skeleton" style={{ height: '160px', borderRadius: 'var(--aup-radius-md)' }} />
      </div>
    )
  }

  if (!data || data.total === 0) {
    return (
      <div ref={containerRef} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
        <p style={{ color: 'var(--theme-text)', opacity: 0.4, fontSize: '13px', margin: 0 }}>
          {t('noDocuments')}
        </p>
      </div>
    )
  }

  const svgHeight = 140
  const barGap = 2
  const maxCount = Math.max(...data.buckets.map((b) => b.count), 1)
  const barWidth = Math.max(2, (svgWidth - barGap * 30) / 30)
  const chartPadding = { top: 8, bottom: 20, left: 0, right: 0 }
  const chartH = svgHeight - chartPadding.top - chartPadding.bottom

  const trendColor = data.trendPercent >= 0 ? 'var(--aup-green, hsl(158,64%,42%))' : 'var(--aup-red, hsl(0,72%,51%))'
  const trendArrow = data.trendPercent >= 0 ? '\u2191' : '\u2193'

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Summary row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--theme-text)', lineHeight: 1 }}>
          {data.total}
        </span>
        <span style={{
          fontSize: '12px', fontWeight: 600, color: trendColor,
          padding: '2px 6px', borderRadius: 'var(--aup-radius-sm)',
          background: data.trendPercent >= 0 ? 'var(--aup-green-subtle, hsl(158,64%,42%/0.1))' : 'var(--aup-red-subtle, hsl(0,72%,51%/0.1))',
        }}>
          {trendArrow} {data.trendPercent > 0 ? '+' : ''}{data.trendPercent}%
        </span>
        <span style={{ fontSize: '11px', color: 'var(--theme-text)', opacity: 0.4 }}>
          {t('last30Days')}
        </span>
      </div>

      {/* SVG Bar Chart */}
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-label={t('activityChart')}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        {/* Gradient definition for bars */}
        <defs>
          <linearGradient id="aup-chart-bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--aup-accent, hsl(250,84%,60%))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--aup-accent, hsl(250,84%,60%))" stopOpacity="0.4" />
          </linearGradient>
          {/* Area gradient fill */}
          <linearGradient id="aup-chart-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--aup-accent, hsl(250,84%,60%))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--aup-accent, hsl(250,84%,60%))" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => {
          const ly = chartPadding.top + chartH * (1 - frac)
          return (
            <line
              key={frac}
              x1={0}
              y1={ly}
              x2={svgWidth}
              y2={ly}
              stroke="var(--theme-elevation-200, #e5e5e5)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.5"
            />
          )
        })}

        {/* Area path behind bars */}
        <path
          d={buildAreaPath(data.buckets, svgWidth, chartH, chartPadding.top, maxCount, barWidth, barGap)}
          fill="url(#aup-chart-area-grad)"
        />

        {/* Bars */}
        {data.buckets.map((bucket, i) => {
          const barH = (bucket.count / maxCount) * chartH
          const x = i * (barWidth + barGap)
          const y = chartPadding.top + chartH - barH
          return (
            <g key={bucket.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, bucket.count > 0 ? 2 : 0)}
                rx={Math.min(barWidth / 2, 3)}
                fill="url(#aup-chart-bar-grad)"
              />
              {/* Tooltip hitbox */}
              <title>{`${bucket.date}: ${bucket.count}`}</title>
            </g>
          )
        })}

        {/* X-axis labels — show a few date markers */}
        {[0, 7, 14, 21, 29].map((idx) => {
          const bucket = data.buckets[idx]
          if (!bucket) return null
          const x = idx * (barWidth + barGap) + barWidth / 2
          return (
            <text
              key={idx}
              x={x}
              y={svgHeight - 4}
              textAnchor="middle"
              fontSize="9"
              fill="var(--theme-text)"
              opacity="0.35"
            >
              {formatShortDate(bucket.date)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

/** Build an SVG area path from buckets */
function buildAreaPath(
  buckets: DayBucket[],
  svgW: number,
  chartH: number,
  topPad: number,
  maxCount: number,
  barW: number,
  barGap: number,
): string {
  const points = buckets.map((b, i) => {
    const x = i * (barW + barGap) + barW / 2
    const y = topPad + chartH - (b.count / maxCount) * chartH
    return `${x},${y}`
  })
  const baseline = topPad + chartH
  const firstX = barW / 2
  const lastX = (buckets.length - 1) * (barW + barGap) + barW / 2
  return `M${firstX},${baseline} L${points.join(' L')} L${lastX},${baseline} Z`
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${parseInt(d!, 10)}/${parseInt(m!, 10)}`
}
