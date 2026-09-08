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
  // A data URI is accepted on its SHAPE, not on its prefix. Testing only
  // `startsWith('data:image/')` let any payload through as long as it opened
  // with those characters — and since this value is interpolated into CSS, the
  // rest of the string could close the declaration and start another rule.
  if (url.startsWith('data:')) {
    return DATA_IMAGE_URI.test(url)
      ? true
      : 'Data URI must be a base64 or URL-encoded image (data:image/<type>;base64,<payload>)'
  }
  return 'URL must start with /, https://, or data:image/'
}

/**
 * A complete image data URI, anchored at both ends.
 *
 * The charset is the one a real SVG-to-data-URI encoder produces — unreserved
 * characters, `%`, and the sub-delims an SVG payload legitimately carries
 * (`'`, `:`, `/`, `=`, `+`, `,`, `!`, `$`, `&`, `*`, `@`, `;` inside the payload
 * is NOT allowed, see below) — minus everything that can break out of the CSS
 * token it is interpolated into.
 *
 * What stays banned, and why: `"` and `\` escape a double-quoted `url()`;
 * `(` and `)` close it; `;`, `{` and `}` end the declaration or open a rule;
 * whitespace splits the token. A previous version banned the whole RFC 3986
 * sub-delim set, which was safe but refused the ordinary output of every SVG
 * encoder — hosts with such a logo could no longer save their settings at all.
 * The call sites now emit `url("…")` with escaping, so the narrower ban is
 * enough and the legitimate values pass.
 */
