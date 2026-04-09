'use client'

import { useEffect, useState } from 'react'
import { fetchSettings } from '../../utils/settingsCache.js'
import { getThemeById } from '../../utils/themeApplier.js'

interface LoginSettings {
  loginBackground: string | null
  loginLayout: 'center' | 'split'
  welcomeMessage: string | null
  loginFooter: string | null
}

/**
 * Client component injected via beforeLogin.
 * Applies background gradient and glassmorphism to the login page
 * entirely via CSS overrides — no child divs (which break under backdrop-filter).
 */
export const LoginBackground: React.FC = () => {
  const [settings, setSettings] = useState<LoginSettings | null>(null)

  useEffect(() => {
    let mounted = true

    // Read fallback config from data-attribute
    const el = document.querySelector('[data-branding-config]')
    if (el) {
      try {
        const fallback = JSON.parse(el.getAttribute('data-branding-config') || '{}')
        if (mounted && (fallback.loginBackground || fallback.welcomeMessage)) {
          setSettings({
            loginBackground: fallback.loginBackground || null,
            loginLayout: fallback.loginLayout || 'center',
            welcomeMessage: fallback.welcomeMessage || null,
            loginFooter: fallback.loginFooter || null,
          })
        }
      } catch { /* ignore */ }
    }

    // Fetch from global settings + apply theme login gradient
    fetchSettings().then((data) => {
      if (!mounted) return

      // Get the login gradient from the selected theme (fallback)
      let themeLoginBg: string | null = null
      if (data?.theme?.preset && data.theme.preset !== 'custom') {
        const theme = getThemeById(data.theme.preset)
        if (theme) themeLoginBg = theme.login.background
      }

      if (data?.branding) {
        const b = data.branding
        setSettings((prev) => ({
          loginBackground: b.loginBackground || prev?.loginBackground || themeLoginBg || null,
          loginLayout: b.loginLayout || 'center',
          welcomeMessage: b.welcomeMessage || prev?.welcomeMessage || null,
          loginFooter: b.loginFooter || prev?.loginFooter || null,
        }))
      } else if (themeLoginBg) {
        // No branding config but theme has a login gradient
        setSettings((prev) => prev || {
          loginBackground: themeLoginBg,
          loginLayout: 'center',
          welcomeMessage: null,
          loginFooter: null,
        })
      }
    })

    return () => { mounted = false }
  }, [])

  if (!settings) return null

  const hasBackground = settings.loginBackground && settings.loginBackground.length > 0
  const isSplit = settings.loginLayout === 'split'
  const isGrad = hasBackground && isGradient(settings.loginBackground!)
  const bg = settings.loginBackground || ''

  return (
    <>
      {/* Welcome message */}
      {settings.welcomeMessage && (
        <div style={{ textAlign: 'center', marginBottom: '0.75rem', position: 'relative', zIndex: 2 }}>
          <p style={{
            fontSize: '1.125rem', fontWeight: 600, margin: 0, letterSpacing: '-0.01em',
            color: hasBackground && !isSplit ? 'hsla(0,0%,100%,0.90)' : 'var(--theme-elevation-800)',
            textShadow: hasBackground && !isSplit ? '0 2px 8px hsla(0,0%,0%,0.3)' : 'none',
          }}>
            {settings.welcomeMessage}
          </p>
        </div>
      )}

      {/* Footer text */}
      {settings.loginFooter && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem', position: 'relative', zIndex: 2 }}>
          <p style={{
            fontSize: '0.8125rem', margin: 0,
            color: hasBackground && !isSplit ? 'hsla(0,0%,100%,0.6)' : 'var(--theme-elevation-500)',
          }}>
            {settings.loginFooter}
          </p>
        </div>
      )}

      {/*
        ALL visual styling via CSS — no positioned child divs.
        The gradient goes on .template-minimal via ::before pseudo-element.
        The card glassmorphism goes on .template-minimal__wrap.
        This avoids the backdrop-filter breaking position:fixed children.
      */}
      <style>{`
        ${hasBackground && !isSplit ? `
          /* === FULL GRADIENT BACKGROUND === */
          /* Background on the section itself via ::before */
          .template-minimal {
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 100vh !important;
            background: transparent !important;
            overflow: hidden !important;
          }
          .template-minimal::before {
            content: '' !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 0 !important;
            ${isGrad ? `background: ${bg} !important;` : `
              background-image: url(${bg}) !important;
              background-size: cover !important;
              background-position: center !important;
            `}
          }
          /* Grid overlay for gradient */
          ${isGrad ? `
          .template-minimal::after {
            content: '' !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 0 !important;
            background-image:
              linear-gradient(hsla(250,84%,80%,0.04) 1px, transparent 1px),
              linear-gradient(90deg, hsla(250,84%,80%,0.04) 1px, transparent 1px) !important;
            background-size: 40px 40px !important;
            pointer-events: none !important;
          }` : ''}

          /* Form wrapper — glassmorphism card */
          .template-minimal__wrap {
            position: relative !important;
            z-index: 1 !important;
            background: hsla(0, 0%, 100%, 0.08) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            border: 1px solid hsla(250, 84%, 80%, 0.15) !important;
            border-radius: 24px !important;
            box-shadow: 0 20px 50px hsla(250, 40%, 4%, 0.50) !important;
            padding: 2.5rem !important;
          }

          /* Logo — force white */
          .login__brand,
          .graphic-logo {
            filter: brightness(0) invert(1) !important;
          }
          .graphic-logo path {
            fill: #ffffff !important;
          }

          /* Labels */
          .field-label,
          .login label,
          .template-minimal label {
            color: hsla(0, 0%, 100%, 0.85) !important;
          }

          /* Inputs */
          .login__form__inputWrap input,
          .template-minimal input,
          .field-type input {
            background: hsla(0, 0%, 100%, 0.10) !important;
            border: 1px solid hsla(250, 84%, 80%, 0.20) !important;
            color: #ffffff !important;
            border-radius: 10px !important;
          }
          .template-minimal input:focus,
          .login__form__inputWrap input:focus {
            border-color: hsla(250, 84%, 70%, 0.50) !important;
            box-shadow: 0 0 0 3px hsla(250, 84%, 60%, 0.20) !important;
          }
          .template-minimal input::placeholder {
            color: hsla(250, 60%, 85%, 0.40) !important;
          }

          /* Submit button */
          .form-submit .btn,
          .btn--style-primary {
            background: linear-gradient(135deg, hsl(250,84%,60%) 0%, hsl(280,72%,58%) 100%) !important;
            border: none !important;
            border-radius: 12px !important;
            color: #ffffff !important;
            font-weight: 600 !important;
            box-shadow: 0 4px 16px hsla(250, 84%, 40%, 0.40) !important;
          }
          .form-submit .btn:hover,
          .btn--style-primary:hover {
            box-shadow: 0 6px 20px hsla(250, 84%, 40%, 0.55) !important;
            transform: translateY(-1px) !important;
          }

          /* Links */
          .login a,
          .template-minimal a {
            color: hsla(250, 80%, 80%, 0.80) !important;
          }
          .login a:hover,
          .template-minimal a:hover {
            color: #ffffff !important;
          }

          /* All text in the login area should be white */
          .template-minimal__wrap,
          .template-minimal__wrap * {
            color: hsla(0, 0%, 100%, 0.85) !important;
          }
          .template-minimal__wrap strong,
          .template-minimal__wrap b,
          .template-minimal__wrap h1,
          .template-minimal__wrap h2,
          .template-minimal__wrap h3 {
            color: #ffffff !important;
          }

          /* Background gradient covers entire viewport */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            min-height: 100vh !important;
            background: ${bg} !important;
            background-attachment: fixed !important;
          }
        ` : ''}

        ${isSplit && hasBackground ? `
          .template-minimal {
            position: relative !important;
          }
          .template-minimal::before {
            content: '' !important;
            position: fixed !important;
            top: 0 !important; left: 0 !important; bottom: 0 !important;
            width: 50% !important;
            z-index: 0 !important;
            ${isGrad ? `background: ${bg} !important;` : `
              background-image: url(${bg}) !important;
              background-size: cover !important;
              background-position: center !important;
            `}
          }
          .template-minimal__wrap {
            margin-left: auto !important;
            margin-right: 0 !important;
            max-width: 50% !important;
            padding: 2rem 3rem !important;
            position: relative !important;
            z-index: 1 !important;
          }
          @media (max-width: 768px) {
            .template-minimal__wrap {
              max-width: 100% !important;
              padding: 1.5rem !important;
            }
          }
        ` : ''}
      `}</style>
    </>
  )
}

function isGradient(value: string): boolean {
  return /^(linear|radial|conic|repeating-)/i.test(value)
}
