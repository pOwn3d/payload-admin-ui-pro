import { describe, it, expect } from 'vitest'
import { canAccessActivityLog, createActivityLogCollection } from '../modules/activity/collection.js'
import { resolveUserCollectionSlug } from '../utils/userCollection.js'

/** Minimal PayloadRequest stand-in — only what the access rule reads. */
function req(user: unknown, adminUserSlug: string | null = 'users') {
  return {
    req: {
      user,
      payload: { config: { admin: adminUserSlug ? { user: adminUserSlug } : {} } },
    },
  } as never
}

describe('canAccessActivityLog', () => {
  it('denies anonymous callers', () => {
    expect(canAccessActivityLog(req(null))).toBe(false)
  })

  it('denies a user coming from another auth collection', () => {
    // Regression: a front-office customer used to fall through to the
    // role-less branch and read the whole audit trail.
    expect(
      canAccessActivityLog(req({ id: '1', collection: 'customers' })),
    ).toBe(false)
    expect(
      canAccessActivityLog(req({ id: '1', collection: 'customers', role: 'admin' })),
    ).toBe(false)
  })

  it('honours a single `role` field', () => {
    expect(canAccessActivityLog(req({ id: '1', collection: 'users', role: 'admin' }))).toBe(true)
    expect(canAccessActivityLog(req({ id: '1', collection: 'users', role: 'editor' }))).toBe(false)
  })

  it('honours a `roles` array', () => {
    expect(
      canAccessActivityLog(req({ id: '1', collection: 'users', roles: ['editor', 'admin'] })),
    ).toBe(true)
    expect(
      canAccessActivityLog(req({ id: '1', collection: 'users', roles: ['editor'] })),
    ).toBe(false)
  })

  it('recognises every role the plugin treats as admin, whatever the casing', () => {
    // Regression: a strict `role === 'admin'` handed ADMIN_PERMISSIONS to these
    // accounts everywhere in the plugin but 403'd them on the audit trail —
    // empty notification bell, feed, timeline and analytics.
    const ok = [
      { role: 'superadmin' },
      { role: 'Admin' },
      { role: '  ADMIN  ' },
      { roles: [{ value: 'SuperAdmin' }] },
      { roles: ['editor', { value: 'admin' }] },
    ]
    for (const shape of ok) {
      expect(canAccessActivityLog(req({ id: '1', collection: 'users', ...shape }))).toBe(true)
    }

    const denied = [
      { role: 'author' },
      { roles: [{ value: 'viewer' }] },
      { roles: [] },
    ]
    for (const shape of denied) {
      expect(canAccessActivityLog(req({ id: '1', collection: 'users', ...shape }))).toBe(false)
    }
  })

  it('does not let an empty `role` string shadow a populated `roles` array', () => {
    expect(
      canAccessActivityLog(req({ id: '1', collection: 'users', role: '', roles: ['admin'] })),
    ).toBe(true)
  })

  it('denies — without crashing — on a malformed `roles` value', () => {
    // `roles.includes(...)` throws on anything that is not an array. A `roles`
    // field that is present but unreadable means the host declares roles and
    // this account holds none we recognise, so it must not fail open.
    expect(
      canAccessActivityLog(req({ id: '1', collection: 'users', roles: { admin: true } as never })),
    ).toBe(false)
  })

  it('stays permissive for hosts that declare no role field at all', () => {
    // Deliberate: closing this branch would lock the audit trail out of every
    // setup without RBAC.
    expect(canAccessActivityLog(req({ id: '1', collection: 'users' }))).toBe(true)
  })

  it('does not crash when the host config exposes no admin.user', () => {
    expect(canAccessActivityLog(req({ id: '1', collection: 'whatever' }, null))).toBe(true)
  })
})

describe('createActivityLogCollection', () => {
  it('points the user relation at the resolved auth collection', () => {
    const col = createActivityLogCollection('activity-log', 'admins')
    const userField = col.fields.find((f) => 'name' in f && f.name === 'user') as {
      relationTo: string
    }
    expect(userField.relationTo).toBe('admins')
  })

  it('defaults to `users` when nothing is passed', () => {
    const col = createActivityLogCollection()
    const userField = col.fields.find((f) => 'name' in f && f.name === 'user') as {
      relationTo: string
    }
    expect(userField.relationTo).toBe('users')
  })

  it('keeps the log immutable and non-creatable through the API', () => {
    const col = createActivityLogCollection()
    expect((col.access!.create as () => boolean)()).toBe(false)
    expect((col.access!.update as () => boolean)()).toBe(false)
  })
})

describe('resolveUserCollectionSlug', () => {
  it('prefers the explicit override', () => {
    expect(
      resolveUserCollectionSlug({ admin: { user: 'users' }, collections: [] }, 'staff'),
    ).toBe('staff')
  })

  it('falls back to config.admin.user', () => {
    expect(resolveUserCollectionSlug({ admin: { user: 'admins' }, collections: [] })).toBe('admins')
  })

  it('detects the first auth collection when admin.user is absent', () => {
    expect(
      resolveUserCollectionSlug({
        collections: [
          { slug: 'pages', fields: [] },
          { slug: 'members', auth: true, fields: [] },
        ],
      }),
    ).toBe('members')
  })

  it('never picks a non-auth `users` collection over the real auth one', () => {
    // The silent variant of the bug: relationTo pointed at a `users` collection
    // that is not the one issuing sessions.
    expect(
      resolveUserCollectionSlug({
        collections: [
          { slug: 'users', fields: [] },
          { slug: 'admins', auth: true, fields: [] },
        ],
      }),
    ).toBe('admins')
  })

  it('falls back to `users` when nothing else is known', () => {
    expect(resolveUserCollectionSlug({ collections: [] })).toBe('users')
  })
})
