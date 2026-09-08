import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Field } from 'payload'

import { createAdminUiProSettingsGlobal } from '../globals/AdminUiProSettings.js'
import { createDashboardPreferencesCollection } from '../modules/dashboard/collection.js'
import { createDashboardEndpoints } from '../modules/dashboard/endpoints.js'
import { createActivityEndpoints } from '../modules/activity/endpoints.js'
import { createAfterChangeHook } from '../modules/activity/hooks.js'
import { generateCustomCSS, generateThemeCSS } from '../utils/themeApplier.js'
import { THEME_PRESETS } from '../styles/theme-presets.js'
import { escapeCsvCell } from '../modules/list-views/ExportButton.js'
import {
  isSafeCssValue,
  validateCssColor,
  validateWebhookUrl,
  isPrivateIpLiteral,
} from '../utils/security.js'
import {
  assertSafeWebhookUrl,
  safeWebhookFetch,
  BlockedWebhookUrlError,
} from '../utils/ssrf.js'
import { isAdminCollectionUser } from '../utils/userCollection.js'

/**
 * Every case here reopens one of the eight confirmed holes if the guard is
 * removed. The shared premise: a host runs the admin panel on `users` AND a
 * front-office auth collection (`customers`). A customer who signs up normally
 * holds a perfectly valid `req.user`, which is why `!!req.user` was never an
 * admin check — and why `req.user.id` alone is not a scope, ids being
 * per-collection sequences on SQLite and Postgres.
 */

const CONFIG = { admin: { user: 'users' } }

/** Unique per call so the in-memory rate limiter never bleeds across cases. */
let seq = 0
const uid = () => `sr${(seq += 1)}-${Date.now()}`

function asAdmin(extra: Record<string, unknown> = {}) {
  return { id: uid(), collection: 'users', ...extra }
}
function asCustomer(extra: Record<string, unknown> = {}) {
  return { id: uid(), collection: 'customers', ...extra }
}

