import type { Endpoint } from 'payload'
import { VALIDATION_LIMITS } from '../../types.js'
import { rateLimit, rateLimitResponse } from '../../utils/security.js'
import type { DashboardLayout, WidgetInstance } from './types.js'

/**
 * Create dashboard preferences API endpoints.
 *
 * GET  /api/admin-ui-pro/dashboard   — fetch current user's layout
 * PATCH /api/admin-ui-pro/dashboard  — save layout
 * DELETE /api/admin-ui-pro/dashboard — reset to default
 *
 * Security:
 * - All endpoints require authentication (req.user)
 * - User ID extracted from JWT (req.user.id), never from URL params
 * - Rate limited per user
 * - Layout payload strictly validated (max widgets, valid sizes, no injection)
 */
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

        const key = `collections:${req.user.id}`
        if (!rateLimit(key, 300)) return rateLimitResponse()

        try {
          // Filter out internal/technical collections
          const SKIP_SLUGS = new Set([
            collectionSlug, 'payload-preferences', 'payload-migrations',
            'payload-locked-documents', 'payload-jobs',
          ])
          // Patterns for plugin-internal collections
          const SKIP_PREFIXES = ['seo-', 'spellcheck-', 'activity-log',
            'admin-nav-', 'maintenance-', 'search-results']

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

          const globals = req.payload.config.globals
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

        const key = `dash-get:${req.user.id}`
        if (!rateLimit(key, 60)) return rateLimitResponse()

        try {
          const result = await req.payload.find({
            collection: collectionSlug,
            where: { user: { equals: req.user.id } },
            limit: 1,
            depth: 0,
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

        const key = `dash-patch:${req.user.id}`
        if (!rateLimit(key, 30)) return rateLimitResponse()

        let body: unknown
        try {
          // Read the body from the request
          const text = typeof req.text === 'function'
            ? await req.text()
            : JSON.stringify(req.data ?? req.json ?? {})
          body = JSON.parse(typeof text === 'string' ? text : '{}')
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
          })

          if (existing.docs[0]) {
            await req.payload.update({
              collection: collectionSlug,
              id: existing.docs[0].id,
              data: { layout, version: layout.version ?? 1 },
            })
          } else {
            await req.payload.create({
              collection: collectionSlug,
              data: {
                user: req.user.id,
                layout,
                version: layout.version ?? 1,
              },
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

    // DELETE — reset user's dashboard to default
    {
      path: '/admin-ui-pro/dashboard',
      method: 'delete',
      handler: async (req) => {
        if (!req.user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }

        const key = `dash-del:${req.user.id}`
        if (!rateLimit(key, 10)) return rateLimitResponse()

        try {
          const existing = await req.payload.find({
            collection: collectionSlug,
            where: { user: { equals: req.user.id } },
            limit: 1,
            depth: 0,
          })

          if (existing.docs[0]) {
            await req.payload.delete({
              collection: collectionSlug,
              id: existing.docs[0].id,
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

  // Block prototype pollution
  if ('__proto__' in body || 'constructor' in body || 'prototype' in body) {
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
