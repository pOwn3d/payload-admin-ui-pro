import { describe, it, expect } from 'vitest'
import type { Config } from 'payload'
import type { AdminUiProConfig } from '../types.js'
import { adminUiProPlugin } from '../plugin.js'

/** A Payload Plugin may return a promise; narrow it once here. */
async function apply(pluginConfig: AdminUiProConfig, incoming: Config): Promise<Config> {
  return await adminUiProPlugin(pluginConfig)(incoming)
}

function hostConfig(overrides: Partial<Config> = {}): Config {
  const hostAfterChange = () => undefined
  return {
    admin: { user: 'admins' },
    collections: [
      {
        slug: 'admins',
        auth: true,
        fields: [{ name: 'email', type: 'email' }],
      },
      {
        slug: 'posts',
        hooks: { afterChange: [hostAfterChange] },
        fields: [{ name: 'title', type: 'text' }],
      },
    ],
    globals: [{ slug: 'site', fields: [] }],
    endpoints: [],
  } as unknown as Config
}

/** The host's own hook, kept aside so we can assert it survives. */
function hostHookOf(config: Config) {
  const posts = config.collections!.find((c) => c.slug === 'posts')!
  return (posts.hooks?.afterChange ?? []) as unknown[]
}

describe('adminUiProPlugin', () => {
  it('returns the config untouched when disabled', async () => {
    const incoming = hostConfig()
    expect(await apply({ enabled: false }, incoming)).toBe(incoming)
  })

  it('does not mutate the config object it was handed', async () => {
    const incoming = hostConfig()
    const snapshot = {
      collections: incoming.collections!.length,
      globals: incoming.globals!.length,
      endpoints: (incoming.endpoints ?? []).length,
      adminComponents: incoming.admin?.components,
    }

    await apply({}, incoming)

    expect(incoming.collections!.length).toBe(snapshot.collections)
    expect(incoming.globals!.length).toBe(snapshot.globals)
    expect((incoming.endpoints ?? []).length).toBe(snapshot.endpoints)
    expect(incoming.admin?.components).toBe(snapshot.adminComponents)
  })

  it('keeps the host hooks it wraps', async () => {
    const incoming = hostConfig()
    const hostHook = hostHookOf(incoming)[0]

    const out = await apply({}, incoming)
    const posts = out.collections!.find((c) => c.slug === 'posts')!
    const afterChange = posts.hooks!.afterChange as unknown[]

    expect(afterChange[0]).toBe(hostHook)
    expect(afterChange.length).toBeGreaterThan(1)
  })

  it('registers the settings global', async () => {
    const out = await apply({}, hostConfig())
    expect(out.globals!.some((g) => g.slug === 'aup-settings')).toBe(true)
  })

  it('resolves the auth collection instead of assuming `users`', async () => {
    // Regression: `relationTo: 'users'` made config sanitization throw
    // InvalidFieldRelationship on any host whose auth collection is named
    // differently — the app simply stopped booting.
    const out = await apply({}, hostConfig())

    for (const slug of ['activity-log', 'dashboard-preferences']) {
      const col = out.collections!.find((c) => c.slug === slug)!
      const userField = col.fields.find((f) => 'name' in f && f.name === 'user') as {
        relationTo: string
      }
      expect(userField.relationTo, slug).toBe('admins')
    }
  })

  it('honours an explicit userCollectionSlug override', async () => {
    const out = await apply({ userCollectionSlug: 'staff' }, hostConfig())
    const col = out.collections!.find((c) => c.slug === 'activity-log')!
    const userField = col.fields.find((f) => 'name' in f && f.name === 'user') as {
      relationTo: string
    }
    expect(userField.relationTo).toBe('staff')
  })

  it('injects the document components into a slot Payload actually reads', async () => {
    // Regression: they used to target `admin.components.afterDocument`, a key
    // that does not exist. renderDocumentSlots reads each slot by name with no
    // passthrough, so the three features never rendered at all.
    const out = await apply({}, hostConfig())
    const posts = out.collections!.find((c) => c.slug === 'posts')!
    const components = posts.admin?.components as Record<string, any> | undefined

    expect(components?.afterDocument).toBeUndefined()
    const slot = components?.edit?.beforeDocumentControls as string[]
    expect(Array.isArray(slot)).toBe(true)
    expect(slot).toContain('@consilioweb/payload-admin-ui-pro/client#DocumentTimeline')
    expect(slot).toContain('@consilioweb/payload-admin-ui-pro/client#PresenceIndicator')
  })

  it('never tracks its own bookkeeping collections', async () => {
    const out = await apply({}, hostConfig())
    for (const slug of ['activity-log', 'dashboard-preferences']) {
      const col = out.collections!.find((c) => c.slug === slug)!
      expect(col.hooks?.afterChange ?? []).toHaveLength(0)
    }
  })

  it('adds no collection, endpoint or view when every module is off', async () => {
    const incoming = hostConfig()
    const out = await apply({
      dashboard: false,
      listViews: false,
      quickActions: false,
      fieldEnhance: false,
      branding: false,
      activity: false,
    }, incoming)

    expect(out.collections!.map((c) => c.slug).sort()).toEqual(['admins', 'posts'])
    expect(out.endpoints ?? []).toHaveLength(0)
    // The settings global stays: it is the plugin, not a module.
    expect(out.globals!.some((g) => g.slug === 'aup-settings')).toBe(true)
  })

  it('merges its translations without dropping the host ones', async () => {
    const incoming = hostConfig()
    incoming.i18n = { translations: { en: { custom: { hello: 'world' } } } } as never

    const out = await apply({}, incoming)
    const en = (out.i18n!.translations as any).en

    expect(en.custom.hello).toBe('world')
    expect(en['plugin-admin-ui-pro']).toBeDefined()
  })
})