type Handler = (req: unknown) => Promise<Response>
function handlerFor(endpoints: { path?: string; method?: string; handler?: unknown }[], path: string, method: string): Handler {
  const ep = endpoints.find((e) => e.path === path && e.method === method)
  if (!ep) throw new Error(`no endpoint ${method} ${path}`)
  return ep.handler as Handler
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── AUP-01 — settings global writable from another auth collection ──────────

describe('aup-settings access.update (AUP-01)', () => {
  const update = (global: ReturnType<typeof createAdminUiProSettingsGlobal>) =>
    global.access!.update as (args: { req: unknown }) => boolean

  it('refuses a front-office account that no role rule would have caught', () => {
    // resolvePermissions falls through to "authenticated but no recognised
    // role → ADMIN_PERMISSIONS", so before the collection check this returned
    // true and a customer could rewrite webhooks, login branding and theme CSS.
    const global = createAdminUiProSettingsGlobal({})
    expect(
      update(global)({ req: { user: asCustomer(), payload: { config: CONFIG } } }),
    ).toBe(false)
    expect(
      update(global)({ req: { user: asCustomer({ role: 'admin' }), payload: { config: CONFIG } } }),
    ).toBe(false)
  })

  it('keeps letting an admin without any role through — the documented fallback', () => {
    const global = createAdminUiProSettingsGlobal({})
    expect(
      update(global)({ req: { user: asAdmin(), payload: { config: CONFIG } } }),
    ).toBe(true)
  })

  it('still refuses anonymous callers', () => {
    const global = createAdminUiProSettingsGlobal({})
    expect(update(global)({ req: { user: null, payload: { config: CONFIG } } })).toBe(false)
  })

  it("consults the host's own access.permissions resolver", () => {
    // The bare `defaultUpdateAccess` reference never received pluginConfig, so
    // a host locking settings down through this resolver was ignored.
    const global = createAdminUiProSettingsGlobal({
      access: { permissions: (user: any) => ({ settings: user.role === 'owner' }) },
    })
    expect(
      update(global)({ req: { user: asAdmin({ role: 'owner' }), payload: { config: CONFIG } } }),
    ).toBe(true)
    expect(
      update(global)({ req: { user: asAdmin({ role: 'staff' }), payload: { config: CONFIG } } }),
    ).toBe(false)
  })

  it('leaves a host-supplied access.settings rule in charge', () => {
    const global = createAdminUiProSettingsGlobal({ access: { settings: () => true } })
    expect(
      update(global)({ req: { user: asCustomer(), payload: { config: CONFIG } } }),
    ).toBe(true)
  })
})

// ── AUP-02 — webhook URL readable by any authenticated account ──────────────

describe('activityConfig field read gate (AUP-02)', () => {
  function findField(fields: Field[], name: string): Field {
    for (const field of fields) {
      if ('name' in field && field.name === name) return field
      const nested = (field as { fields?: Field[] }).fields
      if (Array.isArray(nested)) {
        try {
          return findField(nested, name)
        } catch {
          /* keep walking */
        }
      }
    }
    throw new Error(`field ${name} not found`)
  }

  const global = createAdminUiProSettingsGlobal({})
  const read = (findField(global.fields, 'activityConfig') as {
    access?: { read?: (a: { req: unknown }) => boolean }
  }).access!.read!

  it('hides the webhook URL from another auth collection', () => {
    // The URL of a Slack / Discord / n8n incoming webhook IS the credential.
    expect(read({ req: { user: asCustomer(), payload: { config: CONFIG } } })).toBe(false)
  })

  it('still shows it to the admin panel', () => {
    expect(read({ req: { user: asAdmin(), payload: { config: CONFIG } } })).toBe(true)
  })

  it('still hides it from anonymous readers, login page or not', () => {
    expect(read({ req: { user: null, payload: { config: CONFIG } } })).toBe(false)
    // The global itself stays public — the login page needs the branding.
    expect((global.access!.read as () => boolean)()).toBe(true)
  })
})

// ── AUP-03 — unbounded SSRF through the notification webhook ────────────────

describe('webhook SSRF guard (AUP-03)', () => {
  it('classifies private address space, IPv4-mapped IPv6 included', () => {
    for (const ip of [
      '127.0.0.1', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1',
      '169.254.169.254', '100.64.0.1', '0.0.0.0', '255.255.255.255',
      '::1', '::', 'fd00::1', 'fc00::1', 'fe80::1',
      '::ffff:10.0.0.1', '::ffff:169.254.169.254',
      // Compressed IPv4-mapped form — WHATWG `URL` rewrites
      // `https://[::ffff:10.0.0.1]/` to `https://[::ffff:a00:1]/`, so matching a
      // dotted tail in the string is not enough; the address must be parsed.
      '::ffff:a00:1', '::ffff:a9fe:a9fe', '::ffff:7f00:1',
      '2001:db8::1', 'ff02::1', '64:ff9b::7f00:1',
    ]) {
      expect(isPrivateIpLiteral(ip), ip).toBe(true)
    }
    for (const ip of [
      '93.184.216.34', '8.8.8.8', '172.32.0.1', '11.0.0.1',
      '2606:4700:4700::1111', '2a00:1450:4007:80f::200e', '::ffff:8.8.8.8',
      'not-an-ip', '',
    ]) {
      expect(isPrivateIpLiteral(ip), ip).toBe(false)
    }
  })

  it('refuses loopback, link-local and internal hostnames', async () => {
    for (const url of [
      'https://127.0.0.1:8080/admin/api/flush',
      'https://169.254.169.254/latest/meta-data/',
      'https://[::1]/x',
      'https://[::ffff:10.0.0.1]/x',
      'https://localhost/hook',
      'https://vault.internal/hook',
      'https://printer.local/hook',
      'http://93.184.216.34/hook',
    ]) {
      await expect(assertSafeWebhookUrl(url), url).rejects.toBeInstanceOf(BlockedWebhookUrlError)
    }
  })

  it('honours the host-declared allowlist for a deliberate internal target', async () => {
    await expect(
      assertSafeWebhookUrl('https://10.0.0.5/hook', { allowedHosts: ['10.0.0.5'] }),
    ).resolves.toBeInstanceOf(URL)
  })

  it('re-checks the target after a redirect instead of following it blindly', async () => {
    // The bare fetch() followed redirects by default, so an allowlist on the
    // initial URL was defeated by `302 → http://169.254.169.254/`.
    const fetchMock = vi.fn().mockResolvedValue({
      status: 302,
      headers: new Headers({ location: 'https://169.254.169.254/latest/meta-data/' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      safeWebhookFetch('https://93.184.216.34/hook', { headers: {}, body: '{}' }),
    ).rejects.toBeInstanceOf(BlockedWebhookUrlError)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]![1].redirect).toBe('manual')
  })

  it('delivers normally to a public endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, headers: new Headers() })
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      safeWebhookFetch('https://93.184.216.34/hook', { headers: {}, body: '{"a":1}' }),
    ).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a private target at field-validation time too', () => {
    expect(validateWebhookUrl('https://169.254.169.254/x')).not.toBe(true)
    expect(validateWebhookUrl('https://127.0.0.1/x')).not.toBe(true)
    expect(validateWebhookUrl('https://hooks.slack.com/services/T/B/x')).toBe(true)
  })
})

