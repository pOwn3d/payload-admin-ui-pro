#!/usr/bin/env node

/**
 * Data remediation for `dashboard-preferences`.
 *
 * Usage (from the host application root):
 *   npx aup-audit-preferences            # read-only report
 *   npx aup-audit-preferences --fix      # delete the orphan rows
 *
 * See ./preferences-audit.mjs for what is classified and why collisions are
 * reported rather than deleted.
 *
 * WHY IT RE-EXECUTES ITSELF
 *
 * The host's Payload config is almost always `payload.config.ts`, and plain
 * Node cannot import TypeScript. Payload ships the loader in its own bin:
 * `payload run <file>` registers tsx and then imports the file. So this script
 * runs twice — once as a launcher that finds that bin, once for real, under it.
 * The alternative (asking the integrator to install tsx, or to write their own
 * wrapper) is exactly the kind of setup step that stops a remediation script
 * from ever being run.
 */

import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

import { HELP, classifyRows, formatReport, parseArgs } from './preferences-audit.mjs'

const SELF = fileURLToPath(import.meta.url)
const BOOTSTRAP_FLAG = 'AUP_AUDIT_BOOTSTRAPPED'

function fail(message) {
  console.error(`\x1b[31m${message}\x1b[0m`)
  process.exit(1)
}

/**
 * Locate the host's `payload` bin — the real JS entry, not the `.bin` shim.
 *
 * `createRequire` from this file walks the same node_modules chain the runtime
 * would, which is what makes this work under pnpm's nested layout as well as a
 * flat npm one. The package root is reached from the resolved entry point
 * rather than by resolving `payload/package.json`, because a package is free
 * not to list that file in its export map — and payload does not.
 *
 * Returns `{ command, args }`: the `.bin` fallback is a SHELL shim on POSIX, so
 * it has to be executed directly and must never be handed to `node`.
 */
function findPayloadRunner() {
  try {
    const require = createRequire(SELF)
    let dir = path.dirname(require.resolve('payload'))
    for (let depth = 0; depth < 6; depth++) {
      const pkgPath = path.join(dir, 'package.json')
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
        if (pkg.name === 'payload') {
          const binRel = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.payload
          const resolved = binRel && path.join(dir, binRel)
          if (resolved && fs.existsSync(resolved)) {
            return { command: process.execPath, args: [resolved] }
          }
        }
      }
      const parent = path.dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  } catch {
    // fall through to the shim
  }

  const shim = path.resolve(process.cwd(), 'node_modules/.bin/payload')
  return fs.existsSync(shim) ? { command: shim, args: [] } : null
}

/**
 * Absolute path of the host's Payload config, or null.
 *
 * `PAYLOAD_CONFIG_PATH` first because that is the variable Payload's own bin
 * honours, then the conventional locations. Payload's `findConfig` is not in
 * the public export map of every 3.x release, so it is not depended on.
 */
function resolveConfigPath() {
  const fromEnv = process.env.PAYLOAD_CONFIG_PATH
  if (fromEnv) return path.resolve(process.cwd(), fromEnv)

  const candidates = [
    'src/payload.config.ts',
    'payload.config.ts',
    'src/payload.config.js',
    'payload.config.js',
    'dist/payload.config.js',
  ]

  for (const candidate of candidates) {
    const absolute = path.resolve(process.cwd(), candidate)
    if (fs.existsSync(absolute)) return absolute
  }

  return null
}

function bootstrap() {
  const runner = findPayloadRunner()
  if (!runner) {
    fail(
      'payload introuvable depuis ce repertoire.\n' +
        'Lancez la commande depuis la racine de l\'application Payload hote.',
    )
  }

  const result = spawnSync(
    runner.command,
    [...runner.args, 'run', SELF, ...process.argv.slice(2)],
    { stdio: 'inherit', env: { ...process.env, [BOOTSTRAP_FLAG]: '1' } },
  )

  process.exit(result.status ?? 1)
}

async function run() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    console.log(HELP)
    return
  }
  if (args.unknown.length > 0) {
    fail(`Option inconnue : ${args.unknown.join(', ')}\n${HELP}`)
  }

  const { getPayload } = await import('payload')

  const configPath = resolveConfigPath()
  if (!configPath) {
    fail(
      'Configuration Payload introuvable.\n' +
        'Definissez PAYLOAD_CONFIG_PATH=./src/payload.config.ts et relancez.',
    )
  }

  const imported = await import(pathToFileURL(configPath).href)
  const config = imported.default ?? imported
  const payload = await getPayload({ config })

  try {
    const adminCollection = payload.config.admin?.user
    if (!adminCollection) fail('config.admin.user est vide : rien a comparer.')

    const otherAuthCollections = (payload.config.collections || [])
      .filter((collection) => collection.auth && collection.slug !== adminCollection)
      .map((collection) => collection.slug)

    const hasCollection = (payload.config.collections || []).some((c) => c.slug === args.slug)
    if (!hasCollection) {
      fail(
        `Collection "${args.slug}" absente de cette configuration.\n` +
          'Le module dashboard est-il actif ? (--slug= pour un slug personnalise)',
      )
    }

    const { docs } = await payload.find({
      collection: args.slug,
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
    })

    // Cached: several preference rows normally point at the same handful of ids.
    const seen = new Map()
    const lookup = async (collection, id) => {
      const key = `${collection}#${id}`
      if (seen.has(key)) return seen.get(key)
      let exists = false
      try {
        const doc = await payload.findByID({
          collection,
          id,
          depth: 0,
          overrideAccess: true,
          disableErrors: true,
        })
        exists = Boolean(doc)
      } catch {
        exists = false
      }
      seen.set(key, exists)
      return exists
    }

    const result = await classifyRows({
      rows: docs,
      adminCollection,
      otherAuthCollections,
      lookup,
    })

    if (args.fix && result.orphans.length > 0) {
      for (const row of result.orphans) {
        await payload.delete({ collection: args.slug, id: row.id, overrideAccess: true })
      }
    }

    if (args.json) {
      console.log(JSON.stringify({ slug: args.slug, adminCollection, fixed: args.fix, ...result }, null, 2))
    } else {
      console.log('')
      console.log(formatReport({ slug: args.slug, adminCollection, result, fix: args.fix }).join('\n'))
      console.log('')
    }

    // A non-zero exit on a read-only run is what makes this usable from CI.
    if (!args.fix && result.orphans.length > 0) process.exitCode = 2
  } finally {
    if (typeof payload.destroy === 'function') await payload.destroy()
  }
}

// `--help` answers without a config, a database or the tsx round trip.
if (parseArgs(process.argv.slice(2)).help) {
  console.log(HELP)
} else if (process.env[BOOTSTRAP_FLAG] === '1') {
  await run()
} else {
  bootstrap()
}
