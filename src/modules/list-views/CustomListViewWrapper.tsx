'use client'

import React, { useEffect, useState } from 'react'
import { CustomListView } from './CustomListView.js'
import type { ViewMode } from './types.js'

/**
 * Wrapper injected via beforeListTable.
 * Reads config from:
 * 1. Window registry (populated by ListViewsInitializer)
 * 2. Fallback: reads directly from data-list-views-config data attribute
 *
 * Uses state + effect to handle timing: the registry may not be populated
 * at first render since ListViewsInitializer runs in a useEffect.
 */
export const CustomListViewWrapper: React.FC = () => {
  const slug = extractCollectionSlug()
  const [config, setConfig] = useState<ListViewConfigEntry | null>(null)

  useEffect(() => {
    if (!slug) return

    // Try registry first
    const fromRegistry = getListViewConfig(slug)
    if (fromRegistry) {
      setConfig(fromRegistry)
      return
    }

    // Fallback: read directly from the data attribute
    const readFromBridge = (): boolean => {
      const el = document.querySelector('[data-list-views-config]')
      if (!el) return false
      try {
        const all = JSON.parse(el.getAttribute('data-list-views-config') || '{}')
        if (all[slug]) {
          registerListViewConfig(slug, all[slug])
          setConfig(all[slug])
          return true
        }
      } catch {}
      return false
    }

    if (readFromBridge()) return

    // Wait for bridge to appear
    const observer = new MutationObserver(() => {
      // Also re-check registry (ListViewsInitializer may have populated it)
      const r = getListViewConfig(slug)
      if (r) { setConfig(r); observer.disconnect(); return }
      if (readFromBridge()) observer.disconnect()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    const timeout = setTimeout(() => observer.disconnect(), 5000)

    return () => { observer.disconnect(); clearTimeout(timeout) }
  }, [slug])

  if (!slug || !config) return null

  return (
    <CustomListView
      collection={slug}
      availableViews={config.availableViews}
      defaultView={config.defaultView}
      cardConfig={config.cardConfig}
      kanbanConfig={config.kanbanConfig}
    />
  )
}

// ─── Config registry ────────────────────────────────────────────────────────

interface ListViewConfigEntry {
  availableViews: ViewMode[]
  defaultView: ViewMode
  cardConfig?: {
    imageField?: string
    titleField?: string
    subtitleField?: string
    statusField?: string
  }
  kanbanConfig?: {
    statusField: string
    columns?: string[]
  }
}

/**
 * Global registry for list view configs. Populated by the ListViewsInitializer.
 * Uses window.__aupListViews instead of module-level Map to ensure the same
 * registry is shared across separately bundled files (tsup bundle: false).
 */
function getRegistry(): Map<string, ListViewConfigEntry> {
  if (typeof window === 'undefined') return new Map()
  if (!(window as any).__aupListViews) {
    (window as any).__aupListViews = new Map()
  }
  return (window as any).__aupListViews
}

export function registerListViewConfig(slug: string, config: ListViewConfigEntry): void {
  getRegistry().set(slug, config)
}

function getListViewConfig(slug: string): ListViewConfigEntry | undefined {
  return getRegistry().get(slug)
}

function extractCollectionSlug(): string | null {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/\/admin\/collections\/([^/]+)/)
  return match ? match[1] : null
}