// ── AUP-04 — presence endpoints leaking admin e-mails ───────────────────────

describe('presence endpoints (AUP-04)', () => {
  const endpoints = createActivityEndpoints('activity-log', 90)
  const get = handlerFor(endpoints, '/admin-ui-pro/presence', 'get')
  const post = handlerFor(endpoints, '/admin-ui-pro/presence', 'post')
  const del = handlerFor(endpoints, '/admin-ui-pro/presence', 'delete')

  it('refuses a front-office account on all three verbs', async () => {
    const base = { payload: { config: CONFIG } }
    expect(
      (await get({ ...base, user: asCustomer(), url: '/api/admin-ui-pro/presence?key=presence:users:1' })).status,
    ).toBe(403)
    expect(
      (await post({ ...base, user: asCustomer(), json: async () => ({ key: 'presence:users:1' }) })).status,
    ).toBe(403)
    expect(
      (await del({ ...base, user: asCustomer(), json: async () => ({ key: 'presence:users:1' }) })).status,
    ).toBe(403)
  })

  it('never hands an admin e-mail to a key an attacker enumerated', async () => {
    const admin = asAdmin({ email: 'boss@example.com' })
    await post({
      user: admin,
      payload: { config: CONFIG },
      json: async () => ({ key: 'presence:users:42' }),
    })

    const leaked = await get({
      user: asCustomer(),
      payload: { config: CONFIG },
      url: '/api/admin-ui-pro/presence?key=presence:users:42',
    })
    expect(leaked.status).toBe(403)
    expect(await leaked.text()).not.toContain('boss@example.com')

    // The admin still sees the banner — the legitimate path is untouched.
    const ok = await get({
      user: asAdmin(),
      payload: { config: CONFIG },
      url: '/api/admin-ui-pro/presence?key=presence:users:42',
    })
    expect(ok.status).toBe(200)
    expect((await ok.json()).editors[0].userName).toBe('boss@example.com')
  })

  it('refuses a key that is not a presence key', async () => {
    const res = await post({
      user: asAdmin(),
      payload: { config: CONFIG },
      json: async () => ({ key: 'anything-i-like' }),
    })
    expect(res.status).toBe(400)
  })
})

// ── AUP-05 — stored CSS injection through the custom theme colours ──────────

