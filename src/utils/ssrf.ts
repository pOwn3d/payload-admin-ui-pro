import { lookup } from 'node:dns/promises'
import { isIpLiteral, isPrivateIpLiteral } from './security.js'

/**
 * SSRF guard for the only URL this plugin ever asks the SERVER to fetch: the
 * notification webhook.
 *
 * Why it is needed. `validateUrl` only checked `url.startsWith('https://')`, so
 * a notification rule could point at `https://169.254.169.254/latest/meta-data/`
 * or `https://127.0.0.1:8080/…` and the hook would POST there with the network
 * rights of the Node process — from inside the host's private network, on a
 * schedule the caller controls (any document change fires it), with every error
 * swallowed. A prefix check cannot see that, and neither can an allowlist of
 * hostnames alone: `https://attacker.tld/r` answering `302 → http://169.254…`
 * defeats it, because `fetch` follows redirects by default and revalidates
 * nothing.
 *
 * So the guard is a runtime one, and it runs on EVERY hop:
 *   1. https only, and no credentials in the URL;
 *   2. no private / loopback / link-local literal, IPv4-mapped IPv6 included;
 *   3. DNS resolution, refusing when ANY answer lands in private space — one
 *      private A record in a round-robin set is enough to reach the metadata
 *      service on a retry;
 *   4. redirects handled by hand (`redirect: 'manual'`), each Location put back
 *      through steps 1-3.
 *
 * Residual risk, stated rather than hidden: DNS rebinding between the check and
 * the connection stays possible — closing that needs a pinned-IP connect, which
 * `fetch` does not expose. `webhookAllowedHosts` is the escape hatch for hosts
 * that legitimately notify an INTERNAL endpoint (a self-hosted n8n on
 * `10.0.0.5`): it is opt-in, declared in code by the host, never by whoever
 * edits the settings global.
 */

const MAX_REDIRECTS = 3

export interface WebhookFetchOptions {
  /**
   * Hostnames the host explicitly allows even though they resolve to private
   * space. Exact match, case-insensitive. Declared in the plugin config, so
   * writing the settings global can never widen it.
   */
  allowedHosts?: string[]
  /** Milliseconds before the whole exchange is aborted. */
  timeoutMs?: number
}

export class BlockedWebhookUrlError extends Error {
  constructor(reason: string) {
    super(`Blocked webhook URL: ${reason}`)
    this.name = 'BlockedWebhookUrlError'
  }
}

function normalizeHost(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '').toLowerCase()
}

const BLOCKED_HOST_SUFFIXES = ['.local', '.localhost', '.internal', '.home.arpa', '.lan']

/**
 * Resolve `url` and throw unless it points at a public host.
 * Exported so the check is testable without a network.
 */
export async function assertSafeWebhookUrl(
  rawUrl: string,
  options: WebhookFetchOptions = {},
): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new BlockedWebhookUrlError('not a valid absolute URL')
  }

  if (url.protocol !== 'https:') {
    throw new BlockedWebhookUrlError(`protocol ${url.protocol} is not https`)
  }
  if (url.username || url.password) {
    throw new BlockedWebhookUrlError('embedded credentials')
  }

  const host = normalizeHost(url.hostname)
  if (!host) throw new BlockedWebhookUrlError('empty host')

  const allowed = (options.allowedHosts || []).map((h) => h.trim().toLowerCase()).filter(Boolean)
  if (allowed.includes(host)) return url

  if (host === 'localhost' || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
    throw new BlockedWebhookUrlError(`host ${host} is internal`)
  }

  // Literal IP — no DNS involved, judge it directly.
  if (isIpLiteral(host)) {
    if (isPrivateIpLiteral(host)) {
      throw new BlockedWebhookUrlError(`host ${host} is in private address space`)
    }
    return url
  }

  let addresses: Array<{ address: string }>
  try {
    addresses = await lookup(host, { all: true })
  } catch {
    throw new BlockedWebhookUrlError(`host ${host} does not resolve`)
  }

  if (!addresses.length) throw new BlockedWebhookUrlError(`host ${host} does not resolve`)
  for (const { address } of addresses) {
    if (isPrivateIpLiteral(address)) {
      throw new BlockedWebhookUrlError(`host ${host} resolves to private address ${address}`)
    }
  }

  return url
}

/**
 * POST to a webhook, re-validating the target after every redirect.
 * Throws `BlockedWebhookUrlError` rather than following an unsafe hop.
 */
export async function safeWebhookFetch(
  rawUrl: string,
  init: { headers: Record<string, string>; body: string },
  options: WebhookFetchOptions = {},
): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 5_000)

  try {
    let target = rawUrl

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const url = await assertSafeWebhookUrl(target, options)

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: init.headers,
        body: init.body,
        // Node returns the 3xx itself instead of following it, which is the
        // whole point: an unvalidated Location must never be dialled.
        redirect: 'manual',
        signal: controller.signal,
      })

      if (response.status < 300 || response.status >= 400) return

      const location = response.headers.get('location')
      if (!location) return

      try {
        target = new URL(location, url).toString()
      } catch {
        throw new BlockedWebhookUrlError('unparsable redirect target')
      }
    }

    throw new BlockedWebhookUrlError(`more than ${MAX_REDIRECTS} redirects`)
  } finally {
    clearTimeout(timer)
  }
}
