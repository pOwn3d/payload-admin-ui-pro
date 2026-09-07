import { describe, it, expect } from 'vitest'
import type { Field } from 'payload'
import { createAdminUiProSettingsGlobal } from '../globals/AdminUiProSettings.js'

const global = createAdminUiProSettingsGlobal({})

/** Depth-first walk over every field, yielding [field, ancestors]. */
function* walk(fields: Field[], ancestors: Field[] = []): Generator<[Field, Field[]]> {
  for (const field of fields) {
    yield [field, ancestors]
    const nested = (field as { fields?: Field[] }).fields
    if (Array.isArray(nested)) yield* walk(nested, [...ancestors, field])
  }
}

function find(name: string): [Field, Field[]] {
  for (const entry of walk(global.fields)) {
    if ('name' in entry[0] && entry[0].name === name) return entry
  }
  throw new Error(`field ${name} not found`)
}

const anon = { req: { user: null } } as never
const authed = { req: { user: { id: '1' } } } as never

describe('aup-settings access', () => {
  it('stays readable without a session — the login page needs it', () => {
    // LoginBackground and FaviconInjector fetch this global before anyone is
    // authenticated. Closing it entirely would break the login page branding.
    expect((global.access!.read as (a: unknown) => boolean)(anon)).toBe(true)
  })

  it('hides the activity config from anonymous readers', () => {
    const [field] = find('activityConfig')
    const read = (field as { access?: { read?: (a: unknown) => boolean } }).access?.read
    expect(read, 'activityConfig must carry a field-level read rule').toBeTypeOf('function')
    expect(read!(anon)).toBe(false)
    expect(read!(authed)).toBe(true)
  })

  it('keeps the webhook URL inside that gated subtree', () => {
    // The webhook URL is a bearer credential: a Slack/Discord endpoint is the
    // secret. Payload deletes a whole group when its read rule denies, so
    // living under activityConfig is what keeps this field private.
    const [, ancestors] = find('webhookUrl')
    const gated = ancestors.some(
      (a) =>
        'name' in a &&
        a.name === 'activityConfig' &&
        typeof (a as { access?: { read?: unknown } }).access?.read === 'function',
    )
    expect(gated).toBe(true)
  })

  it('exposes no other field carrying a secret at the top level', () => {
    const suspicious = /webhook|secret|token|apikey|password/i
    for (const [field, ancestors] of walk(global.fields)) {
      if (!('name' in field) || !field.name || !suspicious.test(field.name)) continue
      const gated = ancestors.some(
        (a) => typeof (a as { access?: { read?: unknown } }).access?.read === 'function',
      )
      expect(gated, `${field.name} is readable anonymously`).toBe(true)
    }
  })
})
