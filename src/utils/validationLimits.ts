/**
 * Runtime bounds shared by the validators and the endpoints.
 *
 * These used to live in `src/types.ts`, and that placement shipped a broken
 * package for three releases. `src/utils/security.ts` is emitted by the
 * `bundle: false` tsup pass, which preserves relative imports verbatim; it
 * imported `VALIDATION_LIMITS` — a *value* — from `../types.js`, but `types.ts`
 * is not in that pass's entry list, so `dist/types.js` never existed. Every
 * other importer of that module used `import type`, which TypeScript erases,
 * which is why nothing else broke and why the defect was invisible to `tsc`,
 * to the tests, and to the build itself. It surfaced only in a host
 * application's bundler, after publication.
 *
 * They live in their own module now, listed in that pass's entries, so the
 * emitted `dist/utils/security.js` resolves the import it actually makes.
 * `types.ts` re-exports the constant, so the public API is unchanged.
 */
export const VALIDATION_LIMITS = {
  maxWidgets: 20,
  maxWidgetTitleLength: 100,
  maxLayoutSize: 50_000,
  maxUrlLength: 2048,
  maxCssLength: 50_000,
  maxTextFieldLength: 500,
} as const
