'use client'

import { useEffect } from 'react'
import { invalidateSettingsCache } from '../../utils/settingsCache.js'

/**
 * Client component that reloads the page after the global settings are saved.
 * Listens for Payload's save success event by observing the document title
 * or the success toast, then invalidates cache and reloads.
 *
 * Injected only on the admin-ui-pro-settings global page.
 * Actually, we inject it globally and it only acts on the settings page.
 */
export const SettingsReloader: React.FC = () => {
  useEffect(() => {
    // Only run on the settings page
    if (!window.location.pathname.includes('admin-ui-pro-settings')) return

    // Watch for Payload's save action by intercepting fetch
    const originalFetch = window.fetch
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args)

      // Check if this is a PATCH to the settings global
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || ''
      const method = (args[1]?.method || 'GET').toUpperCase()

      if (url.includes('globals/admin-ui-pro-settings') && method === 'PATCH') {
        // Settings were saved — invalidate cache and reload after a short delay
        invalidateSettingsCache()
        setTimeout(() => {
          window.location.reload()
        }, 500)
      }

      return response
    }

    return () => {
      // Restore original fetch on unmount
      window.fetch = originalFetch
    }
  }, [])

  return null
}
