import { describe, it, expect } from 'vitest'
import { translations } from '../translations/index.js'
import { AUP_CLIENT_TRANSLATIONS } from '../utils/useTranslation.js'

const NAMESPACE = 'plugin-admin-ui-pro'
const LOCALES = ['en', 'fr', 'de', 'es', 'it', 'pt', 'ja'] as const

describe('client dictionaries (useAupT)', () => {
  const en = Object.keys(AUP_CLIENT_TRANSLATIONS.en!).sort()

  it('ships the seven advertised locales', () => {
    expect(Object.keys(AUP_CLIENT_TRANSLATIONS).sort()).toEqual([...LOCALES].sort())
  })

  for (const locale of LOCALES) {
    it(`${locale} has exactly the same keys as en`, () => {
      // Regression: de/es/it/pt/ja were each missing the same six keys
      // (welcome*Desc, plugins*), which silently rendered in English.
      expect(Object.keys(AUP_CLIENT_TRANSLATIONS[locale]!).sort()).toEqual(en)
    })

    it(`${locale} has no empty string`, () => {
      const empty = Object.entries(AUP_CLIENT_TRANSLATIONS[locale]!)
        .filter(([, v]) => !v || !v.trim())
        .map(([k]) => k)
      expect(empty).toEqual([])
    })
  }

  it('keeps the same {{placeholders}} in every locale', () => {
    const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort()
    for (const locale of LOCALES) {
      for (const key of en) {
        expect(
          placeholders(AUP_CLIENT_TRANSLATIONS[locale]![key]!),
          `${locale}.${key}`,
        ).toEqual(placeholders(AUP_CLIENT_TRANSLATIONS.en![key]!))
      }
    }
  })
})

describe('server dictionaries (Payload i18n)', () => {
  const en = Object.keys((translations as any).en[NAMESPACE]).sort()

  it('ships the seven advertised locales', () => {
    expect(Object.keys(translations).sort()).toEqual([...LOCALES].sort())
  })

  for (const locale of LOCALES) {
    it(`${locale} has exactly the same keys as en`, () => {
      expect(Object.keys((translations as any)[locale][NAMESPACE]).sort()).toEqual(en)
    })
  }
})
