'use client'

import { useEffect } from 'react'
import { fetchSettings } from '../../utils/settingsCache.js'
import { DESIGN_TOKENS_CSS } from '../../styles/tokens.js'
import { applyTheme } from '../../utils/themeApplier.js'

/**
 * Client component injected via afterNavLinks (runs on EVERY admin page).
 * - Injects the global design tokens CSS
 * - Applies the selected theme dynamically
 * - Updates favicon and document title suffix from settings
 */
export const FaviconInjector: React.FC = () => {
  useEffect(() => {
    // Inject base design tokens CSS globally (deduplicate)
    if (!document.getElementById('aup-design-tokens')) {
      const style = document.createElement('style')
      style.id = 'aup-design-tokens'
      style.textContent = DESIGN_TOKENS_CSS
      document.head.appendChild(style)
    }

    let mounted = true

    fetchSettings().then((data) => {
      if (!mounted || !data) return

      // Apply theme colors dynamically
      if (data.theme) {
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

      // Apply brand name
      if (data.brand?.brandName) {
        const logoEls = document.querySelectorAll('.graphic-logo, .nav-header .graphic-logo')
        // Find the text element in the header that says "Payload"
        const navBrand = document.querySelector('.template-default__nav-header a')
        if (navBrand && navBrand.getAttribute('aria-label') === 'Payload') {
          navBrand.setAttribute('aria-label', data.brand.brandName)
        }
      }

      // Apply custom logo
      if (data.brand?.logoUrl) {
        const logoSvgs = document.querySelectorAll('.graphic-logo')
        logoSvgs.forEach((svg) => {
          const img = document.createElement('img')
          img.src = data.brand!.logoUrl!
          img.alt = data.brand?.brandName || 'Logo'
          img.style.height = `${data.brand?.logoHeight || 28}px`
          img.style.width = 'auto'
          svg.replaceWith(img)
        })
      }
    })

    return () => { mounted = false }
  }, [])

  return null
}
