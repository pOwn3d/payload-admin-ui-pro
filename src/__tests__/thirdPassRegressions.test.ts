import { describe, it, expect } from 'vitest'
import type { Field } from 'payload'

import { createAdminUiProSettingsGlobal } from '../globals/AdminUiProSettings.js'
import { canAccessActivityLog } from '../modules/activity/collection.js'
import { sanitizeCSS } from '../modules/branding/LoginBackground.js'
import {
  validateBackground,
  validateUrl,
  containsDangerousCSS,
  isSafeDataImageUri,
} from '../utils/security.js'

/**
 * Third pass. Two holes, both of them RESIDUE: one opened by the second pass's
 * own hardening, one left by a fix that stopped at the "at minimum" variant of
 * what it was told to do. Each case here reopens if the guard goes.
 */

const CONFIG = { admin: { user: 'users' } }

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

const global = createAdminUiProSettingsGlobal({})

// ── AUP3-01 — the `data:` branch of the login background ────────────────────

/**
 * The value is interpolated at LoginBackground.tsx into
 * `background-image: url(${bg}) !important;`, inside a `<style>` rendered on
 * the UNAUTHENTICATED /admin page. `)` closes the `url(`, `;` ends the
 * declaration, and everything after it is attacker CSS in a pseudo-element
 * already `position:fixed; inset:0`.
 */
const DATA_BREAKOUT =
  'data:image/gif,a)!important;position:fixed;inset:0;z-index:2147483647;background:red'

const DATA_BEACON =
  "data:image/gif,a)!important;background-image:image-set('https://attacker.tld/beacon')"

describe('login background — the data: URI cannot break out (AUP3-01)', () => {
  it('refuses a data: URI carrying declaration separators', () => {
    // The percent-encoded branch used to accept the RFC 3986 sub-delims, `)`
    // and `;` among them. No image needs those after the comma.
    expect(validateBackground(DATA_BREAKOUT)).not.toBe(true)
    expect(validateUrl(DATA_BREAKOUT)).not.toBe(true)
    expect(isSafeDataImageUri(DATA_BREAKOUT)).toBe(false)
  })

  it('refuses the beacon variant too', () => {
    expect(validateBackground(DATA_BEACON)).not.toBe(true)
  })

  it('strips the semicolons of a data: value that is not a real image URI', () => {
    // Second, independent lock: the render path no longer trusts the `data:`
    // PREFIX. Whatever is already stored — written before this validator, or
    // through the Local API — cannot end its declaration.
    for (const hostile of [DATA_BREAKOUT, DATA_BEACON]) {
      const out = sanitizeCSS(hostile)
      expect(out).not.toContain(';')
      expect(out).not.toContain('{')
    }
  })

  it('keeps every legitimate background untouched', () => {
    const legit = [
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iIi8+',
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
      'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22x%22%2F%3E',
      '/media/login-bg.jpg',
      'https://cdn.example.com/bg.webp',
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    ]
    for (const value of legit) {
      expect(validateBackground(value), value).toBe(true)
      expect(sanitizeCSS(value), value).toBe(value)
    }
  })

  it('lets a value keep its semicolons only when the URL validator would accept it', () => {
    // The bug WAS the divergence: `validateUrl` asked for a shape,
    // `sanitizeCSS` asked for a prefix, and the gap between the two answers is
    // where the payload lived. One predicate now answers for both.
    const corpus = [
      DATA_BREAKOUT,
      DATA_BEACON,
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
      'data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E',
      'data:text/html;base64,PHNjcmlwdD4=',
      'https://cdn.example.com/a;b.png',
    ]
    for (const value of corpus) {
      const keptSemicolons = sanitizeCSS(value).includes(';')
      if (keptSemicolons) expect(validateUrl(value), value).toBe(true)
    }
  })
})

