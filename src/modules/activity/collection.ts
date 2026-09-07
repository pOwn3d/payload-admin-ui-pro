import type { CollectionConfig, PayloadRequest } from 'payload'
import { isAdminRole } from '../../utils/rbac.js'

/**
 * Guard for reading / pruning the audit trail.
 *
 * Three layers, on purpose:
 *
 * 1. The caller must belong to the admin user collection (`config.admin.user`).
 *    Without this check, a member of ANY other auth collection — a front-office
 *    customer, an API client — fell straight through to the role-less branch
 *    below and could page the entire audit trail, admin e-mails included.
 * 2. When the host declares roles, only administrators pass. The check is
 *    `isAdminRole` — the same normalisation the rest of the plugin uses to hand
 *    out ADMIN_PERMISSIONS — so `superadmin`, `Admin` and `roles: [{ value }]`
 *    behave here exactly as they do everywhere else. A strict
 *    `role === 'admin'` used to 403 those accounts on the audit trail alone,
 *    emptying the notification bell, the activity feed and the timeline.
 * 3. Hosts that declare no role field at all keep working (fail-open, the
 *    `null` case): closing that branch would lock the audit trail out of every
 *    setup without RBAC, which is not a change a plugin gets to make silently.
 */
export function canAccessActivityLog({ req }: { req: PayloadRequest }): boolean {
  const user = req.user
  if (!user) return false

  const adminUserSlug = req.payload?.config?.admin?.user
  if (adminUserSlug && user.collection !== adminUserSlug) return false

  const isAdmin = isAdminRole(user)
  return isAdmin === null ? true : isAdmin
}

/**
 * Activity log collection.
 * Stores audit trail entries for document changes.
 *
 * Security:
 * - Hidden from admin nav
 * - Read: admin only (see canAccessActivityLog)
 * - Create: system only (via hooks, not direct API)
 * - Update: nobody (immutable)
 * - Delete: admin only (for retention cleanup)
 */
export function createActivityLogCollection(
  slug: string = 'activity-log',
  userCollectionSlug: string = 'users',
): CollectionConfig {
  return {
    slug,
    admin: {
      hidden: true,
    },
    access: {
      read: canAccessActivityLog,
      // Only internal hooks create entries — block direct API creation
      create: () => false,
      // Immutable — no updates allowed
      update: () => false,
      // Admin can delete for retention cleanup
      delete: canAccessActivityLog,
    },
    fields: [
      {
        name: 'user',
        type: 'relationship',
        relationTo: userCollectionSlug,
        index: true,
      },
      {
        name: 'userName',
        type: 'text',
        // Denormalized for display — avoids join on every feed render
      },
      {
        name: 'action',
        type: 'select',
        required: true,
        index: true,
        options: [
          { label: { en: 'Created', fr: 'Créé' }, value: 'create' },
          { label: { en: 'Updated', fr: 'Modifié' }, value: 'update' },
          { label: { en: 'Deleted', fr: 'Supprimé' }, value: 'delete' },
        ],
      },
      {
        name: 'collection',
        type: 'text',
        required: true,
        index: true,
      },
      {
        name: 'docId',
        type: 'text',
        required: true,
      },
      {
        name: 'docTitle',
        type: 'text',
        // Best-effort title extraction for display
      },
      {
        name: 'changedFields',
        type: 'json',
        // Array of field names that changed (no values — security)
      },
      {
        name: 'timestamp',
        type: 'date',
        required: true,
        index: true,
        defaultValue: () => new Date().toISOString(),
      },
    ],
  }
}
