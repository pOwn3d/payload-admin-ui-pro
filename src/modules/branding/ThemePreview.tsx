'use client'

import React, { useEffect, useState } from 'react'
import { THEME_PRESETS, type ThemePreset } from '../../styles/theme-presets.js'
import { applyTheme } from '../../utils/themeApplier.js'
import { useAupT } from '../../utils/useTranslation.js'

/**
 * Theme preview component — shows a live color preview of the selected theme.
 * Injected as a UI field in the settings global.
 * Reads the current preset selection from the form.
 */
export const ThemePreview: React.FC = () => {
  const t = useAupT()
  const [theme, setTheme] = useState<ThemePreset | null>(null)

  useEffect(() => {
    // Watch for changes to the theme preset select
    const checkPreset = () => {
      // Read from the select element in the form
      const selectEl = document.querySelector('[name="theme.preset"]') as HTMLSelectElement | null
      // Payload uses react-select, so read from the displayed value
      const displayValue = document.querySelector('[id*="theme"] [class*="singleValue"]')
      const presetText = displayValue?.textContent?.trim() || selectEl?.value

      if (presetText) {
        // Find the preset by name or id
        const found = THEME_PRESETS.find(
          (t) => t.name === presetText || t.nameFr === presetText || t.id === presetText,
        )
        if (found && found.id !== theme?.id) {
          setTheme(found)
          // Apply theme live without saving
          applyTheme({ theme: { preset: found.id } })
        }
      }
    }

    checkPreset()
    // Re-check every 500ms to catch select changes
    const interval = setInterval(checkPreset, 500)
    return () => clearInterval(interval)
  }, [theme?.id])

  if (!theme) return null

  const c = theme.colors

  return (
    <div style={containerStyle}>
      {/* Theme name + description */}
      <div style={headerStyle}>
        <h4 style={nameStyle}>{theme.name}</h4>
        <p style={descStyle}>{theme.description}</p>
      </div>

      {/* Color swatches */}
      <div style={swatchRowStyle}>
        <Swatch color={c.accent} label="Accent" />
        <Swatch color={c.green} label="Success" />
        <Swatch color={c.amber} label="Warning" />
        <Swatch color={c.red} label="Danger" />
      </div>

      {/* Mini preview */}
      <div style={previewStyle}>
        {/* Mini sidebar */}
        <div style={{ ...miniSidebarStyle, borderColor: c.accentBorder }}>
          <div style={{ ...miniNavItemStyle, backgroundColor: c.accentSubtle, borderLeftColor: c.accent, color: c.accent }}>Dashboard</div>
          <div style={miniNavItemInactiveStyle}>Pages</div>
          <div style={miniNavItemInactiveStyle}>Posts</div>
        </div>

        {/* Mini content */}
        <div style={miniContentStyle}>
          {/* Mini button */}
          <div style={{ ...miniButtonStyle, background: c.gradientAccent }}>Save</div>
          {/* Mini badges */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            <span style={{ ...miniBadgeStyle, backgroundColor: c.greenSubtle, color: c.green }}>published</span>
            <span style={{ ...miniBadgeStyle, backgroundColor: c.amberSubtle, color: c.amber }}>draft</span>
            <span style={{ ...miniBadgeStyle, backgroundColor: c.redSubtle, color: c.red }}>error</span>
          </div>
        </div>
      </div>

      {/* Login gradient preview */}
      <div style={{
        height: '60px',
        borderRadius: '12px',
        background: theme.login.background,
        marginTop: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}>
        <span style={{ fontSize: '13px', color: theme.login.textColor, fontWeight: 600, opacity: 0.85, letterSpacing: '0.03em' }}>{t('loginPage')}</span>
      </div>
    </div>
  )
}

const Swatch: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
    <div style={{
      width: '44px', height: '44px', borderRadius: '10px',
      backgroundColor: color, border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
    }} />
    <span style={{ fontSize: '11px', color: 'var(--theme-elevation-500)', fontWeight: 600 }}>{label}</span>
  </div>
)

const containerStyle: React.CSSProperties = {
  padding: '24px',
  borderRadius: '16px',
  border: '1px solid var(--theme-elevation-150)',
  backgroundColor: 'var(--theme-elevation-50)',
  marginBottom: '20px',
}

const headerStyle: React.CSSProperties = {
  marginBottom: '12px',
}

const nameStyle: React.CSSProperties = {
  margin: '0 0 6px', fontSize: '18px', fontWeight: 700, color: 'var(--theme-text)',
}

const descStyle: React.CSSProperties = {
  margin: 0, fontSize: '13px', color: 'var(--theme-elevation-500)', lineHeight: 1.5,
}

const swatchRowStyle: React.CSSProperties = {
  display: 'flex', gap: '16px', marginBottom: '20px',
}

const previewStyle: React.CSSProperties = {
  display: 'flex', gap: '10px', height: '120px',
  borderRadius: '12px', overflow: 'hidden',
  border: '1px solid var(--theme-elevation-150)',
  backgroundColor: 'var(--theme-elevation-0)',
}

const miniSidebarStyle: React.CSSProperties = {
  width: '120px', padding: '10px',
  borderRight: '1px solid var(--theme-elevation-100)',
  display: 'flex', flexDirection: 'column', gap: '4px',
  fontSize: '11px',
}

const miniNavItemStyle: React.CSSProperties = {
  padding: '5px 8px', borderRadius: '6px',
  borderLeft: '3px solid', fontWeight: 600, fontSize: '11px',
}

const miniNavItemInactiveStyle: React.CSSProperties = {
  padding: '5px 8px', fontSize: '11px',
  color: 'var(--theme-elevation-500)',
}

const miniContentStyle: React.CSSProperties = {
  flex: 1, padding: '12px', display: 'flex', flexDirection: 'column',
}

const miniButtonStyle: React.CSSProperties = {
  padding: '6px 16px', borderRadius: '8px',
  color: '#fff', fontSize: '12px', fontWeight: 600,
  width: 'fit-content',
}

const miniBadgeStyle: React.CSSProperties = {
  padding: '2px 8px', borderRadius: '9999px',
  fontSize: '10px', fontWeight: 600,
}
