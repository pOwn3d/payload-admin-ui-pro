'use client'

import { useEffect, useState } from 'react'
import type { WidgetProps } from '../types.js'
import { fetchCollections } from '../../../utils/collectionsCache.js'

interface CollectionStat { slug: string; label: string; count: number }

const SLUG_CONFIG: Record<string, { icon: string; bg: string; border: string }> = {
  pages:      { icon: '📄', bg: 'var(--aup-accent-subtle)',   border: 'var(--aup-accent-border)' },
  posts:      { icon: '✍️', bg: 'var(--aup-green-subtle)',    border: 'hsl(158,64%,42%/0.25)' },
  media:      { icon: '🖼',  bg: 'var(--aup-amber-subtle)',    border: 'hsl(38,92%,50%/0.25)' },
  users:      { icon: '👤', bg: 'hsl(280,72%,58%/0.10)',      border: 'hsl(280,72%,58%/0.25)' },
  categories: { icon: '🏷️', bg: 'hsl(200,70%,50%/0.10)',      border: 'hsl(200,70%,50%/0.25)' },
}
const DEFAULT_CONFIG = { icon: '📦', bg: 'var(--theme-elevation-100)', border: 'var(--theme-elevation-200)' }

export const StatsWidget: React.FC<WidgetProps> = () => {
  const [stats, setStats] = useState<CollectionStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetchCollections()
      .then(async (data) => {
        if (!mounted || !data?.collections) return
        const slugs = data.collections.map((c) => c.slug).filter((s) => !s.startsWith('payload-')).slice(0, 8)
        const results = await Promise.all(
          slugs.map(async (slug) => {
            try {
              const count = await fetchCount(slug)
              if (count === null) return null
              return { slug, label: formatLabel(slug), count }
            } catch { return null }
          }),
        )
        if (mounted) { setStats(results.filter(Boolean) as CollectionStat[]); setLoading(false) }
      })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div className="aup-stats-grid">
        {[1,2,3,4].map((i) => (
          <div key={i} className="aup-skeleton" style={{ height: '80px', borderRadius: 'var(--aup-radius-md)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="aup-stats-grid">
      {stats.map((stat) => {
        const cfg = SLUG_CONFIG[stat.slug] || DEFAULT_CONFIG
        return (
          <a key={stat.slug} href={`/admin/collections/${stat.slug}`} className="aup-stat-card"
            style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '16px' }}>{cfg.icon}</span>
            </div>
            <p className="aup-stat-number">{stat.count}</p>
            <p className="aup-stat-label">{stat.label}</p>
          </a>
        )
      })}
    </div>
  )
}

/**
 * Count documents in a collection without downloading them.
 *
 * `?limit=0` does NOT mean "no documents" in Payload: the adapter reads it as
 * "disable pagination", fetches EVERY row, runs access control and afterRead
 * hooks on each, then serialises the lot — just to read `totalDocs`. Done for
 * up to 8 collections on the default /admin dashboard, that is the whole
 * database over the wire. `/count` returns `{ totalDocs }` and applies the same
 * access control.
 *
 * `?limit=1` is the fallback for hosts on a Payload build without the `/count`
 * route — one document instead of all of them. Never `pagination=false`, which
 * is the very trap `limit=0` falls into.
 */
export async function fetchCount(slug: string): Promise<number | null> {
  const countRes = await fetch(`/api/${slug}/count`, { credentials: 'include' })
  if (countRes.ok) {
    const json = await countRes.json()
    if (typeof json?.totalDocs === 'number') return json.totalDocs
  } else if (countRes.status !== 404 && countRes.status !== 405) {
    // 401/403/500 are real answers, not a missing route — do not retry.
    return null
  }

  const res = await fetch(`/api/${slug}?limit=1&depth=0`, { credentials: 'include' })
  if (!res.ok) return null
  const json = await res.json()
  return json.totalDocs ?? 0
}

function formatLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
