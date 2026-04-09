'use client'

import { useEffect } from 'react'
import { DESIGN_TOKENS_CSS } from '../../styles/tokens.js'
import { applyTheme } from '../../utils/themeApplier.js'

/**
 * Client component injected via afterNavLinks (runs on EVERY admin page).
 * - Injects the global design tokens CSS
 * - Applies the selected theme dynamically (bypasses cache for freshness)
 * - Updates favicon, title, brand name, and logo from settings
 */
export const FaviconInjector: React.FC = () => {
  useEffect(() => {
    // 1. Inject base design tokens CSS globally (deduplicate)
    if (!document.getElementById('aup-design-tokens')) {
      const style = document.createElement('style')
      style.id = 'aup-design-tokens'
      style.textContent = DESIGN_TOKENS_CSS
      document.head.appendChild(style)
    }

    let mounted = true

    // 2. Fetch settings DIRECTLY (bypass module cache for theme freshness)
    fetch('/api/globals/aup-settings', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!mounted || !data) return

        // Apply theme colors dynamically
        if (data.theme && data.theme.preset) {
          applyTheme(data)
        }

        // Update favicon
        if (data.branding?.faviconUrl) {
          const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
          if (existing) {
            existing.href = data.branding.faviconUrl
          } else {
            const link = document.createElement('link')
            link.rel = 'icon'
            link.href = data.branding.faviconUrl
            document.head.appendChild(link)
          }
        }

        // Update title suffix
        if (data.branding?.titleSuffix) {
          const baseTitle = document.title.split(' — ')[0] || 'Payload'
          document.title = `${baseTitle} — ${data.branding.titleSuffix}`
        }

        // Apply brand name — replace visible text + aria-label
        if (data.brand?.brandName) {
          // Target the nav header link (Payload logo area)
          const navBrand = document.querySelector('.template-default__nav-header a')
          if (navBrand) {
            navBrand.setAttribute('aria-label', data.brand.brandName)
          }

          // Replace "Payload" text anywhere in the nav header
          const navHeader = document.querySelector('.template-default__nav-header')
          if (navHeader) {
            const walker = document.createTreeWalker(navHeader, NodeFilter.SHOW_TEXT)
            let node: Text | null
            while ((node = walker.nextNode() as Text | null)) {
              if (node.textContent?.includes('Payload')) {
                node.textContent = node.textContent.replace('Payload', data.brand.brandName)
              }
            }
          }

          // Also replace in the page title if it contains "Payload"
          if (document.title.includes('Payload')) {
            document.title = document.title.replace('Payload', data.brand.brandName)
          }
        }

        // Apply custom logo
        if (data.brand?.logoUrl) {
          const logoSvgs = document.querySelectorAll('.graphic-logo')
          logoSvgs.forEach((svg) => {
            if (svg.tagName === 'IMG') return // Already replaced
            const img = document.createElement('img')
            img.src = data.brand.logoUrl
            img.alt = data.brand?.brandName || 'Logo'
            img.style.height = `${data.brand?.logoHeight || 28}px`
            img.style.width = 'auto'
            img.className = 'graphic-logo'
            svg.replaceWith(img)
          })
        }
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [])

  return null
}
