'use client'

import { THEME_PRESETS, type ThemePreset } from '../styles/theme-presets.js'
import { isSafeCssValue } from './security.js'

/**
 * Runtime net for every value interpolated into the injected <style> tag.
 *
 * Field validation only covers what goes through Payload; a theme pasted into
 * ThemeMarketplace, or a row written before the validator existed, never meets
 * it. `containsDangerousCSS` already existed for exactly this and was called
 * from nowhere on this path.
 *
 * Returns the value when it is inert, `null` otherwise — callers drop the
 * declaration instead of shipping an escape sequence into the sheet.
 */
function safeCss(value: string | null | undefined): string | null {
  return isSafeCssValue(value) ? value : null
}

/**
 * Get a theme preset by ID. Returns null if not found.
 */
export function getThemeById(id: string): ThemePreset | null {
  return THEME_PRESETS.find((t) => t.id === id) || null
}

/**
 * Generate CSS overrides for a theme preset.
 * Replaces the --aup-* variables with the theme's colors.
 */
export function generateThemeCSS(theme: ThemePreset): string {
  const rawC = theme?.colors
  const rawD = theme?.dark
  if (!rawC || !rawD) return ''

  // ThemeMarketplace feeds this function arbitrary pasted JSON. One tampered
  // value is enough to escape the declaration and restyle the whole panel, so
  // the theme is taken as a whole or not at all.
  const values = [...Object.values(rawC), ...Object.values(rawD)]
  if (!values.every((v) => isSafeCssValue(v))) return ''

  const c = rawC
  const d = rawD

  // The colours are checked, the NAME was not — and it is interpolated into a
  // CSS comment. A `*/` inside a theme pasted into ThemeMarketplace closes the
  // comment early and hands the rest of the string to the parser. Reach is
  // limited (self-inflicted, own browser), the fix is one substitution.
  const name = String(theme.name ?? '').replace(/[*/<]/g, '')

  return `
/* Theme: ${name} — auto-generated */
:root,
[data-theme="light"] {
  --aup-accent: ${c.accent} !important;
  --aup-accent-hover: ${c.accentHover} !important;
  --aup-accent-subtle: ${c.accentSubtle} !important;
  --aup-accent-border: ${c.accentBorder} !important;
  --aup-green: ${c.green} !important;
  --aup-green-subtle: ${c.greenSubtle} !important;
  --aup-amber: ${c.amber} !important;
  --aup-amber-subtle: ${c.amberSubtle} !important;
  --aup-red: ${c.red} !important;
  --aup-red-subtle: ${c.redSubtle} !important;
  --aup-gradient-accent: ${c.gradientAccent} !important;
  --aup-gradient-mesh: ${c.gradientMesh} !important;
}

[data-theme="dark"] {
  --aup-accent: ${d.accent} !important;
  --aup-accent-subtle: ${d.accentSubtle} !important;
  --aup-accent-border: ${d.accentBorder} !important;
  --aup-green: ${d.green} !important;
  --aup-green-subtle: ${d.greenSubtle} !important;
  --aup-amber: ${d.amber} !important;
  --aup-amber-subtle: ${d.amberSubtle} !important;
  --aup-red: ${d.red} !important;
  --aup-red-subtle: ${d.redSubtle} !important;
  --aup-gradient-accent: linear-gradient(135deg, ${d.accent} 0%, ${c.accentHover} 100%) !important;
  --aup-gradient-mesh: radial-gradient(ellipse at 20% 50%, ${d.accent}15 0%, transparent 60%),
                       radial-gradient(ellipse at 80% 20%, ${c.accentHover}10 0%, transparent 50%) !important;
}

/* Nav accent override for this theme */
:root {
  --admin-nav-active-border: ${c.accent} !important;
  --admin-nav-active-bg: ${c.accentSubtle} !important;
  --admin-nav-active-text: ${c.accent} !important;
}
[data-theme="dark"] {
  --admin-nav-active-border: ${d.accent} !important;
  --admin-nav-active-bg: ${d.accentSubtle} !important;
  --admin-nav-active-text: ${d.accent} !important;
}

/* Toggle switches */
button[role="switch"][aria-checked="true"] {
  background-color: ${c.accent} !important;
}
[data-theme="dark"] button[role="switch"][aria-checked="true"] {
  background-color: ${d.accent} !important;
}
`
}

