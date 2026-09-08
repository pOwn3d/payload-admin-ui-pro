import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  classifyRows,
  formatReport,
  parseArgs,
  relationId,
} from '../preferences-audit.mjs'

const SCRIPTS = dirname(dirname(fileURLToPath(import.meta.url)))

/** Ids exist in `users` (the admin collection) and `customers`. */
function lookupFrom(table) {
  return async (collection, id) => (table[collection] || []).map(String).includes(String(id))
}

describe('parseArgs', () => {
  it('is read-only unless --fix is passed', () => {
    expect(parseArgs([]).fix).toBe(false)
    expect(parseArgs(['--fix']).fix).toBe(true)
  })

  it('defaults to the documented slug and accepts an override', () => {
    expect(parseArgs([]).slug).toBe('dashboard-preferences')
    expect(parseArgs(['--slug=aup-prefs']).slug).toBe('aup-prefs')
  })

  it('collects anything it does not recognise instead of ignoring it', () => {
    // A typo like `--force` must not silently run a read-only pass that the
    // operator believes deleted something — or the reverse.
    expect(parseArgs(['--force']).unknown).toEqual(['--force'])
    expect(parseArgs(['--force']).fix).toBe(false)
  })
})

describe('relationId', () => {
  it('reads the three shapes a relationship value arrives in', () => {
    expect(relationId(3)).toBe(3)
    expect(relationId('3')).toBe('3')
    expect(relationId({ id: 3 })).toBe(3)
    expect(relationId({ value: 'abc' })).toBe('abc')
  })

  it('returns undefined for anything else', () => {
    expect(relationId(null)).toBeUndefined()
    expect(relationId({})).toBeUndefined()
    expect(relationId([])).toBeUndefined()
  })
})

describe('classifyRows', () => {
  const lookup = lookupFrom({ users: [1, 2], customers: [2, 9] })

  it('keeps a row whose user exists only in the admin collection', async () => {
    const result = await classifyRows({
      rows: [{ id: 'a', user: 1 }],
      adminCollection: 'users',
      otherAuthCollections: ['customers'],
      lookup,
    })

    expect(result.ok).toEqual([{ id: 'a', userId: 1 }])
    expect(result.orphans).toEqual([])
    expect(result.collisions).toEqual([])
  })

  it('flags a row whose user matches no admin document as an orphan', async () => {
    const result = await classifyRows({
      rows: [{ id: 'b', user: 9 }],
      adminCollection: 'users',
      otherAuthCollections: ['customers'],
      lookup,
    })

    // `users#9` does not exist; `customers#9` does. This is the shape a row
    // planted from a front-office account leaves behind once the admin it
    // impersonated never existed — or was deleted.
    expect(result.orphans).toEqual([{ id: 'b', userId: 9, reason: 'unknown-user' }])
    expect(result.ok).toEqual([])
  })

  it('flags an empty user as an orphan rather than crashing', async () => {
    const result = await classifyRows({
      rows: [{ id: 'c', user: null }, { id: 'd' }],
      adminCollection: 'users',
      otherAuthCollections: [],
      lookup,
    })

    expect(result.orphans.map((r) => r.reason)).toEqual(['no-user', 'no-user'])
  })

  it('reports an id that exists in two auth collections as a collision, not an orphan', async () => {
    const result = await classifyRows({
      rows: [{ id: 'e', user: 2 }],
      adminCollection: 'users',
      otherAuthCollections: ['customers'],
      lookup,
    })

    expect(result.collisions).toEqual([{ id: 'e', userId: 2, alsoIn: ['customers'] }])
    // Crucially NOT in orphans: --fix must never touch it.
    expect(result.orphans).toEqual([])
  })

  it('compares ids as strings, because Mongo returns them as strings', async () => {
    const result = await classifyRows({
      rows: [{ id: 'f', user: '1' }],
      adminCollection: 'users',
      otherAuthCollections: [],
      lookup,
    })

    expect(result.ok).toEqual([{ id: 'f', userId: '1' }])
  })

  it('finds no collision when the host has a single auth collection', async () => {
    const result = await classifyRows({
      rows: [{ id: 'g', user: 1 }, { id: 'h', user: 42 }],
      adminCollection: 'users',
      otherAuthCollections: [],
      lookup,
    })

    expect(result.collisions).toEqual([])
    expect(result.orphans.map((r) => r.id)).toEqual(['h'])
  })
})

describe('formatReport', () => {
  const result = {
    ok: [{ id: 1, userId: 1 }],
    orphans: [{ id: 2, userId: 9, reason: 'unknown-user' }],
    collisions: [{ id: 3, userId: 2, alsoIn: ['customers'] }],
  }

  it('tells the operator how to act when it has not acted', () => {
    const text = formatReport({
      slug: 'dashboard-preferences',
      adminCollection: 'users',
      result,
      fix: false,
    }).join('\n')

    expect(text).toContain('--fix')
    expect(text).toContain('Lignes examinees : 3')
  })

  it('says what it deleted once it has', () => {
    const text = formatReport({
      slug: 'dashboard-preferences',
      adminCollection: 'users',
      result,
      fix: true,
    }).join('\n')

    expect(text).toContain('supprimees (--fix)')
  })

  it('never suggests deleting a collision', () => {
    const text = formatReport({
      slug: 'dashboard-preferences',
      adminCollection: 'users',
      result,
      fix: true,
    }).join('\n')

    expect(text).toContain('JAMAIS supprimees automatiquement')
  })
})

describe('the bin', () => {
  const bin = readFileSync(join(SCRIPTS, 'audit-dashboard-preferences.mjs'), 'utf8')

  it('only ever deletes rows classified as orphans', () => {
    // The single delete call in the file iterates result.orphans.
    expect(bin).toContain('for (const row of result.orphans)')
    expect(bin.match(/payload\.delete\(/g)).toHaveLength(1)
  })

  it('guards every delete behind --fix', () => {
    expect(bin).toContain('if (args.fix && result.orphans.length > 0)')
  })

  it('re-executes under the host payload bin so a .ts config can load', () => {
    expect(bin).toContain("'run', SELF")
    expect(bin).toContain('AUP_AUDIT_BOOTSTRAPPED')
  })

  it('closes the database connection whatever happens', () => {
    expect(bin).toContain('payload.destroy()')
    expect(bin).toContain('} finally {')
  })
})
