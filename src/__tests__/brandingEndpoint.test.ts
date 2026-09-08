import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createBrandingEndpoints, pickPublicBranding } from '../modules/branding/endpoints.js'
import { brandingModule } from '../modules/branding/plugin.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** A settings global with every sensitive neighbour the whitelist must drop. */
const FULL_SETTINGS = {
  brand: { brandName: 'Acme', logoUrl: '/logo.svg', logoHeight: 40, internalNote: 'secret' },
  branding: {
    loginBackground: 'linear-gradient(#000, #fff)',
    loginLayout: 'split',
    welcomeMessage: 'Bienvenue',
    loginFooter: '© Acme',
    faviconUrl: '/favicon.ico',
    titleSuffix: ' — Acme',
  },
  theme: { preset: 'midnight', customAccent: '#ff0000' },
  activityConfig: { webhookUrl: 'https://hooks.example.test/T000/B000/XXXX' },
  modulesEnabled: { dashboard: true, activity: true },
  menuConfig: [{ slug: 'posts', customLabel: 'Articles' }],
  notificationRules: [{ event: 'create', channel: 'webhook' }],
}

describe('pickPublicBranding', () => {
  it('returns exactly the nine values the login page needs', () => {
    const result = pickPublicBranding(FULL_SETTINGS)

    expect(result).toEqual({
      brand: { brandName: 'Acme', logoUrl: '/logo.svg', logoHeight: 40 },
      branding: {
        loginBackground: 'linear-gradient(#000, #fff)',
        loginLayout: 'split',
        welcomeMessage: 'Bienvenue',
        loginFooter: '© Acme',
        faviconUrl: '/favicon.ico',
      },
      theme: { preset: 'midnight' },
    })
  })

  it('drops the webhook URL and everything else not on the list', () => {
    // The whitelist is positive on purpose: a blacklist would leak whichever
    // sensitive field is added next, which is how the webhook URL leaked once.
    const serialised = JSON.stringify(pickPublicBranding(FULL_SETTINGS))

    expect(serialised).not.toContain('hooks.example.test')
    expect(serialised).not.toContain('activityConfig')
    expect(serialised).not.toContain('menuConfig')
    expect(serialised).not.toContain('notificationRules')
    expect(serialised).not.toContain('modulesEnabled')
    expect(serialised).not.toContain('internalNote')
    expect(serialised).not.toContain('customAccent')
  })

  it('answers with the same shape when there is no document at all', () => {
    for (const empty of [null, undefined, {}, 'nonsense', []]) {
      const result = pickPublicBranding(empty)
      expect(Object.keys(result).sort()).toEqual(['brand', 'branding', 'theme'])
      expect(result.brand.brandName).toBeNull()
    }
  })

  it('refuses a non-string logo and a non-numeric height', () => {
    const result = pickPublicBranding({
      brand: { brandName: { en: 'Acme' }, logoUrl: ['/a.svg'], logoHeight: '40' },
    })

    expect(result.brand).toEqual({ brandName: null, logoUrl: null, logoHeight: null })
  })

  it('does not walk a prototype-polluted payload', () => {
    const hostile = JSON.parse('{"__proto__":{"brandName":"injected"},"brand":{}}')
    expect(pickPublicBranding(hostile).brand.brandName).toBeNull()
  })
})

describe('GET /api/admin-ui-pro/branding', () => {
  function endpoint() {
    return createBrandingEndpoints()[0]!
  }

  it('is registered as a public GET', () => {
    expect(endpoint().path).toBe('/admin-ui-pro/branding')
    expect(endpoint().method).toBe('get')
  })

  it('serves the whitelist and nothing else', async () => {
    const findGlobal = vi.fn(async () => FULL_SETTINGS)
    const response = await endpoint().handler({ payload: { findGlobal } } as never)
    const body = await (response as Response).json()

    expect((response as Response).status).toBe(200)
    expect(body.brand.brandName).toBe('Acme')
    expect(JSON.stringify(body)).not.toContain('hooks.example.test')
    expect(findGlobal).toHaveBeenCalledWith({
      slug: 'aup-settings',
      depth: 0,
      // No session exists on the login page; the whitelist is what filters,
      // not the global's own read rule.
      overrideAccess: true,
    })
  })

  it('answers 200 with empty branding when the global has never been saved', async () => {
    const findGlobal = vi.fn(async () => {
      throw new Error('not found')
    })
    const response = await endpoint().handler({ payload: { findGlobal } } as never)

    // A 500 here would put a red error in the console of every login page.
    expect((response as Response).status).toBe(200)
    expect((await (response as Response).json()).brand.logoUrl).toBeNull()
  })
})

describe('branding module wiring', () => {
  it('registers the endpoint alongside the login components', () => {
    const config = brandingModule(undefined, {})({ admin: {}, endpoints: [] } as never)
    const paths = (config.endpoints as Array<{ path: string }>).map((e) => e.path)

    expect(paths).toContain('/admin-ui-pro/branding')
  })

  it('keeps the host endpoints already declared', () => {
    const config = brandingModule(undefined, {})({
      admin: {},
      endpoints: [{ path: '/host', method: 'get', handler: () => new Response('') }],
    } as never)

    expect((config.endpoints as Array<{ path: string }>).map((e) => e.path)).toEqual([
      '/host',
      '/admin-ui-pro/branding',
    ])
  })

  it('the login page reads the narrow endpoint, not the whole global', () => {
    const src = readFileSync(join(ROOT, 'modules/branding/LoginBackground.tsx'), 'utf8')

    expect(src).toContain("fetch('/api/admin-ui-pro/branding'")
    expect(src).not.toContain("fetch('/api/globals/aup-settings'")
  })
})
