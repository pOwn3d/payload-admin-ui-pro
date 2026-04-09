'use client'

import { useEffect } from 'react'
import { registerListViewConfig } from './CustomListViewWrapper.js'
import type { ViewMode } from './types.js'

interface ListViewsConfig {
  [collectionSlug: string]: {
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
}

/**
 * Initializer component injected via afterNavLinks.
 * Populates the list view config registry from a data attribute.
 * Renders nothing visible.
 */
export const ListViewsInitializer: React.FC = () => {
  useEffect(() => {
    // Read config from the data attribute on our hidden div
    const el = document.querySelector('[data-list-views-config]')
    if (!el) return

    try {
      const configStr = el.getAttribute('data-list-views-config')
      if (!configStr) return

      const configs: ListViewsConfig = JSON.parse(configStr)
      for (const [slug, config] of Object.entries(configs)) {
        registerListViewConfig(slug, config)
      }
    } catch {
      // Invalid config — silently fail
    }
  }, [])

  return null
}
