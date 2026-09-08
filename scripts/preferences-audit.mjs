/**
 * Pure logic behind `aup-audit-preferences`.
 *
 * Kept apart from the bin so it can be tested without a database, a Payload
 * instance or a TypeScript loader.
 *
 * WHAT IS BEING AUDITED
 *
 * `dashboard-preferences.user` is a relationship to ONE collection, so the
 * database stores a bare id and the collection is implicit. Ids are per-collection
 * sequences on SQLite and Postgres: `users#3` and `customers#3` are both `3`.
 *
 * Before the access rules were tightened (see modules/dashboard/collection.ts),
 * `create` returned a bare `true`, so any authenticated account — including a
 * front-office `customers` login — could POST a preferences row carrying somebody
 * else's `user` id. `unique: true` on that field then made the planted row THE row
 * the victim's dashboard reads, and the PATCH handler upserts, so the victim never
 * sees an error. The fix closed the door; it does not clean what came through it.
 *
 * TWO FINDINGS, TWO SEVERITIES
 *
 *  - `orphan`: the id in `user` matches no document of the admin auth collection.
 *    The row is unreachable and unusable — either planted, or left behind by a
 *    deleted account. Safe to delete, which is what `--fix` does.
 *
 *  - `collision`: the id resolves in the admin collection AND in another auth
 *    collection. Ownership is ambiguous by construction. This is REPORTED ONLY
 *    and never auto-deleted: on any host with two auth collections there will be
 *    perfectly legitimate rows here (admin #3 exists, customer #3 exists, and the
 *    layout belongs to the admin). Deleting them would destroy real work to
 *    protect against a possibility.
 */

/** Ids arrive as `3`, `"3"` or `{ id: 3 }` depending on the adapter and depth. */
export function relationId(value) {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const inner = value.id ?? value.value
    if (typeof inner === 'number' || typeof inner === 'string') return inner
  }
  return undefined
}

export function parseArgs(argv = []) {
  const args = {
    fix: false,
    json: false,
    help: false,
    slug: 'dashboard-preferences',
    unknown: [],
  }

  for (const arg of argv) {
    if (arg === '--fix') args.fix = true
    else if (arg === '--json') args.json = true
    else if (arg === '--help' || arg === '-h') args.help = true
    else if (arg.startsWith('--slug=')) args.slug = arg.slice('--slug='.length)
    else args.unknown.push(arg)
  }

  return args
}

/**
 * Sort rows into `ok`, `orphans` and `collisions`.
 *
 * `lookup` answers "does this id exist in that collection?" and is injected so
 * the classification can be tested without a database.
 *
 * Ids are compared as strings throughout: `req.user.id` is a number on
 * SQLite/Postgres and a string on Mongo, and a REST body may send either.
 */
export async function classifyRows({ rows, adminCollection, otherAuthCollections, lookup }) {
  const ok = []
  const orphans = []
  const collisions = []

  for (const row of rows) {
    const userId = relationId(row.user)

    if (userId === undefined || userId === null || userId === '') {
      // `user` is `required`, so an empty one can only be a row written around
      // the collection — through a raw SQL insert, or by an older version.
      orphans.push({ id: row.id, userId: null, reason: 'no-user' })
      continue
    }

    const inAdmin = await lookup(adminCollection, userId)
    if (!inAdmin) {
      orphans.push({ id: row.id, userId, reason: 'unknown-user' })
      continue
    }

    const alsoIn = []
    for (const collection of otherAuthCollections) {
      if (await lookup(collection, userId)) alsoIn.push(collection)
    }

    if (alsoIn.length > 0) collisions.push({ id: row.id, userId, alsoIn })
    else ok.push({ id: row.id, userId })
  }

  return { ok, orphans, collisions }
}

/** Human-readable report. Returns lines so the bin decides where they go. */
export function formatReport({ slug, adminCollection, result, fix }) {
  const lines = []
  const total = result.ok.length + result.orphans.length + result.collisions.length

  lines.push(`Collection : ${slug}`)
  lines.push(`Collection d'authentification du panneau : ${adminCollection}`)
  lines.push(`Lignes examinees : ${total}`)
  lines.push('')

  if (result.orphans.length === 0) {
    lines.push('OK  Aucune ligne orpheline.')
  } else {
    lines.push(`!!  ${result.orphans.length} ligne(s) dont le champ "user" ne designe`)
    lines.push(`    aucun document de "${adminCollection}" :`)
    for (const row of result.orphans) {
      lines.push(`      - ${slug}#${row.id} → user=${row.userId ?? '(vide)'} (${row.reason})`)
    }
    lines.push(
      fix
        ? '    → supprimees (--fix).'
        : '    → relancez avec --fix pour les supprimer.',
    )
  }

  lines.push('')

  if (result.collisions.length === 0) {
    lines.push('OK  Aucune collision d\'identifiant.')
  } else {
    lines.push(`??  ${result.collisions.length} ligne(s) dont l'id "user" existe AUSSI dans`)
    lines.push('    une autre collection d\'authentification :')
    for (const row of result.collisions) {
      lines.push(`      - ${slug}#${row.id} → user=${row.userId} (aussi dans ${row.alsoIn.join(', ')})`)
    }
    lines.push('    → JAMAIS supprimees automatiquement : sur un hote a plusieurs')
    lines.push('      collections auth, la plupart sont legitimes. A verifier a la main')
    lines.push('      si la ligne date d\'avant le correctif d\'acces.')
  }

  return lines
}

export const HELP = `
aup-audit-preferences — audit des lignes dashboard-preferences

  Lecture seule par defaut. Rien n'est supprime sans --fix.

  Usage :
    npx aup-audit-preferences [--fix] [--json] [--slug=<collection>]

  Options :
    --fix     supprime les lignes orphelines (jamais les collisions)
    --json    sortie machine
    --slug=   collection a auditer (defaut : dashboard-preferences)
    --help    cette aide

  A executer depuis la racine de l'application Payload hote : le script charge
  la configuration de l'hote via le binaire "payload" pour parler a sa base.
`
