import type { Endpoint } from 'payload'

/**
 * Public branding endpoint.
 *
 * GET /api/admin-ui-pro/branding
 *
 * WHY THIS EXISTS
 *
 * The login page is, by definition, unauthenticated, and it needs four things:
 * the logo, the brand name, the login background and the theme preset. It used
 * to get them by fetching `/api/globals/aup-settings`, i.e. the WHOLE settings
 * document — module toggles, dashboard defaults, menu structure, saved themes,
 * notification rules. Anything the plugin ever adds to that global is then, by
 * construction, on the wire of a page nobody has authenticated on yet.
 *
 * WHAT IT DOES AND DOES NOT FIX
 *
 * It does not, on its own, close anything: `access.read` on the global is
 * `() => true`, so an anonymous caller can still read it directly. What it does
 * is make the login page's needs an explicit, reviewable list of nine values
 * instead of "everything", which is the prerequisite for a host to be ABLE to
 * gate the global. That gate is deliberately not applied here — it would break
 * every consumer reading branding from the global today, and this release
 * breaks nothing.
 *
 * The whitelist is positive and hand-written. A `delete settings.activityConfig`
 * blacklist would leak the next sensitive field somebody adds, which is exactly
 * how the webhook URL got exposed the first time.
 */

interface BrandingResponse {
  brand: {
    brandName: string | null
    logoUrl: string | null
    logoHeight: number | null
  }
  branding: {
    loginBackground: string | null
    loginLayout: string | null
    welcomeMessage: string | null
    loginFooter: string | null
    faviconUrl: string | null
  }
  theme: {
    preset: string | null
  }
}

/** Narrow an unknown value to a plain object, without trusting its prototype. */
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Project the settings global onto the public branding shape.
 *
 * Exported for its own sake: the whitelist is the security boundary here, so it
 * is asserted on directly rather than through an HTTP round trip.
 */
export function pickPublicBranding(settings: unknown): BrandingResponse {
  const root = asRecord(settings)
  const brand = asRecord(root.brand)
  const branding = asRecord(root.branding)
  const theme = asRecord(root.theme)

  return {
    brand: {
      brandName: asString(brand.brandName),
      logoUrl: asString(brand.logoUrl),
      logoHeight: asNumber(brand.logoHeight),
    },
    branding: {
      loginBackground: asString(branding.loginBackground),
      loginLayout: asString(branding.loginLayout),
      welcomeMessage: asString(branding.welcomeMessage),
      loginFooter: asString(branding.loginFooter),
      faviconUrl: asString(branding.faviconUrl),
    },
    theme: {
      preset: asString(theme.preset),
    },
  }
}

export function createBrandingEndpoints(globalSlug: string = 'aup-settings'): Endpoint[] {
  return [
    {
      path: '/admin-ui-pro/branding',
      method: 'get',
      handler: async (req) => {
        try {
          // `overrideAccess: true` is intentional and is not a widening: the
          // caller has no session by construction, and what comes back is
          // filtered by the whitelist above, not by the global's own rules.
          const settings = await req.payload.findGlobal({
            slug: globalSlug,
            depth: 0,
            overrideAccess: true,
          })

          return new Response(JSON.stringify(pickPublicBranding(settings)), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              // Branding changes rarely and this is on the critical path of the
              // login page; a short private cache keeps a reload from hitting
              // the database again.
              'Cache-Control': 'private, max-age=30',
            },
          })
        } catch {
          // A host that has never saved the global has no document yet. That is
          // not an error for the login page — it simply has no branding.
          return new Response(JSON.stringify(pickPublicBranding(null)), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  ]
}
