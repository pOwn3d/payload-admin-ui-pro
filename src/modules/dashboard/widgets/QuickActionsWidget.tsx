'use client'

import { useEffect, useState } from 'react'
import type { WidgetProps } from '../types.js'
import { fetchCollections } from '../../../utils/collectionsCache.js'
import { useAupT } from '../../../utils/useTranslation.js'

interface QuickLink { label: string; href: string; icon: string; iconBg: string }

const SLUG_ICONS: Record<string, { icon: string; bg: string }> = {
  pages:      { icon: '📄', bg: 'var(--aup-accent-subtle)' },
  posts:      { icon: '✍️', bg: 'var(--aup-green-subtle)' },
  categories: { icon: '🏷️', bg: 'hsl(200,70%,50%/0.10)' },
  media:      { icon: '🖼',  bg: 'var(--aup-amber-subtle)' },
  users:      { icon: '👤', bg: 'hsl(280,72%,58%/0.10)' },
}
const DEFAULT_ICON = { icon: '📦', bg: 'var(--theme-elevation-100)' }

export const QuickActionsWidget: React.FC<WidgetProps> = () => {
  const [links, setLinks] = useState<QuickLink[]>([])

  const t = useAupT()

  useEffect(() => {
    let mounted = true
    fetchCollections()
      .then((data) => {
        if (!mounted || !data?.collections) return
        const actions: QuickLink[] = []
        const content = data.collections
          .map((c) => c.slug)
          .filter((s) => !s.startsWith('payload-') && s !== 'dashboard-preferences' && s !== 'users' && s !== 'media')
        for (const slug of content.slice(0, 4)) {
          const cfg = SLUG_ICONS[slug] || DEFAULT_ICON
          actions.push({ label: t('newItem', { label: formatLabel(slug) }), href: `/admin/collections/${slug}/create`, icon: cfg.icon, iconBg: cfg.bg })
        }
        if (data.collections.some((c) => c.slug === 'media')) {
          actions.push({ label: t('uploadMedia'), href: '/admin/collections/media/create', icon: '↑', iconBg: 'var(--aup-amber-subtle)' })
        }
        setLinks(actions)
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  if (links.length === 0) return null

  return (
    <div className="aup-actions-grid">
      {links.map((link) => (
        <a key={link.href} href={link.href} className="aup-action-btn">
          <span className="aup-action-icon" style={{ background: link.iconBg }}>{link.icon}</span>
          <span style={{ flex: 1, textAlign: 'left' }}>{link.label}</span>
          <span className="aup-action-arrow">→</span>
        </a>
      ))}
    </div>
  )
}

function formatLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
