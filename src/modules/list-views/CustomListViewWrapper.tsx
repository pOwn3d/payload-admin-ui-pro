'use client'

import React from 'react'
import { CustomListView } from './CustomListView.js'
import type { ViewMode } from './types.js'

/**
 * Wrapper injected via beforeListTable.
 * Reads the collection config from a data-attribute stamped by the RSC layer,
 * or falls back to reading from the DOM (Payload renders the collection slug
 * in the URL path).
 *
 * The actual view config is passed via admin.custom.listViews at plugin init time.
 * Since beforeListTable components receive limited props in Payload 3, we read
 * the config from a global registry populated at plugin init.
 */
export const CustomListViewWrapper: React.FC = () => {
  // Extract collection slug from URL: /admin/collections/{slug}
  const slug = extractCollectionSlug()
  if (!slug) return null

  // Read config from window registry (populated by the plugin's init)
  const config = getListViewConfig(slug)
  if (!config) return null

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
 * Global registry for list view configs. Populated by the ConfigInjector component.
 * Module-level (no React Context) to avoid Turbopack createContext issues.
 */
const _registry = new Map<string, ListViewConfigEntry>()

export function registerListViewConfig(slug: string, config: ListViewConfigEntry): void {
  _registry.set(slug, config)
}

function getListViewConfig(slug: string): ListViewConfigEntry | undefined {
  return _registry.get(slug)
}

function extractCollectionSlug(): string | null {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/\/admin\/collections\/([^/]+)/)
  return match ? match[1] : null
}
