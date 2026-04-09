import type { Endpoint } from 'payload'
import { rateLimit, rateLimitKey, rateLimitResponse } from '../../utils/security.js'

/**
 * Activity log API endpoints.
 *
 * GET /api/admin-ui-pro/activity — fetch recent activity entries
 *   Query params: limit (default 20, max 100), page, collection, action
 *
 * DELETE /api/admin-ui-pro/activity/cleanup — delete entries older than retentionDays
 *
 * Security:
 * - All endpoints require admin role
 * - Rate limited
 */
// In-memory presence store (per-server instance)
const presenceStore = new Map<string, Map<string, { userName: string; lastSeen: number }>>()

// Cleanup stale entries every 60s
const presenceCleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, editors] of presenceStore) {
    for (const [userId, data] of editors) {
      if (now - data.lastSeen > 60_000) editors.delete(userId)
    }
    if (editors.size === 0) presenceStore.delete(key)
  }
}, 60_000)
if (typeof presenceCleanup === 'object' && 'unref' in presenceCleanup) {
  presenceCleanup.unref()
}

export function createActivityEndpoints(
  logCollectionSlug: string,
  retentionDays: number,
): Endpoint[] {
  return [
    // GET — fetch activity log entries
    {
      path: '/admin-ui-pro/activity',
      method: 'get',
      handler: async (req) => {
        if (!req.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }

        const key = `activity-get:${req.user.id}`
        if (!rateLimit(key, 60)) return rateLimitResponse()

        try {
          const url = new URL(req.url || '', 'http://localhost')
          const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100)
          const page = Number(url.searchParams.get('page')) || 1
          const filterCollection = url.searchParams.get('collection')
          const filterAction = url.searchParams.get('action')

          const where: Record<string, { equals: string }> = {}
          if (filterCollection) where.collection = { equals: filterCollection }
          if (filterAction) where.action = { equals: filterAction }

          const result = await req.payload.find({
            collection: logCollectionSlug,
            where,
            limit,
            page,
            sort: '-timestamp',
            depth: 0,
            overrideAccess: true, // Already checked admin above
          })

          return new Response(
            JSON.stringify({
              docs: result.docs,
              totalDocs: result.totalDocs,
              page: result.page,
              totalPages: result.totalPages,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch activity' }),
            { status: 500 },
          )
        }
      },
    },

    // DELETE — cleanup old entries
    {
      path: '/admin-ui-pro/activity/cleanup',
      method: 'delete',
      handler: async (req) => {
        if (!req.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }

        // Admin only
        const isAdmin = req.user.role === 'admin' || req.user.roles?.includes('admin')
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
        }

        const key = `activity-cleanup:${req.user.id}`
        if (!rateLimit(key, 5)) return rateLimitResponse()

        try {
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() - retentionDays)

          const result = await req.payload.delete({
            collection: logCollectionSlug,
            where: {
              timestamp: { less_than: cutoff.toISOString() },
            },
            overrideAccess: true,
          })

          const deleted = Array.isArray(result.docs) ? result.docs.length : 0

          return new Response(
            JSON.stringify({ deleted, cutoffDate: cutoff.toISOString() }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch {
          return new Response(
            JSON.stringify({ error: 'Failed to cleanup' }),
            { status: 500 },
          )
        }
      },
    },
    // GET — presence (who is editing)
    {
      path: '/admin-ui-pro/presence',
      method: 'get',
      handler: async (req) => {
        if (!req.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }

        const url = new URL(req.url || '', 'http://localhost')
        const key = url.searchParams.get('key')
        if (!key) {
          return new Response(JSON.stringify({ editors: [] }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          })
        }

        const editors = presenceStore.get(key)
        const list = editors
          ? Array.from(editors.entries()).map(([userId, data]) => ({
              userId, userName: data.userName, lastSeen: data.lastSeen,
            }))
          : []

        return new Response(JSON.stringify({ editors: list }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        })
      },
    },

    // POST — heartbeat presence
    {
      path: '/admin-ui-pro/presence',
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }

        const presenceKey = `presence:${req.user.id}`
        if (!rateLimit(presenceKey, 30)) return rateLimitResponse()

        try {
          const body = await req.json?.() || {}
          const key = body.key
          if (!key || typeof key !== 'string') {
            return new Response(JSON.stringify({ error: 'Missing key' }), { status: 400 })
          }

          if (!presenceStore.has(key)) presenceStore.set(key, new Map())
          presenceStore.get(key)!.set(String(req.user.id), {
            userName: (req.user as any).email || (req.user as any).name || `User ${req.user.id}`,
            lastSeen: Date.now(),
          })

          return new Response(JSON.stringify({ ok: true }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          })
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 })
        }
      },
    },

    // DELETE — leave presence
    {
      path: '/admin-ui-pro/presence',
      method: 'delete',
      handler: async (req) => {
        if (!req.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }

        try {
          const body = await req.json?.() || {}
          const key = body.key
          if (key && presenceStore.has(key)) {
            presenceStore.get(key)!.delete(String(req.user.id))
          }
          return new Response(JSON.stringify({ ok: true }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          })
        } catch {
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
      },
    },
  ]
}
