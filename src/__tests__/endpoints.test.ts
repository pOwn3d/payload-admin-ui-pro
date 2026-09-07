import { describe, it, expect, vi } from 'vitest'
import { createActivityEndpoints } from '../modules/activity/endpoints.js'
import { createDashboardEndpoints } from '../modules/dashboard/endpoints.js'

type Handler = (req: unknown) => Promise<Response>

function findHandler(
  endpoints: ReturnType<typeof createActivityEndpoints>,
  path: string,
  method: string,
): Handler {
  const ep = endpoints.find((e) => e.path === path && e.method === method)
  if (!ep) throw new Error(`no endpoint ${method} ${path}`)
  return ep.handler as unknown as Handler
}

/** Unique per test so the in-memory rate limiter never bleeds across cases. */
let seq = 0
function userId() {
  seq += 1
  return `u${seq}-${Date.now()}`
}

describe('GET /admin-ui-pro/activity', () => {
  const endpoints = createActivityEndpoints('activity-log', 90)
  const handler = findHandler(endpoints, '/admin-ui-pro/activity', 'get')

  it('rejects anonymous callers with 401', async () => {
    const res = await handler({ user: null, url: '/api/admin-ui-pro/activity' })
    expect(res.status).toBe(401)
  })

  it('reads through access control instead of overriding it', async () => {
    // Regression: the handler used to pass `overrideAccess: true` behind a
    // comment claiming admin had been checked above. It never was, so any
    // authenticated account could page the whole audit trail.
    const find = vi.fn().mockResolvedValue({ docs: [], totalDocs: 0, page: 1, totalPages: 0 })
    const req = {
      user: { id: userId(), collection: 'users' },
      url: '/api/admin-ui-pro/activity?limit=5',
      payload: { find },
    }

    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(find).toHaveBeenCalledTimes(1)

    const args = find.mock.calls[0]![0]
    expect(args.overrideAccess).toBe(false)
    expect(args.req).toBe(req)
  })

  it('caps the page size at 100', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [], totalDocs: 0, page: 1, totalPages: 0 })
    await handler({
      user: { id: userId(), collection: 'users' },
      url: '/api/admin-ui-pro/activity?limit=5000',
      payload: { find },
    })
    expect(find.mock.calls[0]![0].limit).toBe(100)
  })

  it('turns a Forbidden from access control into a 403, not a 500', async () => {
    const find = vi.fn().mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }))
    const res = await handler({
      user: { id: userId(), collection: 'customers' },
      url: '/api/admin-ui-pro/activity',
      payload: { find },
    })
    expect(res.status).toBe(403)
  })

  it('still answers 500 on an unrelated failure', async () => {
    const find = vi.fn().mockRejectedValue(new Error('db down'))
    const res = await handler({
      user: { id: userId(), collection: 'users' },
      url: '/api/admin-ui-pro/activity',
      payload: { find },
    })
    expect(res.status).toBe(500)
  })
})

describe('DELETE /admin-ui-pro/activity/cleanup', () => {
  const endpoints = createActivityEndpoints('activity-log', 90)
  const handler = findHandler(endpoints, '/admin-ui-pro/activity/cleanup', 'delete')

  it('rejects anonymous callers with 401', async () => {
    const res = await handler({ user: null })
    expect(res.status).toBe(401)
  })

  it('rejects a non-admin with 403', async () => {
    const res = await handler({ user: { id: userId(), collection: 'users', role: 'editor' } })
    expect(res.status).toBe(403)
  })

  it('lets an admin prune old entries', async () => {
    const del = vi.fn().mockResolvedValue({ docs: [{ id: 1 }, { id: 2 }] })
    const res = await handler({
      user: { id: userId(), collection: 'users', role: 'admin' },
      payload: { delete: del },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ deleted: 2 })
  })

  it('accepts the same admin role shapes as the collection rule', async () => {
    for (const shape of [{ role: 'superadmin' }, { role: 'Admin' }, { roles: [{ value: 'ADMIN' }] }]) {
      const del = vi.fn().mockResolvedValue({ docs: [] })
      const res = await handler({
        user: { id: userId(), collection: 'users', ...shape },
        payload: { delete: del },
      })
      expect(res.status).toBe(200)
    }
  })

  it('stays fail-closed when the host declares no role field, unlike the read rule', async () => {
    // Destructive endpoint: no role information means no cleanup.
    const res = await handler({ user: { id: userId(), collection: 'users' } })
    expect(res.status).toBe(403)
  })
})

describe('GET /admin-ui-pro/search', () => {
  const endpoints = createDashboardEndpoints('dashboard-preferences')
  const handler = findHandler(
    endpoints as ReturnType<typeof createActivityEndpoints>,
    '/admin-ui-pro/search',
    'get',
  )

  const payloadConfig = {
    collections: [{ slug: 'posts' }, { slug: 'pages' }],
    globals: [],
  }

  it('rejects anonymous callers with 401', async () => {
    const res = await handler({ user: null, url: 'http://x/api/admin-ui-pro/search?q=hello' })
    expect(res.status).toBe(401)
  })

  it('refuses a query shorter than two characters', async () => {
    const res = await handler({
      user: { id: userId() },
      url: 'http://x/api/admin-ui-pro/search?q=a',
      payload: { config: payloadConfig, find: vi.fn() },
    })
    expect(res.status).toBe(400)
  })

  it('searches on behalf of the caller, not with full privileges', async () => {
    // Regression: the Local API defaults to overrideAccess: true, so this
    // endpoint used to return documents the caller cannot read.
    const find = vi.fn().mockResolvedValue({ docs: [] })
    const req = {
      user: { id: userId() },
      url: 'http://x/api/admin-ui-pro/search?q=hello',
      payload: { config: payloadConfig, find },
    }

    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(find).toHaveBeenCalled()

    for (const call of find.mock.calls) {
      expect(call[0].overrideAccess).toBe(false)
      expect(call[0].req).toBe(req)
    }
  })

  it('skips a collection the caller may not read instead of failing the search', async () => {
    const find = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }))
      .mockResolvedValueOnce({ docs: [{ id: 7, title: 'Visible' }] })

    const res = await handler({
      user: { id: userId() },
      url: 'http://x/api/admin-ui-pro/search?q=hello',
      payload: { config: payloadConfig, find },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toHaveLength(1)
    expect(body.results[0].title).toBe('Visible')
  })
})
