'use client'

import { useEffect } from 'react'
import { invalidateSettingsCache } from '../../utils/settingsCache.js'

/**
 * Client component that reloads the page after the global settings are saved.
 * Intercepts fetch calls to detect when Payload saves the settings global.
 * Only active on the aup-settings page.
 */
export const SettingsReloader: React.FC = () => {
  useEffect(() => {
    // Only run on the settings page
    if (!window.location.pathname.includes('aup-settings')) return

    const originalFetch = window.fetch
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args)

      try {
        // Extract URL and method from various fetch argument formats
        let url = ''
        let method = 'GET'

        if (typeof args[0] === 'string') {
          url = args[0]
        } else if (args[0] instanceof Request) {
          url = args[0].url
          method = args[0].method
        } else if (args[0] && typeof args[0] === 'object' && 'url' in args[0]) {
          url = (args[0] as { url: string }).url
        }

        if (args[1]?.method) {
          method = args[1].method
        }

        method = method.toUpperCase()

        // Detect save: Payload uses POST or PATCH for globals
        if (
          url.includes('aup-settings') &&
          (method === 'PATCH' || method === 'POST') &&
          response.ok
        ) {
          invalidateSettingsCache()
          // Short delay to let the toast appear, then reload
          setTimeout(() => {
            window.location.reload()
          }, 800)
        }
      } catch {
        // Never break the fetch chain
      }

      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}
