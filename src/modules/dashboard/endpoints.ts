import type { Endpoint } from 'payload'
import { VALIDATION_LIMITS } from '../../types.js'
import { rateLimit, rateLimitResponse, userRateLimitKey } from '../../utils/security.js'
import { isAdminCollectionUser } from '../../utils/userCollection.js'
import type { DashboardLayout, WidgetInstance } from './types.js'

/**
 * Create dashboard preferences API endpoints.
 *
 * GET  /api/admin-ui-pro/dashboard   — fetch current user's layout
 * PATCH /api/admin-ui-pro/dashboard  — save layout
 * DELETE /api/admin-ui-pro/dashboard — reset to default
 *
 * Security:
 * - All endpoints require a session on the ADMIN user collection. Every one of
 *   them used to check `!!req.user`, which a front-office account satisfies —
 *   and since ids are per-collection sequences on SQLite and Postgres,
 *   `customers#3` and `users#3` collide, so `where: { user: { equals: id } }`
 *   handed a customer the administrator's row to read, overwrite and delete.
 * - Reads and writes forward `req` with `overrideAccess: false`, so the
 *   collection's own access rules are the source of truth rather than a raw id
 *   comparison run under the elevated Local API default.
 * - User ID extracted from JWT (req.user.id), never from URL params
 * - Rate limited per user
 * - Layout payload strictly validated (max widgets, valid sizes, no injection)
 */

