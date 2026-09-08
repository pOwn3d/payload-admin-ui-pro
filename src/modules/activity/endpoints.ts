import type { Endpoint } from 'payload'
import { rateLimit, rateLimitResponse, userRateLimitKey } from '../../utils/security.js'
import { isAdminRole } from '../../utils/rbac.js'
import { isAdminCollectionUser } from '../../utils/userCollection.js'
import { canAccessActivityLog } from './collection.js'

/**
 * Activity log API endpoints.
 *
 * GET /api/admin-ui-pro/activity — fetch recent activity entries
 *   Query params: limit (default 20, max 100), page, collection, action
 *
 * DELETE /api/admin-ui-pro/activity/cleanup — delete entries older than retentionDays
 *
 * Security:
 * - Every endpoint requires an authenticated session (`req.user`)
 * - Reads on the audit trail run with `overrideAccess: false`, so the
 *   collection's own `access.read` (admin-only, scoped to the admin user
 *   collection) is the single source of truth. This handler used to read with
 *   `overrideAccess: true` behind a comment claiming admin had been checked
 *   above — it never was, and any authenticated account could page the log.
 * - The cleanup endpoint additionally requires an explicit administrator role,
 *   resolved through the shared `isAdminRole` normalisation (case-insensitive,
 *   `superadmin` included, `roles: [{ value }]` handled) so it cannot diverge
 *   from the collection's own access rule
 * - Rate limited, and the limiter runs AFTER the access decision, never before:
 *   a caller who gets nothing back must not be able to spend the bucket of a
 *   caller who does. The keys carry the caller's collection for the same
 *   reason — `users#3` and `customers#3` are the same `3` on SQLite and
 *   Postgres, so an id-only key is a bucket shared by two identities.
 * - The presence endpoints are admin-only too. They used to check `!!req.user`
 *   alone while the key is fully predictable (`presence:<collection>:<docId>`),
 *   so a front-office account could walk the whole key space and read back
 *   `userName` — which is the administrator's e-mail address — plus who was
 *   editing what, live. The POST let the same account register ITSELF as an
 *   editor on any document, displaying its e-mail in the admin's "X is editing"
 *   banner.
 */

/**
 * `presence:<collection>:<docId>` — the shape PresenceIndicator builds from the
 * admin URL.
 *
 * The collection segment is case-INsensitive on purpose. Payload does not force
 * lowercase slugs, and `PresenceIndicator` copies the segment straight out of
 * `/admin/collections/<slug>/<id>`: a lowercase-only pattern silently killed
 * presence on any host declaring `slug: 'myCollection'` — the heartbeat POST
 * answering 400 every 10 s and the GET returning `{ editors: [] }` for ever,
 * with nothing in the UI to say why. The key is only a Map index, so widening
 * the charset costs no security; the length caps and the anchors are what keep
 * the store bounded.
 */
const PRESENCE_KEY_RE = /^presence:[A-Za-z0-9][A-Za-z0-9_.-]{0,63}:[A-Za-z0-9_.-]{1,64}$/

function forbidden() {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}

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

        // Judge the caller BEFORE spending a token. The 403 used to come from
        // the collection's own `access.read`, several lines below, once the
        // counter had already been incremented: a front-office account looping
        // on this route never read a single entry but emptied the bucket of the
        // administrator carrying the same id (ids are per-collection sequences
        // on SQLite and Postgres), who then got 429 on the ONE route feeding
        // the notification bell, the activity feed, the document timeline and
        // the analytics widget — all four failing silently, so the audit
        // surface simply looked empty.
        //
        // The rule applied here is the collection's own read rule, imported
        // rather than re-implemented, so the endpoint cannot drift from the
        // source of truth. It refuses nobody the `find` below would have
        // served: the response for a denied caller is the same 403, only
        // cheaper and without touching the counter.
        if (!canAccessActivityLog({ req })) return forbidden()

        const key = userRateLimitKey('activity-get', req.user)
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
            // Forward the caller so the collection's access.read actually runs.
            req,
            overrideAccess: false,
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
        } catch (err) {
          // Payload throws Forbidden (status 403) when the caller fails the
          // collection's read access — surface it as such instead of a 500.
          if ((err as { status?: number } | null)?.status === 403) {
            return new Response(
              JSON.stringify({ error: 'Forbidden' }),
              { status: 403 },
            )
          }
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

        // Admin only — stricter than the collection's read rule on purpose:
        // this handler deletes rows, so a host that declares no role field at
        // all (isAdminRole → null) is denied instead of failing open.
        // The collection check comes first: a role named `admin` on a
        // front-office collection is not this panel's administrator.
        if (!isAdminCollectionUser(req as never) || isAdminRole(req.user) !== true) {
          return forbidden()
        }

        const key = userRateLimitKey('activity-cleanup', req.user)
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
        if (!isAdminCollectionUser(req as never)) return forbidden()

        // The GET carried no rate limit at all while the key space is
        // enumerable — that is what turned it into an e-mail harvester.
        if (!rateLimit(userRateLimitKey('presence-get', req.user), 120)) return rateLimitResponse()

        const url = new URL(req.url || '', 'http://localhost')
        const key = url.searchParams.get('key')
        if (!key || !PRESENCE_KEY_RE.test(key)) {
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

        if (!isAdminCollectionUser(req as never)) return forbidden()

        const presenceKey = userRateLimitKey('presence-post', req.user)
        if (!rateLimit(presenceKey, 30)) return rateLimitResponse()

        try {
          const body = await req.json?.() || {}
          const key = body.key
          if (!key || typeof key !== 'string' || !PRESENCE_KEY_RE.test(key)) {
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
        if (!isAdminCollectionUser(req as never)) return forbidden()

        // The README lists all ten routes as rate limited and this one at
        // 30/min; it was the only handler where no limiter was actually wired.
        // A security table that promises a control it does not implement is
        // worse than an honest blank, so the control is the part that gets
        // fixed. 30/min matches the POST it pairs with — one leave per unmount.
        if (!rateLimit(userRateLimitKey('presence-del', req.user), 30)) return rateLimitResponse()

        try {
          const body = await req.json?.() || {}
          const key = body.key
          if (typeof key === 'string' && PRESENCE_KEY_RE.test(key) && presenceStore.has(key)) {
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
