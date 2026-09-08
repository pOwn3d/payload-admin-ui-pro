import { describe, it, expect, vi } from 'vitest'

import { createActivityEndpoints } from '../modules/activity/endpoints.js'
import { createDashboardEndpoints } from '../modules/dashboard/endpoints.js'
import { createDashboardPreferencesCollection } from '../modules/dashboard/collection.js'

/**
 * Fourth pass. Two holes, both of them ORDERING or BINDING mistakes rather than
 * missing guards: one handler counts before it checks, one access rule checks
 * the caller but never the row it is about to hand him.
 *
 * Shared premise, as in every earlier pass: the host runs the admin panel on
 * `users` AND a front-office auth collection (`customers`). Ids are
 * per-collection sequences on SQLite and Postgres, so `customers#7` and
 * `users#7` are the same `7`.
 */

const CONFIG = { admin: { user: 'users' } }

type Handler = (req: unknown) => Promise<Response>

function handlerOf(
  endpoints: ReturnType<typeof createActivityEndpoints>,
  path: string,
  method: string,
): Handler {
  const ep = endpoints.find((e) => e.path === path && e.method === method)
  if (!ep) throw new Error(`no endpoint ${method} ${path}`)
  return ep.handler as unknown as Handler
}

/** Unique per run: the rate limiter store is module-level and outlives a file. */
let seq = 0
const sharedId = () => `fp${(seq += 1)}-${Date.now()}`

// ── AUP4-01 — the audit-trail bucket is spent before the caller is judged ────

describe('GET /admin-ui-pro/activity — rate limit bucket (AUP4-01)', () => {
  const endpoints = createActivityEndpoints('activity-log', 90)
  const get = handlerOf(endpoints, '/admin-ui-pro/activity', 'get')

  it('does not let a front-office account spend the administrator bucket', async () => {
    // The handler used to build `activity-get:<id>` and consume a token BEFORE
    // any collection check — the 403 only arriving later, from the collection's
    // own access.read via `find`. A customer looping on the route therefore
    // emptied the bucket of the administrator carrying the same id, blinding
    // the notification bell, the activity feed, the document timeline and the
    // analytics widget — all four poll this single route.
    const id = sharedId()

    const attackerFind = vi.fn().mockRejectedValue(
      Object.assign(new Error('Forbidden'), { status: 403 }),
    )
    for (let i = 0; i < 60; i++) {
      const res = await get({
        user: { id, collection: 'customers' },
        url: '/api/admin-ui-pro/activity',
        payload: { config: CONFIG, find: attackerFind },
      })
      expect(res.status, `attacker call ${i}`).toBe(403)
    }

    const victimFind = vi
      .fn()
      .mockResolvedValue({ docs: [], totalDocs: 0, page: 1, totalPages: 0 })
    const victim = await get({
      user: { id, collection: 'users', role: 'admin' },
      url: '/api/admin-ui-pro/activity',
      payload: { config: CONFIG, find: victimFind },
    })

    expect(victim.status).toBe(200)
    expect(victimFind).toHaveBeenCalledTimes(1)

    // Never reaches the data layer either: the collection boundary is now
    // decided in the handler, before the counter and before the query.
    expect(attackerFind).not.toHaveBeenCalled()
  })

  it('keeps limiting the administrator himself', async () => {
    // The fix must not turn the limiter off for the caller it is meant to hold.
    const id = sharedId()
    const find = vi
      .fn()
      .mockResolvedValue({ docs: [], totalDocs: 0, page: 1, totalPages: 0 })
    const req = {
      user: { id, collection: 'users', role: 'admin' },
      url: '/api/admin-ui-pro/activity',
      payload: { config: CONFIG, find },
    }

    for (let i = 0; i < 60; i++) {
      expect((await get(req)).status, `call ${i}`).toBe(200)
    }
    expect((await get(req)).status).toBe(429)
  })
})

describe('per-caller rate limit keys carry the collection (AUP4-01)', () => {
  const endpoints = createActivityEndpoints('activity-log', 90)
  const del = handlerOf(endpoints, '/admin-ui-pro/presence', 'delete')

  it('cannot be shared across two auth collections numbering from 1', async () => {
    // `isAdminCollectionUser` stays open when `config.admin.user` is empty —
    // a hand-rolled or not-yet-sanitized config. On such a host BOTH callers
    // pass the collection check, so the only thing standing between them is
    // the shape of the key. Built on the bare id, it is the same bucket.
    const id = sharedId()
    const body = { key: 'presence:posts:1' }

    for (let i = 0; i < 30; i++) {
      const res = await del({
        user: { id, collection: 'customers' },
        payload: {},
        json: async () => body,
      })
      expect(res.status, `attacker call ${i}`).toBe(200)
    }

    const victim = await del({
      user: { id, collection: 'users' },
      payload: {},
      json: async () => body,
    })
    expect(victim.status).toBe(200)
  })
})

