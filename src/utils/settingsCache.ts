import type { AdminUiProSettingsData } from '../types.js'

// Module-level cache — survives SPA navigation, no createContext needed
let _cachedSettings: AdminUiProSettingsData | null = null
let _cachePromise: Promise<AdminUiProSettingsData | null> | null = null
let _cacheTimestamp = 0
const CACHE_TTL = 60_000 // 60 seconds

/**
 * Fetch the AdminUiPro settings global. Uses module-level cache.
 */
export async function fetchSettings(
  globalSlug: string = 'aup-settings',
): Promise<AdminUiProSettingsData | null> {
  const now = Date.now()

  // Return cached if fresh
  if (_cachedSettings && now - _cacheTimestamp < CACHE_TTL) {
    return _cachedSettings
  }

  // Deduplicate concurrent fetches
  if (_cachePromise) return _cachePromise

  _cachePromise = fetch(`/api/globals/${globalSlug}`, {
    credentials: 'include',
  })
    .then((res) => {
      if (!res.ok) return null
      return res.json() as Promise<AdminUiProSettingsData>
    })
    .then((data) => {
      _cachedSettings = data
      _cacheTimestamp = Date.now()
      _cachePromise = null
      return data
    })
    .catch(() => {
      // Cache the failure to prevent immediate retry loops on 401/network errors
      _cachedSettings = null
      _cacheTimestamp = Date.now()
      _cachePromise = null
      return null
    })

  return _cachePromise
}

/**
 * Invalidate the settings cache. Call after saving the global.
 */
export function invalidateSettingsCache(): void {
  _cachedSettings = null
  _cachePromise = null
  _cacheTimestamp = 0
}