const DATA_IMAGE_URI =
  /^data:image\/(?:png|jpe?g|gif|webp|avif|svg\+xml)(?:;charset=[\w-]+)?;base64,[A-Za-z0-9+/]+={0,2}$|^data:image\/(?:png|jpe?g|gif|webp|avif|svg\+xml)(?:;charset=[\w-]+)?,[A-Za-z0-9\-._~%:/=+,!$&*@']+$/

export function isSafeDataImageUri(value: string): boolean {
  return DATA_IMAGE_URI.test(value)
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

  // Whatever branch accepts the value, it ends up interpolated into CSS — so the
  // dangerous-pattern check runs on ALL of them, not only on the gradient one.
  // It used to return early here, which is what made `data:image/` a bypass.
  if (containsDangerousCSS(value)) {
    return 'Background contains unsafe CSS patterns'
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
    // Same capability as `url()`: fetches a remote resource. Left out of the
    // list, it was the way to beacon out of a value whose only banned function
    // was `url(` — including from the gradient branch, on the unauthenticated
    // login page. The pattern is unanchored, so `-webkit-image-set(` matches too.
    /image-set\s*\(/i,
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
 * CSS functions allowed inside a colour or gradient value.
 *
 * Anything else — `url()`, `expression()`, `image-set()` — is refused, so a
 * value can never pull a remote resource or resolve to a legacy IE script
 * expression.
 */
const ALLOWED_CSS_FUNCTIONS = new Set([
  'rgb', 'rgba', 'hsl', 'hsla', 'oklch', 'oklab', 'lab', 'lch', 'hwb', 'color',
  'linear-gradient', 'radial-gradient', 'conic-gradient',
  'repeating-linear-gradient', 'repeating-radial-gradient', 'repeating-conic-gradient',
  'color-mix', 'var', 'calc', 'min', 'max', 'clamp',
])

/**
 * Characters a colour or gradient value legitimately needs. Everything else —
 * `;`, `{`, `}`, `:`, `<`, `>`, `"`, `\`, `@`, `!` — is refused.
 *
 * That list is the whole point: without `;` or `}` a value cannot terminate the
 * declaration it sits in, so it cannot open a new selector. `theme.customAccent`
 * used to be validated on its PREFIX only (`/^hsl\(\s*\d+/`), which happily
 * accepted `hsl(1) } html { background-image: url(https://attacker.tld/ping) } .x{`
 * and injected it verbatim into the `<style>` tag mounted on every admin page.
 */
const CSS_VALUE_CHARSET = /^[A-Za-z0-9\s#%.,()/_-]+$/

/**
 * Is this string safe to interpolate into a CSS declaration value?
 *
 * Structural check, not a colour parser: an invalid-but-inert value is simply
 * ignored by the browser, whereas a value that can escape its declaration is a
 * stored injection on every admin page.
 */
export function isSafeCssValue(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (value.length === 0 || value.length > VALIDATION_LIMITS.maxUrlLength) return false
  if (!CSS_VALUE_CHARSET.test(value)) return false
  if (value.includes('/*') || value.includes('*/')) return false

  // Balanced parentheses — an unclosed one would swallow the rest of the sheet.
  let depth = 0
  for (const char of value) {
    if (char === '(') depth++
    else if (char === ')' && --depth < 0) return false
  }
  if (depth !== 0) return false

  for (const match of value.matchAll(/([A-Za-z][A-Za-z0-9-]*)\s*\(/g)) {
    if (!ALLOWED_CSS_FUNCTIONS.has(match[1]!.toLowerCase())) return false
  }

  return true
}

/** A single colour: `#abc`, `#aabbccdd`, `hsl(...)`, `rgb(...)`, `oklch(...)`… */
const CSS_COLOR_FORM =
  /^(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\([^()]*\))$/

/**
 * Field-level validator for the custom theme colours.
 *
 * Paired with `isSafeCssValue`, which is the runtime net in `generateCustomCSS`:
 * a value written before this validator existed, or through a path that skips
 * Payload validation, is still refused at render time.
 */
export function validateCssColor(
  value: string | null | undefined,
  options?: { requireHsl?: boolean },
): true | string {
  if (!value) return true
  if (!isSafeCssValue(value)) return 'Unsafe CSS value'
  if (!CSS_COLOR_FORM.test(value.trim())) {
    return options?.requireHsl
      ? 'Format HSL requis : hsl(H, S%, L%)'
      : 'Expected a colour: hsl(...), rgb(...) or #rrggbb'
  }
  if (options?.requireHsl && !/^hsla?\(/i.test(value.trim())) {
    return 'Format HSL requis : hsl(H, S%, L%)'
  }
  return true
}

/**
 * Hostnames that never belong to a public webhook endpoint.
 * Complements the runtime DNS check in `utils/ssrf.ts`.
 */
const PRIVATE_HOSTNAME_SUFFIXES = ['.local', '.localhost', '.internal', '.home.arpa', '.lan']

/**
 * Validate a notification webhook URL at input time.
 *
 * Only a first pass: it rejects the literal forms (`https://127.0.0.1/`,
 * `https://[::1]/`, `https://10.0.0.5/`) that a config import or a direct API
 * write would otherwise store. A hostname that RESOLVES to a private address
 * cannot be caught here — that is what `assertSafeWebhookUrl` does on every
 * request, redirects included.
 *
 * `allowedHosts` mirrors `activity.webhookAllowedHosts` from the plugin config:
 * a host that deliberately notifies an internal endpoint (a self-hosted n8n on
 * `10.0.0.5`) declares it in CODE, and the runtime guard honours it. Without
 * the same list here the feature was unusable — the field refused to store the
 * very URL the runtime was configured to accept.
 */
export function validateWebhookUrl(
  value: string | null | undefined,
  allowedHosts?: string[],
): true | string {
  if (!value) return true

  const base = validateUrl(value)
  if (base !== true) return base
  if (!value.startsWith('https://')) return 'Webhook URL must start with https://'

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return 'Invalid URL'
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!host) return 'Invalid URL'
  const allowed = (allowedHosts || []).map((h) => h.trim().toLowerCase()).filter(Boolean)
  if (allowed.includes(host)) return true
  if (host === 'localhost' || PRIVATE_HOSTNAME_SUFFIXES.some((s) => host.endsWith(s))) {
    return 'Webhook URL must point to a public host'
  }
  if (isPrivateIpLiteral(host)) {
    return 'Webhook URL must point to a public host'
  }

  return true
}

/**
 * Is this hostname a literal IP address inside a range that never leaves the
 * host or its network? Loopback, RFC1918, CGNAT, link-local (169.254/16 — the
 * cloud metadata service), multicast and reserved space, plus their IPv6
 * counterparts and the IPv4-mapped form `::ffff:10.0.0.1`, which reaches the
 * very same host while looking like an IPv6 literal.
 */
export function isPrivateIpLiteral(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, '').replace(/%.*$/, '').toLowerCase()

  const v4 = parseIpv4(bare)
  if (v4) return isPrivateV4(v4)

  const words = parseIpv6(bare)
  if (!words) return false

  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d). WHATWG `URL`
  // rewrites `::ffff:10.0.0.1` as `::ffff:a00:1`, so matching a dotted tail in
  // the STRING is not enough — the address has to be parsed to be judged.
  const highIsZero = words.slice(0, 5).every((w) => w === 0)
  if (highIsZero && (words[5] === 0xffff || (words[5] === 0 && (words[6]! !== 0 || words[7]! > 1)))) {
    return isPrivateV4([words[6]! >> 8, words[6]! & 0xff, words[7]! >> 8, words[7]! & 0xff])
  }

  if (words.every((w) => w === 0)) return true // ::
  if (highIsZero && words[5] === 0 && words[6] === 0 && words[7] === 1) return true // ::1
  if ((words[0]! & 0xfe00) === 0xfc00) return true // fc00::/7 unique-local
  if ((words[0]! & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((words[0]! & 0xff00) === 0xff00) return true // ff00::/8 multicast
  if (words[0] === 0x0064 && words[1] === 0xff9b) return true // 64:ff9b::/96 NAT64
  if (words[0] === 0x2001 && words[1] === 0x0db8) return true // documentation
  return false
}

/**
 * Is this host string an IP literal rather than a name to resolve?
 * Local implementation so the SSRF guard needs one Node builtin, not two.
 */
export function isIpLiteral(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, '').replace(/%.*$/, '').toLowerCase()
  return parseIpv4(bare) !== null || parseIpv6(bare) !== null
}

/** Dotted-quad → four octets, or null. */
function parseIpv4(value: string): number[] | null {
  const match = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!match) return null
  const octets = match.slice(1, 5).map(Number)
  return octets.every((n) => n >= 0 && n <= 255) ? octets : null
}

function isPrivateV4([a, b]: number[]): boolean {
  if (a === undefined || b === undefined) return true
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true // link-local — cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  if (a === 192 && b === 0) return true // 192.0.0/24 + 192.0.2/24
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true
  if (a === 203 && b === 0) return true
  if (a >= 224) return true // multicast, reserved, broadcast
  return false
}

/** IPv6 literal → eight 16-bit words, or null when it is not one. */
function parseIpv6(value: string): number[] | null {
  if (!value.includes(':')) return null

  let text = value
  // A trailing dotted quad contributes the last two words.
  let tail: number[] = []
  const dotted = text.match(/:((?:\d{1,3}\.){3}\d{1,3})$/)
  if (dotted) {
    const octets = parseIpv4(dotted[1]!)
    if (!octets) return null
    tail = [(octets[0]! << 8) | octets[1]!, (octets[2]! << 8) | octets[3]!]
    text = text.slice(0, text.length - dotted[1]!.length)
    if (text.endsWith(':') && !text.endsWith('::')) text = text.slice(0, -1)
  }

  const halves = text.split('::')
  if (halves.length > 2) return null

  const toWords = (part: string): number[] | null => {
    if (!part) return []
    const out: number[] = []
    for (const group of part.split(':')) {
      if (!/^[0-9a-f]{1,4}$/.test(group)) return null
      out.push(parseInt(group, 16))
    }
    return out
  }

  const head = toWords(halves[0]!.replace(/:$/, ''))
  if (!head) return null

  if (halves.length === 1) {
    const words = [...head, ...tail]
    return words.length === 8 ? words : null
  }

  const rest = toWords(halves[1]!.replace(/^:/, ''))
  if (!rest) return null

  const words = [...head, ...rest, ...tail]
  if (words.length > 8) return null
  const filler = new Array(8 - words.length).fill(0)
  return [...head, ...filler, ...rest, ...tail]
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
