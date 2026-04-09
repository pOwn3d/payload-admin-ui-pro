import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { SENSITIVE_FIELDS } from '../../types.js'

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

      await req.payload.create({
        collection: logCollectionSlug,
        data: {
          user: req.user.id,
          userName: req.user.email || req.user.name || `User ${req.user.id}`,
          action: operation === 'create' ? 'create' : 'update',
          collection: collectionSlug,
          docId: String(doc.id),
          docTitle,
          changedFields,
          timestamp: new Date().toISOString(),
        },
        // Bypass access control — hooks create logs internally
        overrideAccess: true,
      })
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

      await req.payload.create({
        collection: logCollectionSlug,
        data: {
          user: req.user.id,
          userName: req.user.email || req.user.name || `User ${req.user.id}`,
          action: 'delete',
          collection: collectionSlug,
          docId: String(doc.id),
          docTitle,
          changedFields: [],
          timestamp: new Date().toISOString(),
        },
        overrideAccess: true,
      })
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
    // Skip sensitive fields
    if (SENSITIVE_SET.has(key)) continue
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
