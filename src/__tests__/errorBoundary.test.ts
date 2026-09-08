import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { AupErrorBoundary, haveResetKeysChanged, withAupErrorBoundary } from '../utils/ErrorBoundary.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * `react-dom` is not a dependency of this package (react is a peer, react-dom
 * is not installed), so there is no renderer to mount a tree with. The boundary
 * is a class, though: its contract is entirely in `getDerivedStateFromError`,
 * `componentDidUpdate` and `render`, all callable directly.
 *
 * Each assertion below is written to FAIL against the component this replaces
 * (`utils/SafeProvider.tsx`), whose `render()` returned
 * `this.props.fallback ?? this.props.children ?? null`.
 */
describe('AupErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function makeBoundary(props: Record<string, unknown>) {
    const instance = new AupErrorBoundary(props as never)
    // React assigns this; we are instantiating by hand.
    instance.setState = ((updater: unknown) => {
      const next =
        typeof updater === 'function'
          ? (updater as (s: unknown) => object)(instance.state)
          : (updater as object)
      instance.state = { ...instance.state, ...next }
    }) as never
    return instance
  }

  it('renders its children while nothing has thrown', () => {
    const boundary = makeBoundary({ children: 'CHILD' })
    const output = boundary.render() as { props: { children: unknown } }
    expect(output.props.children).toBe('CHILD')
  })

  it('renders NOTHING once the children have thrown, never the children again', () => {
    // The defect being closed: replaying the subtree that just threw makes it
    // throw again, and React eventually unmounts the whole root.
    const boundary = makeBoundary({ children: 'CHILD' })
    boundary.state = { ...boundary.state, ...AupErrorBoundary.getDerivedStateFromError() }

    expect(boundary.render()).toBeNull()
  })

  it('renders the explicit fallback when one is given', () => {
    const boundary = makeBoundary({ children: 'CHILD', fallback: 'FALLBACK' })
    boundary.state = { ...boundary.state, ...AupErrorBoundary.getDerivedStateFromError() }

    expect(boundary.render()).toBe('FALLBACK')
  })

  it('reports the crash to the console with the component name', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const boundary = makeBoundary({ children: null, componentName: 'FaviconInjector' })

    boundary.componentDidCatch(new Error('boom'), { componentStack: '' } as never)

    expect(spy).toHaveBeenCalledOnce()
    expect(String(spy.mock.calls[0]![0])).toContain('FaviconInjector')
  })

  it('remounts the subtree on reset instead of resuming the instance that threw', () => {
    const boundary = makeBoundary({ children: 'CHILD' })
    const before = (boundary.render() as { key: string | null }).key

    boundary.state = { ...boundary.state, ...AupErrorBoundary.getDerivedStateFromError() }
    boundary.reset()

    const after = (boundary.render() as { key: string | null }).key
    expect(boundary.state.hasError).toBe(false)
    expect(after).not.toBe(before)
  })

  it('clears the error by itself when a reset key changes', () => {
    const boundary = makeBoundary({ children: 'CHILD', resetKeys: ['posts'] })
    boundary.state = { ...boundary.state, ...AupErrorBoundary.getDerivedStateFromError() }

    boundary.componentDidUpdate({ children: 'CHILD', resetKeys: ['posts'] })
    expect(boundary.state.hasError).toBe(true) // same keys — stays broken

    boundary.componentDidUpdate({ children: 'CHILD', resetKeys: ['media'] })
    expect(boundary.state.hasError).toBe(false)
  })

  it('never auto-resets a boundary declared without reset keys', () => {
    const boundary = makeBoundary({ children: 'CHILD' })
    boundary.state = { ...boundary.state, ...AupErrorBoundary.getDerivedStateFromError() }

    boundary.componentDidUpdate({ children: 'OTHER' })
    expect(boundary.state.hasError).toBe(true)
  })
})

