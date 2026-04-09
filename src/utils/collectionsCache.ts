/**
 * Client-side cache for the /api/admin-ui-pro/collections endpoint.
 * Shared across all widgets and the command palette to avoid redundant fetches.
 * Module-level (no React Context) — Turbopack safe.
 */

interface CollectionInfo {
  slug: string
  label: string
  hasUpload: boolean
}

interface GlobalInfo {
  slug: string
  label: string
}

interface CollectionsData {
  collections: CollectionInfo[]
  globals: GlobalInfo[]
}

let _cached: CollectionsData | null = null
let _promise: Promise<CollectionsData | null> | null = null
let _timestamp = 0
const CACHE_TTL = 120_000 // 2 minutes

/**
 * Fetch collections and globals list. Deduplicates concurrent calls.
 */
export async function fetchCollections(): Promise<CollectionsData | null> {
  const now = Date.now()

  if (_cached && now - _timestamp < CACHE_TTL) {
    return _cached
  }

  if (_promise) return _promise

  _promise = fetch('/api/admin-ui-pro/collections', { credentials: 'include' })
    .then((res) => {
      if (!res.ok) return null
      return res.json() as Promise<CollectionsData>
    })
    .then((data) => {
      _cached = data
      _timestamp = Date.now()
      _promise = null
      return data
    })
    .catch(() => {
      _promise = null
      return null
    })

  return _promise
}

export function invalidateCollectionsCache(): void {
  _cached = null
  _promise = null
  _timestamp = 0
}