function forbidden() {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function createDashboardEndpoints(
  collectionSlug: string = 'dashboard-preferences',
): Endpoint[] {
  return [
    // GET — discover collections available in the Payload config
    {
      path: '/admin-ui-pro/collections',
      method: 'get' as const,
      handler: async (req: any) => {
        if (!req.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }
        if (!isAdminCollectionUser(req as never)) return forbidden()

        const key = userRateLimitKey('collections', req.user)
        if (!rateLimit(key, 300)) return rateLimitResponse()

        try {
          // Filter out internal/technical collections
          const SKIP_SLUGS = new Set([
            collectionSlug, 'payload-preferences', 'payload-migrations',
            'payload-locked-documents', 'payload-jobs',
            'redirects', 'forms', 'form-submissions', 'search',
            'search-results', 'activity-log',
          ])
          // Patterns for plugin-internal collections
          const SKIP_PREFIXES = ['seo-', 'spellcheck-',
            'admin-nav-', 'maintenance-', 'audit-log',
            'canned-', 'email-log', 'auth-log', 'ticket',
            'support-', 'webhook-', 'satisfaction-', 'sla-',
            'knowledge-', 'macro', 'pending-email', 'chat-',
          ]

          const collections = req.payload.config.collections
            .filter((col: any) => {
              if (col.admin?.hidden) return false
              if (SKIP_SLUGS.has(col.slug)) return false
              if (SKIP_PREFIXES.some((p: string) => col.slug.startsWith(p))) return false
              return true
            })
            .map((col: any) => ({
              slug: col.slug,
              label: typeof col.labels?.plural === 'string'
                ? col.labels.plural
                : col.slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
              hasUpload: !!col.upload,
            }))

          // Globals used to be returned WHOLE while collections were filtered —
          // the filter is cosmetic, but the schema dump it produced is the
          // opening move of an IDOR sweep on the generated REST routes.
          const globals = req.payload.config.globals
            .filter((g: any) => {
              if (g.admin?.hidden) return false
              if (SKIP_SLUGS.has(g.slug)) return false
              return !SKIP_PREFIXES.some((p: string) => g.slug.startsWith(p))
            })
            .map((g: any) => ({
              slug: g.slug,
              label: typeof g.label === 'string' ? g.label : g.slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            }))

          return new Response(
            JSON.stringify({ collections, globals }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch {
          return new Response(
            JSON.stringify({ error: 'Failed to discover collections' }),
            { status: 500 },
          )
        }
      },
    },

    // GET — fetch user's dashboard layout
    {
      path: '/admin-ui-pro/dashboard',
      method: 'get',
      handler: async (req) => {
        if (!req.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }
        if (!isAdminCollectionUser(req as never)) return forbidden()

        const key = userRateLimitKey('dash-get', req.user)
        if (!rateLimit(key, 60)) return rateLimitResponse()

        try {
          const result = await req.payload.find({
            collection: collectionSlug,
            where: { user: { equals: req.user.id } },
            limit: 1,
            depth: 0,
            // Without `req`, the Local API runs at overrideAccess: true and the
            // collection's access rules never execute — the only filter left
            // being an id comparison blind to the caller's collection.
            req,
            overrideAccess: false,
          })

          const prefs = result.docs[0]
          return new Response(
            JSON.stringify({
              layout: prefs?.layout ?? null,
              version: prefs?.version ?? 1,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch preferences' }),
            { status: 500 },
          )
        }
      },
    },

    // PATCH — save user's dashboard layout
    {
      path: '/admin-ui-pro/dashboard',
      method: 'patch',
      handler: async (req) => {
        if (!req.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }
        if (!isAdminCollectionUser(req as never)) return forbidden()

        const key = userRateLimitKey('dash-patch', req.user)
        if (!rateLimit(key, 30)) return rateLimitResponse()

        let body: unknown
        try {
          // Read the body — try multiple approaches for Payload 3.x compat
          if (typeof req.json === 'function') {
            body = await req.json()
          } else if (typeof req.text === 'function') {
            const text = await req.text()
            body = JSON.parse(text)
          } else if ((req as any).body && typeof (req as any).body === 'object') {
            body = (req as any).body
          } else {
            body = {}
          }
        } catch {
          return new Response(
            JSON.stringify({ error: 'Invalid JSON body' }),
            { status: 400 },
          )
        }

        // Validate layout
        const validation = validateLayout(body)
        if (validation !== true) {
          return new Response(
            JSON.stringify({ error: validation }),
            { status: 400 },
          )
        }

        const layout = (body as { layout: DashboardLayout }).layout

        try {
          // Upsert: find existing, then update or create
          const existing = await req.payload.find({
            collection: collectionSlug,
            where: { user: { equals: req.user.id } },
            limit: 1,
            depth: 0,
            req,
            overrideAccess: false,
          })

          if (existing.docs[0]) {
            await req.payload.update({
              collection: collectionSlug,
              id: existing.docs[0].id,
              data: { layout, version: layout.version ?? 1 },
              req,
              overrideAccess: false,
            })
          } else {
            await req.payload.create({
              collection: collectionSlug,
              data: {
                user: req.user.id,
                layout,
                version: layout.version ?? 1,
              },
              req,
              overrideAccess: false,
            })
          }

          return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch {
          return new Response(
            JSON.stringify({ error: 'Failed to save preferences' }),
            { status: 500 },
          )
        }
      },
    },

    // GET — full-text search across collections
    {
      path: '/admin-ui-pro/search',
      method: 'get' as const,
      handler: async (req: any) => {
        if (!req.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }
        if (!isAdminCollectionUser(req as never)) return forbidden()

        const key = userRateLimitKey('search', req.user)
        if (!rateLimit(key, 30)) return rateLimitResponse()

        const url = new URL(req.url, 'http://localhost')
        const q = url.searchParams.get('q')?.trim() || ''
        const collectionFilter = url.searchParams.get('collection')?.trim() || ''

        if (q.length < 2) {
          return new Response(
            JSON.stringify({ error: 'Query must be at least 2 characters' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        }

        // Sanitize query — strip anything that could be problematic
        const sanitizedQ = q.slice(0, 100).replace(/[<>"']/g, '')

        try {
          // Filter out internal/technical collections (same logic as /collections)
          const SKIP_SLUGS = new Set([
            collectionSlug, 'payload-preferences', 'payload-migrations',
            'payload-locked-documents', 'payload-jobs',
            'redirects', 'forms', 'form-submissions', 'search',
            'search-results', 'activity-log',
          ])
          const SKIP_PREFIXES = ['seo-', 'spellcheck-',
            'admin-nav-', 'maintenance-', 'audit-log',
            'canned-', 'email-log', 'auth-log', 'ticket',
            'support-', 'webhook-', 'satisfaction-', 'sla-',
            'knowledge-', 'macro', 'pending-email', 'chat-',
          ]

          let searchableCollections = req.payload.config.collections
            .filter((col: any) => {
              if (col.admin?.hidden) return false
              if (SKIP_SLUGS.has(col.slug)) return false
              if (SKIP_PREFIXES.some((p: string) => col.slug.startsWith(p))) return false
              return true
            })
            .map((col: any) => col.slug) as string[]

          // If a specific collection is requested, filter to just that one
          if (collectionFilter && searchableCollections.includes(collectionFilter)) {
            searchableCollections = [collectionFilter]
          }

          // Limit to first 5 collections to avoid overloading
          searchableCollections = searchableCollections.slice(0, 5)

          const MAX_PER_COLLECTION = 5
          const MAX_TOTAL = 15
          const results: Array<{ id: string; title: string; collection: string; href: string }> = []

          for (const slug of searchableCollections) {
            if (results.length >= MAX_TOTAL) break

            try {
              const res = await req.payload.find({
                collection: slug,
                where: {
                  or: [
                    { title: { like: sanitizedQ } },
                    { name: { like: sanitizedQ } },
                  ],
                },
                limit: MAX_PER_COLLECTION,
                depth: 0,
                // The Local API defaults to overrideAccess: true, so this search
                // used to run fully elevated and could surface documents the
                // caller is not allowed to read. Forward the caller instead.
                req,
                overrideAccess: false,
              })

              for (const doc of res.docs || []) {
                if (results.length >= MAX_TOTAL) break
                const title = doc.title || doc.name || doc.filename || doc.email || `#${doc.id}`
                results.push({
                  id: String(doc.id),
                  title: String(title),
                  collection: slug,
                  href: `/admin/collections/${slug}/${doc.id}`,
                })
              }
            } catch {
              // Skip collections where the query fields don't exist
              continue
            }
          }

          return new Response(
            JSON.stringify({ results }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch {
          return new Response(
            JSON.stringify({ error: 'Search failed' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },

    // DELETE — reset user's dashboard to default
    {
      path: '/admin-ui-pro/dashboard',
      method: 'delete',
      handler: async (req) => {
        if (!req.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }
        if (!isAdminCollectionUser(req as never)) return forbidden()

        const key = userRateLimitKey('dash-del', req.user)
        if (!rateLimit(key, 10)) return rateLimitResponse()

        try {
          const existing = await req.payload.find({
            collection: collectionSlug,
            where: { user: { equals: req.user.id } },
            limit: 1,
            depth: 0,
            req,
            overrideAccess: false,
          })

          if (existing.docs[0]) {
            await req.payload.delete({
              collection: collectionSlug,
              id: existing.docs[0].id,
              req,
              overrideAccess: false,
            })
          }

          return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        } catch {
          return new Response(
            JSON.stringify({ error: 'Failed to reset preferences' }),
            { status: 500 },
          )
        }
      },
    },
  ]
}

/**
 * Validate a dashboard layout payload.
 * Returns true if valid, or an error message string.
 *
 * Security checks:
 * - Max payload size
 * - Max number of widgets
 * - Valid grid positions and sizes
 * - String lengths
 * - No prototype pollution keys
 */
function validateLayout(body: unknown): true | string {
  if (!body || typeof body !== 'object') return 'Body must be an object'
  if (Array.isArray(body)) return 'Body must be an object, not an array'

  // Block prototype pollution (only check own properties)
  if (Object.prototype.hasOwnProperty.call(body, '__proto__') || Object.prototype.hasOwnProperty.call(body, 'prototype')) {
    return 'Invalid payload'
  }

  const { layout } = body as { layout?: unknown }
  if (!layout || typeof layout !== 'object') return 'Missing layout object'

  const { widgets, version } = layout as { widgets?: unknown; version?: unknown }

  if (!Array.isArray(widgets)) return 'layout.widgets must be an array'
  if (widgets.length > VALIDATION_LIMITS.maxWidgets) {
    return `Too many widgets (max ${VALIDATION_LIMITS.maxWidgets})`
  }

  if (version !== undefined && (typeof version !== 'number' || version < 0)) {
    return 'layout.version must be a positive number'
  }

  // Validate each widget instance
  for (let i = 0; i < widgets.length; i++) {
    const w = widgets[i] as Partial<WidgetInstance>
    if (!w || typeof w !== 'object') return `Widget ${i}: must be an object`

    if (typeof w.id !== 'string' || w.id.length === 0 || w.id.length > 100) {
      return `Widget ${i}: invalid id`
    }
    if (typeof w.widget !== 'string' || w.widget.length === 0 || w.widget.length > 100) {
      return `Widget ${i}: invalid widget slug`
    }
    if (typeof w.x !== 'number' || w.x < 0 || w.x > 11) {
      return `Widget ${i}: x must be 0-11`
    }
    if (typeof w.y !== 'number' || w.y < 0 || w.y > 100) {
      return `Widget ${i}: y must be 0-100`
    }
    if (typeof w.w !== 'number' || w.w < 1 || w.w > 12) {
      return `Widget ${i}: w must be 1-12`
    }
    if (typeof w.h !== 'number' || w.h < 1 || w.h > 6) {
      return `Widget ${i}: h must be 1-6`
    }

    // Ensure widget slug is safe (alphanumeric + hyphens only)
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(w.widget)) {
      return `Widget ${i}: widget slug must be lowercase alphanumeric with hyphens`
    }
  }

  return true
}
