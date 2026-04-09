'use client'

import { useEffect, useState } from 'react'
import type { WidgetProps } from '../types.js'
import { fetchCollections } from '../../../utils/collectionsCache.js'
import { useAupT } from '../../../utils/useTranslation.js'

interface ActivityItem {
  id: string; collection: string; title: string
  action: 'created' | 'updated'; updatedAt: string; url: string
}

export const RecentActivityWidget: React.FC<WidgetProps> = () => {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetchCollections()
      .then(async (data) => {
        if (!mounted || !data?.collections) return
        const slugs = data.collections.map((c) => c.slug)
          .filter((s: string) => !s.startsWith('payload-') && s !== 'dashboard-preferences')
          .slice(0, 6)
        const allItems: ActivityItem[] = []
        await Promise.all(
          slugs.map(async (slug: string) => {
            try {
              const res = await fetch(`/api/${slug}?limit=3&depth=0&sort=-updatedAt`, { credentials: 'include' })
              if (!res.ok) return
              const json = await res.json()
              for (const doc of (json.docs ?? [])) {
                allItems.push({
                  id: doc.id, collection: slug,
                  title: doc.title || doc.name || doc.filename || doc.email || `#${doc.id}`,
                  action: doc.createdAt === doc.updatedAt ? 'created' : 'updated',
                  updatedAt: doc.updatedAt,
                  url: `/admin/collections/${slug}/${doc.id}`,
                })
              }
            } catch {}
          }),
        )
        if (mounted) {
          allItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          setItems(allItems.slice(0, 10))
          setLoading(false)
        }
      })
      .catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const t = useAupT()

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[1,2,3,4].map((i) => (
          <div key={i} className="aup-skeleton" style={{ height: '36px' }} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <div style={{ color: 'var(--theme-text)', opacity: 0.4, fontSize: '13px' }}>{t('noRecentActivity')}</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map((item) => {
        const isCreated = item.action === 'created'
        return (
          <a key={`${item.collection}-${item.id}`} href={item.url} className="aup-activity-item">
            <span className={`aup-activity-avatar aup-activity-avatar--${isCreated ? 'created' : 'updated'}`}>
              {isCreated ? '+' : '~'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', color: 'var(--theme-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <strong style={{ fontWeight: 600 }}>{item.title}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span className={`aup-activity-badge aup-activity-badge--${isCreated ? 'created' : 'updated'}`}>
                  {isCreated ? t('activityNew') : t('activityEdit')}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--theme-text)', opacity: 0.38 }}>
                  {formatLabel(item.collection)} · {timeAgo(item.updatedAt)}
                </span>
              </div>
            </div>
          </a>
        )
      })}
    </div>
  )
}

function formatLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// timeAgo is not translated here — it uses the t() function from the component
// This is a shared helper that returns raw strings
function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 0) return ''
  if (seconds < 60) return '{{justNow}}'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
