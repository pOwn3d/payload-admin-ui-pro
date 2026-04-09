'use client'

import { THEME_PRESETS, type ThemePreset } from '../styles/theme-presets.js'

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
  const c = theme.colors
  const d = theme.dark
  const l = theme.login

  return `
/* Theme: ${theme.name} — auto-generated */
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
}

/* Nav accent override for this theme */
:root {
  --admin-nav-active-border: ${c.accent} !important;
  --admin-nav-active-bg: ${c.accentSubtle} !important;
  --admin-nav-active-text: ${c.accent} !important;
}

/* Toggle switches */
button[role="switch"][aria-checked="true"] {
  background-color: ${c.accent} !important;
}
`
}

/**
 * Generate CSS for custom colors (when preset = 'custom').
 */
export function generateCustomCSS(accent: string, green?: string, amber?: string, red?: string): string {
  if (!accent) return ''

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