describe('theme CSS injection (AUP-05)', () => {
  const BREAKOUT =
    'hsl(1) } html:root * { } body::after { content: ""; position: fixed; inset: 0; background: url(https://attacker.tld/c) } .x{'

  it('drops an accent that escapes its declaration', () => {
    expect(generateCustomCSS(BREAKOUT)).toBe('')
    expect(isSafeCssValue(BREAKOUT)).toBe(false)
  })

  it('drops a hostile secondary colour but keeps the valid accent', () => {
    const css = generateCustomCSS('hsl(250, 84%, 60%)', 'hsl(1) } * { display:none } .x{')
    expect(css).toContain('hsl(250, 84%, 60%)')
    expect(css).not.toContain('display:none')
    expect(css).not.toContain('}\n  --aup-green')
  })

  it('rejects the breakout at field-validation time as well', () => {
    expect(validateCssColor(BREAKOUT, { requireHsl: true })).not.toBe(true)
    expect(validateCssColor('hsl(250, 84%, 60%)', { requireHsl: true })).toBe(true)
    expect(validateCssColor('#00ff88')).toBe(true)
    expect(validateCssColor('red; } body { }')).not.toBe(true)
    expect(validateCssColor('url(https://attacker.tld/x)')).not.toBe(true)
  })

  it('refuses a pasted marketplace theme carrying a hostile colour', () => {
    const tampered = JSON.parse(JSON.stringify(THEME_PRESETS[0]))
    tampered.colors.accent = BREAKOUT
    expect(generateThemeCSS(tampered)).toBe('')
  })

  it('still renders every shipped preset — the legitimate path', () => {
    for (const preset of THEME_PRESETS) {
      const css = generateThemeCSS(preset)
      expect(css, preset.id).toContain('--aup-accent')
    }
    expect(generateCustomCSS('hsl(250, 84%, 60%)')).toContain('--aup-accent')
  })
})

// ── AUP-06 — IDOR on dashboard preferences ──────────────────────────────────

describe('dashboard preferences (AUP-06)', () => {
  const endpoints = createDashboardEndpoints('dashboard-preferences')
  const get = handlerFor(endpoints, '/admin-ui-pro/dashboard', 'get')
  const patch = handlerFor(endpoints, '/admin-ui-pro/dashboard', 'patch')
  const remove = handlerFor(endpoints, '/admin-ui-pro/dashboard', 'delete')

  it('refuses a front-office account whose id collides with an admin id', async () => {
    // users#3 and customers#3 are both `3`: the where clause could not tell
    // them apart, so the customer read, overwrote and deleted the admin's row.
    const req = {
      user: { id: 3, collection: 'customers' },
      payload: { config: CONFIG, find: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn() },
      json: async () => ({ layout: { widgets: [], version: 1 } }),
    }
    expect((await get(req)).status).toBe(403)
    expect((await patch(req)).status).toBe(403)
    expect((await remove(req)).status).toBe(403)
    expect(req.payload.find).not.toHaveBeenCalled()
  })

  it('runs the collection access rules instead of the elevated Local API default', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    const req = { user: asAdmin(), payload: { config: CONFIG, find } }
    const res = await get(req)
    expect(res.status).toBe(200)
    expect(find.mock.calls[0]![0].overrideAccess).toBe(false)
    expect(find.mock.calls[0]![0].req).toBe(req)
  })

  it('forwards the caller on the write path too', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 9 }] })
    const update = vi.fn().mockResolvedValue({})
    const req = {
      user: asAdmin(),
      payload: { config: CONFIG, find, update },
      json: async () => ({ layout: { widgets: [], version: 1 } }),
    }
    expect((await patch(req)).status).toBe(200)
    expect(update.mock.calls[0]![0].overrideAccess).toBe(false)
    expect(update.mock.calls[0]![0].req).toBe(req)
  })

  it('scopes the collection rules by collection, not by bare id', () => {
    const collection = createDashboardPreferencesCollection('dashboard-preferences', 'users')
    const rule = (name: 'read' | 'update' | 'delete' | 'create') =>
      collection.access![name] as (a: { req: unknown }) => unknown

    for (const name of ['read', 'update', 'delete'] as const) {
      expect(rule(name)({ req: { user: asCustomer(), payload: { config: CONFIG } } }), name).toBe(false)
      expect(rule(name)({ req: { user: asAdmin(), payload: { config: CONFIG } } })).toHaveProperty('user')
    }
    expect(rule('create')({ req: { user: asCustomer(), payload: { config: CONFIG } } })).toBe(false)
    expect(rule('create')({ req: { user: asAdmin(), payload: { config: CONFIG } } })).toBe(true)
  })

  it('never writes a foreign-collection id into the audit trail relation', async () => {
    const create = vi.fn().mockResolvedValue({})
    const hook = createAfterChangeHook('activity-log', 'posts', { userCollectionSlug: 'users' })
    await (hook as any)({
      doc: { id: 1, title: 'Hello' },
      operation: 'create',
      req: {
        user: { id: 3, collection: 'customers', email: 'c@x.tld' },
        payload: { config: CONFIG, create, findGlobal: () => Promise.reject(new Error('x')) },
      },
    })
    const data = create.mock.calls[0]![0].data
    expect(data.user).toBeUndefined()
    expect(data.userName).toBe('c@x.tld')
  })
})

