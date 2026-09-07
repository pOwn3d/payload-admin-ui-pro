import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolvePermissions, resolvePermissionsAsync, hasPermission } from '../utils/rbac.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('resolvePermissions', () => {
  it('gives an anonymous caller the lowest preset', () => {
    const p = resolvePermissions(null)
    expect(p.settings).toBe(false)
    expect(p.listViews).toBe(false)
  })

  it('maps known roles to their preset', () => {
    expect(resolvePermissions({ role: 'admin' }).settings).toBe(true)
    expect(resolvePermissions({ role: 'editor' }).settings).toBe(false)
    expect(resolvePermissions({ role: 'editor' }).dashboard).toBe('view')
    expect(resolvePermissions({ role: 'viewer' }).listViews).toBe(false)
  })

  it('picks the highest-privilege entry of a `roles` array, not the first', () => {
    expect(resolvePermissions({ roles: ['editor', 'admin'] }).settings).toBe(true)
    expect(resolvePermissions({ roles: ['editor'] }).settings).toBe(false)
  })

  it('normalises role casing and { value } shaped entries', () => {
    expect(resolvePermissions({ role: 'ADMIN' }).settings).toBe(true)
    expect(resolvePermissions({ roles: [{ value: 'Editor' }] }).dashboard).toBe('view')
  })

  it('falls back to the admin preset for an authenticated user with no known role', () => {
    // Documented, deliberate: setups without RBAC must keep working. The test
    // pins it so the fallback cannot drift silently.
    expect(resolvePermissions({ id: '1' }).settings).toBe(true)
    expect(resolvePermissions({ id: '1', role: 'unheard-of' }).settings).toBe(true)
  })

  it('honours a per-user override stored on the document', () => {
    const p = resolvePermissions({ role: 'admin', aupPermissions: { settings: false } })
    expect(p.settings).toBe(false)
    expect(p.dashboard).toBe('edit')
  })

  it('calls the custom resolver with the user itself, not a { user } wrapper', () => {
    const cb = vi.fn().mockReturnValue({ settings: false })
    const user = { id: '1', role: 'admin' }
    resolvePermissions(user, { access: { permissions: cb } })
    expect(cb).toHaveBeenCalledWith(user)
  })

  it('warns instead of failing open in silence when the resolver throws', () => {
    // The fallback is the ADMIN preset, so a broken resolver grants MORE than
    // intended. Swallowing the error made that undetectable.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const p = resolvePermissions(
      { id: '1' },
      { access: { permissions: (({ user }: any) => ({ settings: user.role })) as any } },
    )
    expect(p.settings).toBe(true)
    expect(warn).toHaveBeenCalledOnce()
    expect(String(warn.mock.calls[0]![0])).toContain('[admin-ui-pro]')
  })

  it('ignores a promise returned by the sync resolver', () => {
    const p = resolvePermissions(
      { id: '1', role: 'editor' },
      { access: { permissions: (async () => ({ settings: true })) as any } },
    )
    expect(p.settings).toBe(false)
  })
})

describe('resolvePermissionsAsync', () => {
  it('awaits an async resolver', async () => {
    const p = await resolvePermissionsAsync(
      { id: '1' },
      { access: { permissions: async () => ({ settings: false }) } },
    )
    expect(p.settings).toBe(false)
  })

  it('warns and falls back when the async resolver rejects', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const p = await resolvePermissionsAsync(
      { id: '1', role: 'editor' },
      { access: { permissions: async () => { throw new Error('boom') } } },
    )
    expect(warn).toHaveBeenCalledOnce()
    expect(p.settings).toBe(false)
  })
})

describe('hasPermission', () => {
  it('treats undefined and false as no access', () => {
    expect(hasPermission({}, 'settings')).toBe(false)
    expect(hasPermission({ settings: false }, 'settings')).toBe(false)
  })

  it('does not let a view-only level pass an edit check', () => {
    expect(hasPermission({ dashboard: 'view' }, 'dashboard', 'edit')).toBe(false)
    expect(hasPermission({ dashboard: 'view' }, 'dashboard', 'view')).toBe(true)
    expect(hasPermission({ dashboard: 'edit' }, 'dashboard', 'edit')).toBe(true)
  })

  it('rejects an unknown module name', () => {
    expect(hasPermission({ settings: true }, 'not-a-module')).toBe(false)
  })
})
