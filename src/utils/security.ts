import { VALIDATION_LIMITS } from '../types.js'

/**
 * Validate a URL: must be relative (/) or HTTPS.
 * Blocks javascript:, data: (except data:image/), and protocol-relative URLs.
 */
export function validateUrl(url: string): true | string {
  if (!url || url.length === 0) return true
  if (url.length > VALIDATION_LIMITS.maxUrlLength) {
    return `URL too long (max ${VALIDATION_LIMITS.maxUrlLength} characters)`
  }
  if (url.startsWith('/') && !url.includes('//')) return true
  if (url.startsWith('https://')) return true
  if (url.startsWith('data:image/')) return true
  return 'URL must start with /, https://, or data:image/'
}

/**
 * Validate a login background value: URL or CSS gradient.
 * Allows safe CSS gradient functions only.
 */
export function validateBackground(value: string): true | string {
  if (!value || value.length === 0) return true
  if (value.length > VALIDATION_LIMITS.maxUrlLength) {
    return `Value too long (max ${VALIDATION_LIMITS.maxUrlLength} characters)`
  }

  // URL check
  const urlResult = validateUrl(value)
  if (urlResult === true) return true

  // CSS gradient check — only allow known safe gradient functions
  const safeGradients = [
    /^linear-gradient\s*\(/i,
    /^radial-gradient\s*\(/i,
    /^conic-gradient\s*\(/i,
    /^repeating-linear-gradient\s*\(/i,
    /^repeating-radial-gradient\s*\(/i,
    /^repeating-conic-gradient\s*\(/i,
  ]

  if (safeGradients.some((re) => re.test(value))) {
    // Block dangerous patterns inside gradient value
    if (containsDangerousCSS(value)) {
      return 'Background contains unsafe CSS patterns'
    }
    return true
  }

  return 'Must be a URL (/ or https://) or a CSS gradient (linear-gradient, radial-gradient, etc.)'
}

/**
 * Check for dangerous CSS patterns.
 * Used for any CSS string that will be injected into the page.
 */
export function containsDangerousCSS(css: string): boolean {
  const dangerous = [
    /@import/i,
    /url\s*\(/i,
    /expression\s*\(/i,
    /javascript\s*:/i,
    /-moz-binding/i,
    /<\/style/i,
    /<script/i,
    /behavior\s*:/i,
    /-o-link/i,
    /\\00/i,
  ]
  return dangerous.some((re) => re.test(css))
}

/**
 * Validate a text field with max length.
 */
export function validateTextField(value: string, maxLength?: number): true | string {
  if (!value) return true
  const max = maxLength ?? VALIDATION_LIMITS.maxTextFieldLength
  if (value.length > max) return `Too long (max ${max} characters)`
  // Block HTML tags
  if (/<[^>]*>/.test(value)) return 'HTML tags are not allowed'
  return true
}

/**
 * Rate limiter — in-memory, per-key, with auto-cleanup.
 * Pattern borrowed from admin-nav.
 */
const MAX_STORE_SIZE = 10_000
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Cleanup expired entries every 60s
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(key)
  }
}, 60_000)
if (typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
  cleanupInterval.unref()
}

export function rateLimit(key: string, maxRequests: number, windowMs: number = 60_000): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt <= now) {
    // Prevent unbounded memory growth
    if (rateLimitStore.size >= MAX_STORE_SIZE) {
      // Evict oldest entries
      const keysToDelete: string[] = []
      for (const [k, v] of rateLimitStore) {
        if (v.resetAt <= now) keysToDelete.push(k)
        if (keysToDelete.length >= 1000) break
      }
      keysToDelete.forEach((k) => rateLimitStore.delete(k))
    }
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}

/**
 * Extract rate limit key from request.
 * Uses IP + user ID for per-user per-IP limiting.
 */
export function rateLimitKey(req: { headers: Headers; user?: { id?: string } }, prefix: string): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  const userId = req.user?.id || 'anon'
  return `${prefix}:${ip}:${userId}`
}

export function rateLimitResponse() {
  return new Response(
    JSON.stringify({ error: 'Too many requests', retryAfter: 60 }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } },
  )
}
