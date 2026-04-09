'use client'

import { useEffect, useState } from 'react'
import { fetchSettings } from '../../utils/settingsCache.js'
import { getThemeById } from '../../utils/themeApplier.js'

interface LoginSettings {
  loginBackground: string | null
  loginLayout: 'center' | 'split'
  welcomeMessage: string | null
  loginFooter: string | null
  loginIntroText: string | null
}

/**
 * Client component injected via beforeLogin.
 * Applies background gradient and glassmorphism to the login page
 * entirely via CSS overrides — no child divs (which break under backdrop-filter).
 */
export const LoginBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
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
            loginIntroText: fallback.loginIntroText || null,
          })
        }
      } catch { /* ignore */ }
    }

    // Fetch from global settings directly (bypass cache — login page needs fresh data)
    fetch('/api/globals/aup-settings', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data: any) => {
      if (!mounted) return

      // Get the login gradient from the selected theme (fallback)
      let themeLoginBg: string | null = null
      if (data?.theme?.preset && data.theme.preset !== 'custom') {
        const theme = getThemeById(data.theme.preset)
        if (theme) themeLoginBg = theme.login.background
      }

      if (data?.branding) {
        const b = data.branding
        // Theme login gradient takes priority over the default config value
        setSettings((prev) => ({
          loginBackground: themeLoginBg || b.loginBackground || prev?.loginBackground || null,
          loginLayout: b.loginLayout || 'center',
          welcomeMessage: b.welcomeMessage || prev?.welcomeMessage || null,
          loginFooter: b.loginFooter || prev?.loginFooter || null,
          loginIntroText: b.loginIntroText || prev?.loginIntroText || null,
        }))
      } else if (themeLoginBg) {
        // No branding config but theme has a login gradient
        setSettings((prev) => prev || {
          loginBackground: themeLoginBg,
          loginLayout: 'center',
          welcomeMessage: null,
          loginFooter: null,
          loginIntroText: null,
        })
      }

      // Replace logo on auth pages
      if (data?.brand?.logoUrl) {
        const logoSvgs = document.querySelectorAll('.graphic-logo')
        logoSvgs.forEach((svg) => {
          if (svg.tagName === 'IMG') return
          const img = document.createElement('img')
          img.src = data.brand.logoUrl
          img.alt = data.brand?.brandName || 'Logo'
          const baseHeight = data.brand?.logoHeight || 28
          // Login pages get a larger logo
          const isAuth = window.location.pathname.includes('/admin') && document.querySelector('.template-minimal')
          img.style.height = `${isAuth ? Math.max(baseHeight, 48) : baseHeight}px`
          img.style.width = 'auto'
          img.style.maxWidth = '200px'
          img.style.objectFit = 'contain'
          img.className = 'graphic-logo'
          svg.replaceWith(img)
        })
      }

      // Replace brand name text
      if (data?.brand?.brandName) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        let node: Text | null
        while ((node = walker.nextNode() as Text | null)) {
          if (node.textContent?.includes('Payload') && !node.parentElement?.closest('script, style')) {
            node.textContent = node.textContent.replace(/Payload/g, data.brand.brandName)
          }
        }
      }

      // Inject welcome message + footer INTO the login card (not outside)
      const wrap = document.querySelector('.template-minimal__wrap')
      if (wrap) {
        const b = data?.branding
        // Welcome message — insert before the form
        if (b?.welcomeMessage && !document.getElementById('aup-login-welcome')) {
          const welcomeDiv = document.createElement('div')
          welcomeDiv.id = 'aup-login-welcome'
          welcomeDiv.style.cssText = 'text-align:center;margin-bottom:0.75rem;position:relative;z-index:2'
          const p = document.createElement('p')
          p.style.cssText = 'font-size:1.125rem;font-weight:600;margin:0;letter-spacing:-0.01em;color:hsla(0,0%,100%,0.90);text-shadow:0 2px 8px hsla(0,0%,0%,0.3)'
          p.textContent = b.welcomeMessage
          welcomeDiv.appendChild(p)
          const form = wrap.querySelector('form')
          if (form) wrap.insertBefore(welcomeDiv, form)
          else wrap.prepend(welcomeDiv)
        }
        // Footer — append after form
        if (b?.loginFooter && !document.getElementById('aup-login-footer')) {
          const footerDiv = document.createElement('div')
          footerDiv.id = 'aup-login-footer'
          footerDiv.style.cssText = 'text-align:center;margin-top:1.5rem;position:relative;z-index:2'
          const p = document.createElement('p')
          p.style.cssText = 'font-size:0.8125rem;margin:0;color:hsla(0,0%,100%,0.6)'
          p.textContent = b.loginFooter
          footerDiv.appendChild(p)
          wrap.appendChild(footerDiv)
        }
      }
    })

    return () => { mounted = false }
  }, [])

  if (!settings) return children ? <>{children}</> : null

  const hasBackground = settings.loginBackground && settings.loginBackground.length > 0
  const isSplit = settings.loginLayout === 'split'
  const isGrad = hasBackground && isGradient(settings.loginBackground!)
  // Sanitize CSS value to prevent injection
  const bg = sanitizeCSS(settings.loginBackground || '')

  return (
    <>
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

          /* Logo — no forced filter, let the user's logo display naturally */

          /* Labels — scoped to login pages only */
          .template-minimal .field-label,
          .template-minimal label {
            color: hsla(0, 0%, 100%, 0.85) !important;
          }

          /* Inputs — scoped to .template-minimal */
          .template-minimal input {
            background: hsla(0, 0%, 100%, 0.10) !important;
            border: 1px solid hsla(250, 84%, 80%, 0.20) !important;
            color: #ffffff !important;
            border-radius: 10px !important;
          }
          .template-minimal input:focus {
            border-color: hsla(250, 84%, 70%, 0.50) !important;
            box-shadow: 0 0 0 3px hsla(250, 84%, 60%, 0.20) !important;
          }
          .template-minimal input::placeholder {
            color: hsla(250, 60%, 85%, 0.40) !important;
          }

          /* Submit button — scoped */
          .template-minimal .form-submit .btn,
          .template-minimal .btn--style-primary {
            background: linear-gradient(135deg, hsl(250,84%,60%) 0%, hsl(280,72%,58%) 100%) !important;
            border: none !important;
            border-radius: 12px !important;
            color: #ffffff !important;
            font-weight: 600 !important;
            box-shadow: 0 4px 16px hsla(250, 84%, 40%, 0.40) !important;
          }
          .template-minimal .form-submit .btn:hover,
          .template-minimal .btn--style-primary:hover {
            box-shadow: 0 6px 20px hsla(250, 84%, 40%, 0.55) !important;
            transform: translateY(-1px) !important;
          }

          /* Links — scoped */
          .template-minimal a {
            color: hsla(250, 80%, 80%, 0.80) !important;
          }
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

          /* Background gradient covers entire viewport — no gray corners */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            min-height: 100vh !important;
            min-height: 100dvh !important;
            ${isGrad ? `background: ${bg} !important;` : `
              background-color: #0f0f15 !important;
              background-image: url(${bg}) !important;
              background-size: cover !important;
              background-position: center !important;
            `}
            background-attachment: fixed !important;
            overflow-x: hidden !important;
          }
          /* Ensure no white flash or gray edges */
          #__next, [data-nextjs-scroll-focus-boundary] {
            min-height: 100vh !important;
            min-height: 100dvh !important;
            background: transparent !important;
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
      {children}
    </>
  )
}

function isGradient(value: string): boolean {
  return /^(linear|radial|conic|repeating-)/i.test(value)
}

/** Sanitize CSS value to prevent injection via closing braces or script tags */
function sanitizeCSS(value: string): string {
  return value
    .replace(/[{}]/g, '') // Remove braces that could break out of CSS rules
    .replace(/<\/?script/gi, '') // Remove script tags
    .replace(/<\/?style/gi, '') // Remove style tags
    .replace(/expression\s*\(/gi, '') // Remove IE expression()
    .replace(/javascript\s*:/gi, '') // Remove javascript: protocol
    .replace(/@import/gi, '') // Remove CSS imports
}