describe('login background — image-set() is a remote fetch like url() (AUP3-01)', () => {
  it('is refused inside the gradient branch, which sanitizeCSS does not filter', () => {
    // `background: linear-gradient(...), image-set('https://…')` is valid CSS
    // and fires an outbound request for every anonymous visitor of /admin.
    // Braces and semicolons are irrelevant here, so the write path is the lock.
    expect(
      validateBackground("linear-gradient(red, blue), image-set('https://attacker.tld/beacon')"),
    ).not.toBe(true)
  })

  it('matches the vendor-prefixed spelling', () => {
    expect(containsDangerousCSS("-webkit-image-set('https://attacker.tld/x')")).toBe(true)
    expect(containsDangerousCSS('image-set ( "x" )')).toBe(true)
  })

  it('does not flag an ordinary gradient', () => {
    expect(containsDangerousCSS('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')).toBe(false)
  })
})

describe('login background — tightening does not brick the settings global', () => {
  const validate = findField(global.fields, 'loginBackground').validate as (
    v: unknown,
    o: unknown,
  ) => unknown

  it('still refuses the hostile value on a first write', () => {
    expect(validate(DATA_BREAKOUT, { previousValue: undefined })).not.toBe(true)
    expect(validate(DATA_BREAKOUT, { previousValue: '' })).not.toBe(true)
  })

  it('does not turn an already-stored value into a permanent 400', () => {
    // Payload revalidates the WHOLE merged document on every save. A value
    // stored before the charset was narrowed — a percent-encoded SVG with raw
    // sub-delims, say — would otherwise make the global unsaveable, including
    // unsaveable back to a clean value.
    const grandfathered = "data:image/svg+xml,%3Csvg xmlns='x'%2F%3E".replace(' ', '')
    expect(validate(grandfathered, { previousValue: grandfathered })).toBe(true)
    // Stored, never applied: the render path still refuses it its semicolons.
    expect(sanitizeCSS(DATA_BREAKOUT)).not.toContain(';')
  })

  it('refuses it again as soon as it is edited', () => {
    expect(validate(DATA_BREAKOUT, { previousValue: '/media/old.png' })).not.toBe(true)
  })
})

// ── AUP3-02 — activityConfig read gate ──────────────────────────────────────

describe('activityConfig is gated by the audit-trail rule (AUP3-02)', () => {
  const read = findField(global.fields, 'activityConfig').access.read as (a: {
    req: unknown
  }) => boolean

  const req = (user: unknown) => ({ req: { user, payload: { config: CONFIG } } })

  it('hides the webhook URL from a back-office account the plugin excludes from activity', () => {
    // `viewer` and `user` carry `activity: false`, `editor` / `author` are 403
    // on the audit trail itself. Reading the CONFIGURATION of that trail — a
    // Slack/Discord webhook URL, i.e. a bearer credential — must not be looser
    // than reading the trail.
    for (const role of ['viewer', 'user', 'editor', 'author']) {
      expect(read(req({ id: '2', collection: 'users', role })), role).toBe(false)
    }
    expect(read(req({ id: '3', collection: 'users', roles: ['viewer'] }))).toBe(false)
  })

  it('still hides it from another auth collection and from anonymous', () => {
    expect(read(req({ id: '4', collection: 'customers' }))).toBe(false)
    expect(read(req({ id: '5', collection: 'customers', role: 'admin' }))).toBe(false)
    expect(read(req(null))).toBe(false)
  })

  it('still shows it to an administrator, however the role is spelled', () => {
    expect(read(req({ id: '1', collection: 'users', role: 'admin' }))).toBe(true)
    expect(read(req({ id: '1', collection: 'users', role: 'Superadmin' }))).toBe(true)
    expect(read(req({ id: '1', collection: 'users', roles: [{ value: 'admin' }] }))).toBe(true)
  })

  it('keeps hosts without any role field working — the documented fail-open', () => {
    expect(read(req({ id: '1', collection: 'users' }))).toBe(true)
  })

  it('is the very rule of the audit trail, not a second implementation of it', () => {
    // Two sources of truth for one notion is how the hole reopens: the log said
    // "collection AND role", the config subtree said "collection".
    const cases = [
      { id: '1', collection: 'users', role: 'admin' },
      { id: '2', collection: 'users', role: 'viewer' },
      { id: '3', collection: 'customers' },
      { id: '4', collection: 'users' },
    ]
    for (const user of cases) {
      expect(read(req(user)), JSON.stringify(user)).toBe(
        canAccessActivityLog({ req: { user, payload: { config: CONFIG } } } as never),
      )
    }
  })
})