// ── AUP4-02 — dashboard-preferences: create never bound the row to its owner ─

describe('dashboard-preferences ownership (AUP4-02)', () => {
  const collection = createDashboardPreferencesCollection('dashboard-preferences', 'users')
  const createRule = collection.access!.create as (args: {
    req: unknown
    data?: unknown
  }) => unknown

  const editor = { id: 2, collection: 'users', role: 'editor' }
  const reqOf = (user: unknown) => ({ user, payload: { config: CONFIG } })

  it('refuses a row created for somebody else', async () => {
    // `create` was the only rule of the four not scoped by ownership: it
    // returned a bare `true`, so Payload wrote whatever `user` the body
    // carried. Any account of the admin collection — `editor`, `author`,
    // `viewer` — could therefore pre-empt the (unique) preferences row of an
    // administrator who had none yet, and fill it with a layout that never
    // went through `validateLayout`.
    expect(
      await createRule({
        req: reqOf(editor),
        data: { user: 99, layout: { widgets: [], version: 1 } },
      }),
    ).toBe(false)

    // Relationship values may arrive as objects — the id is what counts.
    expect(
      await createRule({ req: reqOf(editor), data: { user: { id: 99 } } }),
    ).toBe(false)

    // A row with no owner at all is not a row this collection accepts.
    expect(await createRule({ req: reqOf(editor), data: { layout: {} } })).toBe(false)
  })

  it('still lets everyone create their own row', async () => {
    expect(
      await createRule({
        req: reqOf(editor),
        data: { user: 2, layout: { widgets: [], version: 1 } },
      }),
    ).toBe(true)

    // REST bodies are JSON: a numeric id may arrive as a string.
    expect(await createRule({ req: reqOf(editor), data: { user: '2' } })).toBe(true)
  })

  it('answers the permission probe, which carries no data', async () => {
    // `GET /api/access` resolves every access rule with `data` undefined to
    // build the admin permission matrix. Answering `false` there would tell
    // the panel the user cannot create his own preferences.
    expect(await createRule({ req: reqOf(editor) })).toBe(true)
  })

  it('still refuses the front-office account outright', async () => {
    expect(
      await createRule({
        req: reqOf({ id: 2, collection: 'customers' }),
        data: { user: 2 },
      }),
    ).toBe(false)
  })

  it('ignores an attempt to move an existing row to another owner', async () => {
    // Second path to the same result: PATCH your own row with
    // `{"user": <victim id>}`. The `update` rule is a where-clause evaluated
    // on the EXISTING document, so it never sees the new value. Field-level
    // write access is what refuses the transition — and it refuses the
    // transition only: the field falls back to the stored value, so rows
    // already in the database stay updatable.
    const userField = collection.fields.find(
      (f) => 'name' in f && f.name === 'user',
    ) as { access?: { update?: (args: unknown) => boolean } }

    expect(typeof userField.access?.update).toBe('function')
    expect(
      userField.access!.update!({
        req: { user: editor, payload: { config: CONFIG } },
        data: { user: 99 },
        siblingData: { user: 99 },
      }),
    ).toBe(false)
  })

  it('leaves the plugin s own save path working end to end', async () => {
    // The guarantee that matters: the endpoint that legitimately creates the
    // row must still pass the rule it is now judged by.
    const endpoints = createDashboardEndpoints('dashboard-preferences')
    const ep = endpoints.find(
      (e) => e.path === '/admin-ui-pro/dashboard' && e.method === 'patch',
    )!
    const patch = ep.handler as unknown as Handler

    const user = { id: sharedId(), collection: 'users', role: 'editor' }
    const create = vi.fn(async ({ data, req }: { data: { user?: unknown }; req: unknown }) => {
      if ((await createRule({ req, data })) !== true) {
        throw Object.assign(new Error('Forbidden'), { status: 403 })
      }
      return { id: 1 }
    })

    const res = await patch({
      user,
      payload: {
        config: CONFIG,
        find: vi.fn().mockResolvedValue({ docs: [] }),
        create,
      },
      json: async () => ({
        layout: { widgets: [{ id: 'w1', widget: 'stats', x: 0, y: 0, w: 6, h: 2 }], version: 1 },
      }),
    })

    expect(res.status).toBe(200)
    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0]![0].data.user).toBe(user.id)
  })
})
