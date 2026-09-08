import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { AUP_CLIENT_TRANSLATIONS } from '../utils/useTranslation.js'
import { DESIGN_TOKENS_CSS } from '../styles/tokens.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function source(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8')
}

/**
 * Under EAA/RGAA a control with no accessible name is a hard stop for a screen
 * reader user — it is announced as "edit text" with nothing to say what it
 * edits. These twelve inputs, textareas and selects had no `<label>`, no
 * `aria-label` and no `aria-labelledby`; only a `placeholder`, which is not a
 * name (it disappears as soon as the field has content).
 *
 * The check is textual because these live inside `useEffect`-driven client
 * components and `react-dom` is not installed here — but it fails on the state
 * of the tree before the fix, which is what a guard is for.
 */
const NAMED_CONTROLS: Array<[string, string]> = [
  ['modules/branding/ExportImportUI.tsx', "aria-label={t('importConfig')}"],
  ['modules/branding/ThemeMarketplace.tsx', "aria-label={t('themePasteHere')}"],
  ['modules/branding/MenuEditor.tsx', "aria-label={t('menuEditorRename')}"],
  ['modules/list-views/SavedFilters.tsx', "aria-label={t('filterName')}"],
  ['modules/list-views/SavedViews.tsx', "aria-label={t('viewName')}"],
  ['modules/list-views/BulkEditModal.tsx', "aria-label={t('fieldName')}"],
  ['modules/list-views/BulkEditModal.tsx', "aria-label={t('fieldValue')}"],
  ['modules/list-views/BulkActionBar.tsx', "aria-label={t('bulkStatusChange')}"],
  ['modules/dashboard/widgets/NotesWidget.tsx', "aria-label={t('notesPlaceholder')}"],
  ['modules/quick-actions/CommandPalette.tsx', "aria-label={t('searchPlaceholder')}"],
]

describe('form controls carry an accessible name', () => {
  for (const [rel, attribute] of NAMED_CONTROLS) {
    it(`${rel} — ${attribute}`, () => {
      expect(source(rel)).toContain(attribute)
    })
  }

  it('InlineEditCell names both of its editors after the field being edited', () => {
    const src = source('modules/list-views/InlineEditCell.tsx')
    // One on the <select> branch, one on the <input> branch.
    expect(src.split('aria-label={fieldName}').length - 1).toBe(2)
  })

  it('every aria-label key it uses is actually translated', () => {
    const en = AUP_CLIENT_TRANSLATIONS.en!
    const keys = new Set<string>()
    for (const [rel] of NAMED_CONTROLS) {
      for (const match of source(rel).matchAll(/aria-label=\{t\('([A-Za-z0-9_]+)'\)\}/g)) {
        keys.add(match[1]!)
      }
    }
    // A missing key makes useAupT return the key itself, so the screen reader
    // would announce "notesPlaceholder" — the failure mode this guards.
    expect([...keys].filter((k) => !(k in en))).toEqual([])
  })
})

describe('ToggleField switch', () => {
  const src = source('modules/field-enhance/ToggleField.tsx')

  it('binds its label to the switch instead of leaving it floating', () => {
    // `role="switch"` + `aria-checked` were already right; the button simply
    // had no name, because the <label> next to it was bound to nothing.
    expect(src).toContain('aria-labelledby={label ? labelId : undefined}')
    expect(src).toContain('<label id={labelId} htmlFor={reactId}')
    expect(src).toContain('id={reactId}')
  })

  it('derives its ids from useId, never from a literal', () => {
    // The component renders once per enhanced checkbox and once per language
    // tab on a localised collection; a hardcoded id would collide.
    expect(src).toContain('const reactId = useId()')
    expect(src).not.toMatch(/id="[a-z-]+"/)
  })
})

describe('RatingField is left alone', () => {
  it('already exposes a named radiogroup', () => {
    const src = source('modules/field-enhance/RatingField.tsx')
    expect(src).toContain('role="radiogroup"')
    expect(src).toContain('role="radio"')
  })
})

/**
 * `DESIGN_TOKENS_CSS` is injected into the WHOLE admin panel by FaviconInjector
 * (afterNavLinks, so every page including the login form), and its focus rule
 * carries `outline: none !important`. Suppressing the browser outline is only
 * defensible if what replaces it is at least as visible: WCAG 1.4.11 asks 3:1
 * against the adjacent background.
 */
describe('focus indicator', () => {
  const css = DESIGN_TOKENS_CSS

  function focusRule(): string {
    const start = css.indexOf('input:focus')
    expect(start).toBeGreaterThan(-1)
    const end = css.indexOf('}', start)
    return css.slice(start, end)
  }

  it('suppresses the native outline only alongside a replacement ring', () => {
    const rule = focusRule()
    expect(rule).toContain('outline: none !important')
    expect(rule).toContain('box-shadow: 0 0 0 2px var(--aup-focus-ring)')
  })

  it('does not reuse the hover wash as the focus ring', () => {
    // --aup-accent-subtle is 12 % — 1.19:1 on white, invisible as an indicator.
    expect(focusRule()).not.toContain('--aup-accent-subtle')
  })

  it('declares --aup-focus-ring in both themes, above 0.45 opacity', () => {
    const declarations = [...css.matchAll(/--aup-focus-ring:\s*hsl\([^)]*\/\s*([0-9.]+)\)/g)]
    expect(declarations).toHaveLength(2) // light + dark
    for (const declaration of declarations) {
      expect(Number(declaration[1])).toBeGreaterThanOrEqual(0.7)
    }
  })

  it('leaves the hover token itself untouched', () => {
    // Raising it would have made every hovered row and card glaring: it is used
    // as a background wash in a dozen other rules.
    expect(css).toContain('--aup-accent-subtle: hsl(250, 84%, 60% / 0.12)')
    expect(css).toContain('--aup-accent-subtle: hsl(250, 84%, 68% / 0.15)')
  })
})