// ── AUP-07 — CSV formula injection in the list-view export ──────────────────

describe('CSV export escaping (AUP-07)', () => {
  it('neutralises every spreadsheet formula prefix', () => {
    for (const prefix of ['=', '+', '-', '@', '\t', '\r']) {
      const cell = escapeCsvCell(`${prefix}HYPERLINK("https://attacker.tld")`)
      expect(cell.replace(/^"/, '').startsWith("'"), prefix).toBe(true)
    }
  })

  it('quotes a carriage return so the row cannot be split', () => {
    expect(escapeCsvCell('a\rb')).toBe('"a\rb"')
  })

  it('leaves ordinary values and existing escaping alone', () => {
    expect(escapeCsvCell('Jean Dupont')).toBe('Jean Dupont')
    expect(escapeCsvCell(null)).toBe('')
    expect(escapeCsvCell('a,b')).toBe('"a,b"')
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""')
  })
})

// ── AUP-08 — schema disclosure through /admin-ui-pro/collections ────────────

describe('GET /admin-ui-pro/collections (AUP-08)', () => {
  const get = handlerFor(createDashboardEndpoints('dashboard-preferences'), '/admin-ui-pro/collections', 'get')

  const payload = {
    config: {
      ...CONFIG,
      collections: [{ slug: 'posts' }, { slug: 'seo-reports' }],
      globals: [{ slug: 'site-settings' }, { slug: 'seo-config' }],
    },
  }

  it('does not map the application for a front-office account', async () => {
    const res = await get({ user: asCustomer(), payload })
    expect(res.status).toBe(403)
  })

  it('filters globals the way collections already were', async () => {
    const res = await get({ user: asAdmin(), payload })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.globals.map((g: { slug: string }) => g.slug)).toEqual(['site-settings'])
    expect(body.collections.map((c: { slug: string }) => c.slug)).toEqual(['posts'])
  })
})

// ── The shared guard itself ─────────────────────────────────────────────────

describe('isAdminCollectionUser', () => {
  it('denies anonymous and foreign-collection principals', () => {
    expect(isAdminCollectionUser({ user: null, payload: { config: CONFIG } })).toBe(false)
    expect(isAdminCollectionUser({ user: { collection: 'customers' }, payload: { config: CONFIG } })).toBe(false)
    expect(isAdminCollectionUser({ user: { collection: 'users' }, payload: { config: CONFIG } })).toBe(true)
  })

  it('stays open when the config declares no admin collection', () => {
    // Only reachable with an unsanitized config or a hand-rolled test double —
    // denying there would break those setups for no security gain.
    expect(isAdminCollectionUser({ user: { collection: 'users' } })).toBe(true)
  })
})
