// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { FOCUSABLE_SELECTOR, getFocusable, nextFocusTarget } from '../utils/dialogA11y.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function mount(html: string): HTMLElement {
  document.body.innerHTML = `<div id="dialog">${html}</div>`
  return document.getElementById('dialog')!
}

describe('getFocusable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('returns the focusable descendants in document order', () => {
    const dialog = mount(`
      <h2>Title</h2>
      <input id="one" />
      <button id="two">Go</button>
      <a id="three" href="/x">Link</a>
    `)

    expect(getFocusable(dialog).map((e) => e.id)).toEqual(['one', 'two', 'three'])
  })

  it('skips disabled controls', () => {
    // A trap that lands on a disabled button is a trap the user cannot leave:
    // the browser will not focus it, so the next Tab is swallowed.
    const dialog = mount(`
      <button id="ok">Ok</button>
      <button id="nope" disabled>Apply</button>
    `)

    expect(getFocusable(dialog).map((e) => e.id)).toEqual(['ok'])
  })

  it('skips tabIndex={-1} containers and aria-hidden subtrees', () => {
    const dialog = mount(`
      <div id="wrapper" tabindex="-1"><button id="ok">Ok</button></div>
      <button id="ghost" aria-hidden="true">Ghost</button>
      <button id="gone" hidden>Gone</button>
    `)

    expect(getFocusable(dialog).map((e) => e.id)).toEqual(['ok'])
  })

  it('returns nothing for a missing container', () => {
    expect(getFocusable(null)).toEqual([])
    expect(getFocusable(undefined)).toEqual([])
  })

  it('does not rely on offsetParent — these dialogs are position: fixed', () => {
    // jsdom reports offsetParent as null for everything, and so does a real
    // browser for a fixed-position element: using it as the visibility test
    // would have emptied the trap on every one of these dialogs.
    expect(FOCUSABLE_SELECTOR).not.toContain('offsetParent')
    const dialog = mount('<button id="only" style="position:fixed">Ok</button>')
    expect(getFocusable(dialog).map((e) => e.id)).toEqual(['only'])
  })
})

describe('nextFocusTarget', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  function ring() {
    const dialog = mount('<button id="a">A</button><button id="b">B</button><button id="c">C</button>')
    return getFocusable(dialog)
  }

  it('wraps from the last element to the first on Tab', () => {
    const focusable = ring()
    expect(nextFocusTarget(focusable, focusable[2]!, false)?.id).toBe('a')
  })

  it('wraps from the first element to the last on Shift+Tab', () => {
    const focusable = ring()
    expect(nextFocusTarget(focusable, focusable[0]!, true)?.id).toBe('c')
  })

  it('leaves the browser alone in the middle of the ring', () => {
    // Intercepting every Tab would break the internal order of composite
    // widgets; only the two ends need help.
    const focusable = ring()
    expect(nextFocusTarget(focusable, focusable[1]!, false)).toBeNull()
    expect(nextFocusTarget(focusable, focusable[1]!, true)).toBeNull()
  })

  it('pulls focus back in when it has escaped the dialog', () => {
    const focusable = ring()
    const outside = document.createElement('button')
    document.body.appendChild(outside)

    expect(nextFocusTarget(focusable, outside, false)?.id).toBe('a')
    expect(nextFocusTarget(focusable, outside, true)?.id).toBe('c')
    expect(nextFocusTarget(focusable, null, false)?.id).toBe('a')
  })

  it('has nothing to do in an empty dialog', () => {
    expect(nextFocusTarget([], document.body, false)).toBeNull()
  })
})

/**
 * The five dialogs all declared `role="dialog"` and stopped there — no
 * `aria-modal`, no containment, no focus restoration, and Escape on one of the
 * five. This guards the wiring; the behaviour itself is covered above.
 */
describe('every dialog is a real modal', () => {
  const DIALOGS: Array<[string, string]> = [
    ['modules/branding/OnboardingWizard.tsx', 'Onboarding'],
    ['modules/list-views/GalleryListView.tsx', 'Image preview'],
    ['modules/list-views/BulkEditModal.tsx', "t('bulkEditTitle')"],
    ['modules/quick-actions/KeyboardShortcuts.tsx', 'Keyboard shortcuts'],
    ['modules/quick-actions/CommandPalette.tsx', 'Command palette'],
  ]

  for (const [rel, label] of DIALOGS) {
    it(`${rel} declares aria-modal and installs the hook`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8')

      expect(src).toContain('aria-modal="true"')
      expect(src).toContain("from '../../utils/dialogA11y.js'")
      expect(src).toContain('useDialogA11y({')
      expect(src).toContain(label)
    })
  }

  it('the palette keeps its own initial focus instead of fighting the hook', () => {
    const src = readFileSync(join(ROOT, 'modules/quick-actions/CommandPalette.tsx'), 'utf8')
    expect(src).toContain('autoFocus: false')
  })

  it('the gallery opens its lightbox from a button, not from an image', () => {
    const src = readFileSync(join(ROOT, 'modules/list-views/GalleryListView.tsx'), 'utf8')

    // An <img onClick> inside an <a> takes no focus and answers no key.
    // Comments are stripped first — the explanation in the source names the
    // very construct being forbidden.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    // Lazy, and stopped at the tag's own `/>`, so it cannot run past the element.
    expect(code).not.toMatch(/<img(?:(?!\/>)[\s\S])*?onClick/)
    expect(src).toContain('style={imageButtonStyle}')
    expect(src).toContain('aria-label={`Preview ${alt}`}')
  })

  it('the hook ships as its own client entry', () => {
    const tsup = readFileSync(join(ROOT, '..', 'tsup.config.ts'), 'utf8')
    // bundle:false — an unlisted entry is never emitted, and five modules
    // import it by relative path at runtime.
    expect(tsup).toContain("'src/utils/dialogA11y.ts'")
  })
})
