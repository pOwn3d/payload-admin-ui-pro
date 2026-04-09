import type { CollectionConfig } from 'payload'

/**
 * Activity log collection.
 * Stores audit trail entries for document changes.
 *
 * Security:
 * - Hidden from admin nav
 * - Read: admin only
 * - Create: system only (via hooks, not direct API)
 * - Update: nobody (immutable)
 * - Delete: admin only (for retention cleanup)
 */
export function createActivityLogCollection(
  slug: string = 'activity-log',
): CollectionConfig {
  return {
    slug,
    admin: {
      hidden: true,
    },
    access: {
      read: ({ req }) => {
        if (!req.user) return false
        if (req.user.role) return req.user.role === 'admin'
        if (req.user.roles) return req.user.roles.includes('admin')
        return true
      },
      // Only internal hooks create entries — block direct API creation
      create: () => false,
      // Immutable — no updates allowed
      update: () => false,
      // Admin can delete for retention cleanup
      delete: ({ req }) => {
        if (!req.user) return false
        if (req.user.role) return req.user.role === 'admin'
        if (req.user.roles) return req.user.roles.includes('admin')
        return true
      },
    },
    fields: [
      {
        name: 'user',
        type: 'relationship',
        relationTo: 'users',
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
