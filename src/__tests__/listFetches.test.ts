import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Source-level guard.
 *
 * These fetches live inside `useEffect` bodies of client components, so there is
 * no seam to assert on without pulling a DOM renderer into the test suite. The
 * defect being guarded is textual anyway: a `/api/<slug>?limit=N` on the /admin
 * load path that forgets `select[...]` pulls whole documents — a Lexical body is
 * 40-50 KB — to render a line of text.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const PAGE_LOAD_FETCHES = [
  'modules/dashboard/widgets/RecentActivityWidget.tsx',
  'modules/dashboard/widgets/CollectionOverviewWidget.tsx',
  'modules/dashboard/widgets/ChartWidget.tsx',
  'modules/quick-actions/CommandPalette.tsx',
]

function source(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8')
}

/** Comments explain the trap; only real code must be free of it. */
function code(rel: string): string {
  return source(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
    .join('\n')
}

describe('list fetches on the /admin load path', () => {
  for (const rel of PAGE_LOAD_FETCHES) {
    it(`${rel} restricts the fields it asks for`, () => {
      expect(source(rel)).toContain('select[')
    })
  }

  it('no widget asks for limit=0', () => {
    // Payload reads limit=0 as "disable pagination" and returns every row.
    for (const rel of PAGE_LOAD_FETCHES.concat('modules/dashboard/widgets/StatsWidget.tsx')) {
      expect(code(rel), rel).not.toContain('limit=0')
    }
  })

  it('the CSV export deliberately keeps fetching whole documents', () => {
    // Not an oversight: ExportButton derives its columns from whatever scalar
    // fields the documents carry, so a select whitelist would silently drop
    // columns from every export.
    expect(code('modules/list-views/ExportButton.tsx')).not.toContain('select[')
  })
})
