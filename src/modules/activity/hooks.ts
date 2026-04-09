import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { SENSITIVE_FIELDS } from '../../types.js'
import { executeNotificationRules } from './notificationRules.js'
import type { NotificationRule, NotificationEvent } from './notificationRules.js'

const SENSITIVE_SET = new Set<string>(SENSITIVE_FIELDS)

/**
 * Create afterChange hook for activity logging.
 * Logs create and update actions with changed field names.
 *
 * Security:
 * - Never logs values — only field names
 * - Skips sensitive fields (password, token, apiKey, etc.)
 * - Uses internal API (bypasses access control) for log creation
 */
export function createAfterChangeHook(
  logCollectionSlug: string,
  collectionSlug: string,
): CollectionAfterChangeHook {
  return async ({ doc, previousDoc, operation, req }) => {
    // Don't log if no user (system operations) or if logging the log itself
    if (!req.user) return doc
    if (collectionSlug === logCollectionSlug) return doc

    try {
      // Determine which fields changed (for updates)
      let changedFields: string[] = []
      if (operation === 'update' && previousDoc) {
        changedFields = getChangedFields(previousDoc, doc)
      }

      // Extract a display title
      const docTitle = extractTitle(doc)
      const userName = req.user.email || req.user.name || `User ${req.user.id}`
      const timestamp = new Date().toISOString()
      const action = operation === 'create' ? 'create' : 'update'

      await req.payload.create({
        collection: logCollectionSlug,
        data: {
          user: req.user.id,
          userName,
          action,
          collection: collectionSlug,
          docId: String(doc.id),
          docTitle,
          changedFields,
          timestamp,
        },
        // Bypass access control — hooks create logs internally
        overrideAccess: true,
      })

      // Fire notification rules (fire-and-forget, never blocks)
      fireNotificationRulesFromSettings(req.payload, {
        action,
        collection: collectionSlug,
        docId: String(doc.id),
        docTitle,
        userName,
        timestamp,
      }, doc as Record<string, unknown>)
    } catch {
      // Logging failure must never break the main operation
    }

    return doc
  }
}

/**
 * Create afterDelete hook for activity logging.
 */
export function createAfterDeleteHook(
  logCollectionSlug: string,
  collectionSlug: string,
): CollectionAfterDeleteHook {
  return async ({ doc, req }) => {
    if (!req.user) return doc
    if (collectionSlug === logCollectionSlug) return doc

    try {
      const docTitle = extractTitle(doc)
      const userName = req.user.email || req.user.name || `User ${req.user.id}`
      const timestamp = new Date().toISOString()

      await req.payload.create({
        collection: logCollectionSlug,
        data: {
          user: req.user.id,
          userName,
          action: 'delete',
          collection: collectionSlug,
          docId: String(doc.id),
          docTitle,
          changedFields: [],
          timestamp,
        },
        overrideAccess: true,
      })

      // Fire notification rules (fire-and-forget, never blocks)
      fireNotificationRulesFromSettings(req.payload, {
        action: 'delete',
        collection: collectionSlug,
        docId: String(doc.id),
        docTitle,
        userName,
        timestamp,
      }, doc as Record<string, unknown>)
    } catch {
      // Logging failure must never break the main operation
    }

    return doc
  }
}

/**
 * Compare two document snapshots and return changed field names.
 * Skips sensitive fields entirely.
 */
function getChangedFields(prev: Record<string, unknown>, next: Record<string, unknown>): string[] {
  const changed: string[] = []
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)])

  for (const key of allKeys) {
    // Skip Payload internal fields
    if (key.startsWith('_') && key !== '_status') continue
    // Skip sensitive fields (exact match + pattern detection)
    if (SENSITIVE_SET.has(key)) continue
    const lower = key.toLowerCase()
    if (lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('apikey')) continue
    // Skip timestamps (always change)
    if (key === 'updatedAt' || key === 'createdAt') continue

    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
      changed.push(key)
    }
  }

  return changed
}

/**
 * Extract a human-readable title from a document.
 */
function extractTitle(doc: Record<string, unknown>): string {
  if (typeof doc.title === 'string') return doc.title
  if (typeof doc.name === 'string') return doc.name
  if (typeof doc.subject === 'string') return doc.subject
  if (typeof doc.filename === 'string') return doc.filename
  if (typeof doc.email === 'string') return doc.email
  return `#${doc.id}`
}

/**
 * Read notification rules from AdminUiPro settings and execute them.
 * Fully fire-and-forget — errors are silently swallowed.
 * Uses a simple in-memory cache (60s TTL) to avoid reading the global on every hook.
 */
let _rulesCache: { rules: NotificationRule[]; expiry: number } | null = null
const RULES_CACHE_TTL_MS = 60_000

function fireNotificationRulesFromSettings(
  payload: any,
  event: NotificationEvent,
  doc?: Record<string, unknown>,
): void {
  const now = Date.now()

  // If cache is fresh, use it directly
  if (_rulesCache && now < _rulesCache.expiry) {
    executeNotificationRules(_rulesCache.rules, event, doc)
    return
  }

  // Otherwise fetch settings async and fire rules when ready
  payload
    .findGlobal({ slug: 'aup-settings', depth: 0 })
    .then((settings: any) => {
      const rawRules = settings?.activityConfig?.notificationRules
      const rules: NotificationRule[] = Array.isArray(rawRules)
        ? rawRules.map((r: any) => ({
            id: r.id,
            event: r.event,
            collection: r.collection || '*',
            channel: r.channel,
            webhookUrl: r.webhookUrl,
            // Normalize flat condition fields into the condition object
            condition: r.conditionField && r.conditionEquals
              ? { field: r.conditionField, equals: r.conditionEquals }
              : undefined,
          }))
        : []
      _rulesCache = { rules, expiry: Date.now() + RULES_CACHE_TTL_MS }
      executeNotificationRules(rules, event, doc)
    })
    .catch(() => {
      // Settings read failure must never surface
    })
}
