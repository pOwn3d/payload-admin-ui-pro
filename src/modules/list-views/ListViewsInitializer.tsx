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
 * Uses MutationObserver as fallback if the RSC bridge hasn't rendered yet.
 * Renders nothing visible.
 */
export const ListViewsInitializer: React.FC = () => {
  useEffect(() => {
    const readAndRegister = (): boolean => {
      const el = document.querySelector('[data-list-views-config]')
      if (!el) return false

      try {
        const configStr = el.getAttribute('data-list-views-config')
        if (!configStr) return false

        const configs: ListViewsConfig = JSON.parse(configStr)
        for (const [slug, config] of Object.entries(configs)) {
          registerListViewConfig(slug, config)
        }
        return true
      } catch {
        return false
      }
    }

    // Try immediately
    if (readAndRegister()) return

    // Fallback: observe DOM until the config bridge renders
    const observer = new MutationObserver(() => {
      if (readAndRegister()) {
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    // Safety timeout — stop observing after 10s
    const timeout = setTimeout(() => observer.disconnect(), 10_000)

    return () => {
      observer.disconnect()
      clearTimeout(timeout)
    }
  }, [])

  return null
}
