/**
 * Notification rules engine.
 * Evaluates rules after activity is logged and dispatches to channels.
 *
 * Channels:
 * - webhook: POST JSON payload to a URL (fire-and-forget, 5s timeout)
 * - in-app: Already handled by NotificationBell (activity log = in-app feed)
 *
 * Security:
 * - Webhook URLs are validated at config time (Payload field validation) AND
 *   re-validated at request time by `assertSafeWebhookUrl`, on every redirect
 *   hop — a field validator only sees writes that go through Payload, and it
 *   cannot see where a hostname RESOLVES
 * - Payloads never include field values — only action metadata
 * - Failures are silently swallowed to never block hooks
 */
import { safeWebhookFetch, type WebhookFetchOptions } from '../../utils/ssrf.js'

export interface NotificationRule {
  id: string
  /** Event type to match */
  event: 'create' | 'update' | 'delete'
  /** Collection slug to match, '*' for all */
  collection: string
  /** Optional condition: only fire if a specific field equals a value */
  condition?: { field: string; equals: string }
  /** Delivery channel */
  channel: 'webhook' | 'in-app'
  /** Webhook endpoint (required when channel === 'webhook') */
  webhookUrl?: string
}

export interface NotificationEvent {
  action: 'create' | 'update' | 'delete'
  collection: string
  docId: string
  docTitle: string
  userName: string
  timestamp: string
}

const WEBHOOK_TIMEOUT_MS = 5_000

/**
 * Evaluate all notification rules against an activity event.
 * Matching rules are executed fire-and-forget (never awaited in the hook).
 */
export function executeNotificationRules(
  rules: NotificationRule[],
  event: NotificationEvent,
  doc?: Record<string, unknown>,
  webhookOptions?: WebhookFetchOptions,
): void {
  if (!rules || rules.length === 0) return

  for (const rule of rules) {
    try {
      if (!matchesRule(rule, event, doc)) continue

      switch (rule.channel) {
        case 'webhook':
          if (rule.webhookUrl) {
            fireWebhook(rule.webhookUrl, event, webhookOptions).catch(() => {
              // Silently swallow — fire-and-forget
            })
          }
          break
        case 'in-app':
          // In-app notifications are already handled by the activity log.
          // The NotificationBell component polls the activity endpoint.
          // No additional action needed here.
          break
      }
    } catch {
      // Rule evaluation failure must never break the hook
    }
  }
}

/**
 * Check if a rule matches the given event.
 */
function matchesRule(
  rule: NotificationRule,
  event: NotificationEvent,
  doc?: Record<string, unknown>,
): boolean {
  // Match event type
  if (rule.event !== event.action) return false

  // Match collection ('*' = wildcard)
  if (rule.collection !== '*' && rule.collection !== event.collection) return false

  // Match optional condition
  if (rule.condition?.field && rule.condition?.equals) {
    if (!doc) return false
    const fieldValue = String(doc[rule.condition.field] ?? '')
    if (fieldValue !== rule.condition.equals) return false
  }

  return true
}

/**
 * Send a webhook POST with a 5s timeout.
 *
 * The bare `fetch(url, …)` this replaced followed redirects by default and
 * never looked at the destination, so a rule pointing at `https://127.0.0.1:…`
 * or at a public URL redirecting to `http://169.254.169.254/…` turned every
 * document change into a request issued from inside the host's network.
 * `safeWebhookFetch` resolves the host and refuses private address space,
 * re-checking after each redirect.
 */
async function fireWebhook(
  url: string,
  event: NotificationEvent,
  options?: WebhookFetchOptions,
): Promise<void> {
  await safeWebhookFetch(
    url,
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PayloadAdminUiPro/1.0',
        'X-Payload-Event': event.action,
      },
      body: JSON.stringify({
        event: event.action,
        collection: event.collection,
        docId: event.docId,
        docTitle: event.docTitle,
        userName: event.userName,
        timestamp: event.timestamp,
      }),
    },
    { ...options, timeoutMs: options?.timeoutMs ?? WEBHOOK_TIMEOUT_MS },
  )
}