describe('haveResetKeysChanged', () => {
  it('treats a missing array as empty', () => {
    expect(haveResetKeysChanged(undefined, undefined)).toBe(false)
    expect(haveResetKeysChanged(undefined, [])).toBe(false)
    expect(haveResetKeysChanged(undefined, ['a'])).toBe(true)
  })

  it('compares by identity, element by element', () => {
    expect(haveResetKeysChanged(['a', 1], ['a', 1])).toBe(false)
    expect(haveResetKeysChanged(['a', 1], ['a', 2])).toBe(true)
    expect(haveResetKeysChanged(['a'], ['a', 'b'])).toBe(true)
  })

  it('does not consider NaN a change', () => {
    expect(haveResetKeysChanged([NaN], [NaN])).toBe(false)
  })
})

describe('withAupErrorBoundary', () => {
  it('returns an element whose root is the boundary, with the inner as child', () => {
    const Inner: React.FC<{ label: string }> = () => null
    const Wrapped = withAupErrorBoundary(Inner, 'Inner')

    const element = Wrapped({ label: 'x' }) as unknown as {
      type: unknown
      props: { componentName: string; fallback: unknown; children: { type: unknown; props: unknown } }
    }

    expect(element.type).toBe(AupErrorBoundary)
    expect(element.props.componentName).toBe('Inner')
    expect(element.props.fallback).toBeNull()
    expect(element.props.children.type).toBe(Inner)
    expect(element.props.children.props).toEqual({ label: 'x' })
  })
})

/**
 * Source guard. The wiring — which module wraps which export — is what makes
 * the boundary useful, and it is exactly what a refactor silently drops. These
 * are the slots where a throw is not a cosmetic problem: `providers` and
 * `beforeLogin` take down the whole panel or lock everybody out of it, list
 * cells take down a whole table.
 */
describe('components mounted from the import map are wrapped', () => {
  const WRAPPED: Array<[string, string[]]> = [
    ['modules/quick-actions/CommandPaletteProvider.tsx', ['CommandPaletteProvider']],
    ['modules/branding/FaviconInjector.tsx', ['FaviconInjector']],
    ['modules/branding/DarkModeToggle.tsx', ['DarkModeToggle']],
    ['modules/list-views/ListViewsInitializer.tsx', ['ListViewsInitializer']],
    ['modules/list-views/CustomListViewWrapper.tsx', ['CustomListViewWrapper']],
    ['modules/field-enhance/ToggleField.tsx', ['ToggleField']],
    ['modules/field-enhance/StatusBadgeField.tsx', ['StatusBadgeField', 'StatusBadgeCell']],
    ['modules/field-enhance/ImagePreviewField.tsx', ['ImagePreviewField']],
    ['modules/field-enhance/RatingField.tsx', ['RatingField']],
    ['modules/field-enhance/RelationCardField.tsx', ['RelationCardField']],
    ['modules/activity/DocumentTimeline.tsx', ['DocumentTimeline']],
    ['modules/activity/PresenceIndicator.tsx', ['PresenceIndicator']],
    ['modules/activity/VersionDiff.tsx', ['VersionDiff']],
    ['modules/activity/NotificationBell.tsx', ['NotificationBell']],
  ]

  for (const [rel, exports] of WRAPPED) {
    it(`${rel} exports through the boundary`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8')
      expect(src).toContain("from '../../utils/ErrorBoundary.js'")
      for (const name of exports) {
        expect(src).toContain(`export const ${name} = withAupErrorBoundary(${name}Inner, '${name}')`)
      }
    })
  }

  it('LoginBackground keeps its own boundary — beforeLogin is the lock-out slot', () => {
    const src = readFileSync(join(ROOT, 'modules/branding/LoginBackground.tsx'), 'utf8')
    expect(src).toContain('AupErrorBoundary')
    expect(src).toContain('componentName="LoginBackground"')
    // Its fallback is the host's own children, not the subtree that threw.
    expect(src).toContain('fallback={<>{children}</>}')
  })

  it('the dead SafeProvider is gone, not merely unused', () => {
    expect(() => readFileSync(join(ROOT, 'utils/SafeProvider.tsx'), 'utf8')).toThrow()
  })

  it('the boundary ships as its own client entry', () => {
    const tsup = readFileSync(join(ROOT, '..', 'tsup.config.ts'), 'utf8')
    // bundle:false — an entry that is not listed is never emitted, and every
    // wrapped module imports it by relative path at runtime.
    expect(tsup).toContain("'src/utils/ErrorBoundary.tsx'")
  })
})