/**
 * Generate CSS for custom colors (when preset = 'custom').
 */
export function generateCustomCSS(accentInput: string, greenInput?: string, amberInput?: string, redInput?: string): string {
  // `theme.customAccent` used to be validated on its prefix alone, so
  // `hsl(1) } html { … } .x{` landed here and was interpolated verbatim into a
  // <style> tag present on every admin page. An unsafe accent kills the whole
  // custom theme; an unsafe secondary colour is simply dropped.
  const accent = safeCss(accentInput)
  if (!accent) return ''
  const green = safeCss(greenInput)
  const amber = safeCss(amberInput)
  const red = safeCss(redInput)

  // Generate subtle/border versions from the accent
  const subtle = accent.replace(')', ' / 0.12)')
  const border = accent.replace(')', ' / 0.28)')
  const hover = accent.replace(/(\d+)%\s*\)/, (_, l) => `${Math.max(0, parseInt(l) - 6)}%)`)

  return `
/* Custom theme — user-defined colors */
:root,
[data-theme="light"] {
  --aup-accent: ${accent} !important;
  --aup-accent-hover: ${hover} !important;
  --aup-accent-subtle: ${subtle} !important;
  --aup-accent-border: ${border} !important;
  ${green ? `--aup-green: ${green} !important; --aup-green-subtle: ${green.replace(')', ' / 0.12)')} !important;` : ''}
  ${amber ? `--aup-amber: ${amber} !important; --aup-amber-subtle: ${amber.replace(')', ' / 0.12)')} !important;` : ''}
  ${red ? `--aup-red: ${red} !important; --aup-red-subtle: ${red.replace(')', ' / 0.12)')} !important;` : ''}
  --aup-gradient-accent: linear-gradient(135deg, ${accent} 0%, ${hover} 100%) !important;
}

:root {
  --admin-nav-active-border: ${accent} !important;
  --admin-nav-active-bg: ${subtle} !important;
  --admin-nav-active-text: ${accent} !important;
}

button[role="switch"][aria-checked="true"] {
  background-color: ${accent} !important;
}
`
}

/**
 * Apply a theme by injecting/updating a <style> tag.
 */
export function applyTheme(settings: {
  theme?: { preset?: string | null; customAccent?: string | null; customGreen?: string | null; customAmber?: string | null; customRed?: string | null }
}): void {
  // La charte declaree dans le code du consommateur (`theme.preset` / `theme.accent`)
  // n'a pas a etre resolue ici : elle est posee en `defaultValue` sur les champs du
  // global (`createAdminUiProSettingsGlobal`), donc deja presente dans `settings` tant
  // que personne n'a rien choisi dans l'interface. Un choix explicite de l'utilisateur
  // ecrase naturellement ce defaut — c'est l'ordre voulu.
  const preset = settings?.theme?.preset || 'indigo-pro'

  let css = ''

  if (preset === 'custom') {
    const accent = settings?.theme?.customAccent
    if (accent) {
      css = generateCustomCSS(
        accent,
        settings?.theme?.customGreen || undefined,
        settings?.theme?.customAmber || undefined,
        settings?.theme?.customRed || undefined,
      )
    }
  } else {
    const theme = getThemeById(preset)
    if (theme) {
      css = generateThemeCSS(theme)
    }
  }

  if (!css) return

  // Inject or update the theme style tag
  let el = document.getElementById('aup-theme-override')
  if (!el) {
    el = document.createElement('style')
    el.id = 'aup-theme-override'
    document.head.appendChild(el)
  }
  el.textContent = css
}
