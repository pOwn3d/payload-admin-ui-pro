import type { CollectionConfig, PayloadRequest } from 'payload'
import { isAdminCollectionUser } from '../../utils/userCollection.js'

/**
 * Dashboard preferences collection.
 * Stores per-user widget layouts.
 *
 * Security:
 * - Only members of the admin user collection get in. An id scope alone is not
 *   an isolation boundary: SQLite and Postgres number each collection
 *   independently, so `customers#3` and `users#3` are the same `3` and a
 *   front-office account read, overwrote and deleted an administrator's row —
 *   which `unique: true` on `user` then kept the victim from recreating.
 * - Users can only access their own preferences (where-clause filter on user ID)
 * - Hidden from admin nav
 * - JSON layout validated at the endpoint level before saving
 */

/** Own-row scope, refused outright to anyone outside the admin collection. */
function ownRow({ req }: { req: PayloadRequest }) {
  if (!req.user) return false
  if (!isAdminCollectionUser(req as never)) return false
  return { user: { equals: req.user.id } }
}
export function createDashboardPreferencesCollection(
  slug: string = 'dashboard-preferences',
  userCollectionSlug: string = 'users',
): CollectionConfig {
  return {
    slug,
    admin: {
      hidden: true,
    },
    access: {
      read: ownRow,
      create: ({ req }) => isAdminCollectionUser(req as never),
      update: ownRow,
      delete: ownRow,
    },
    fields: [
      {
        name: 'user',
        type: 'relationship',
        relationTo: userCollectionSlug,
        required: true,
        unique: true,
        index: true,
      },
      {
        name: 'layout',
        type: 'json',
        // Validated at the endpoint level with strict size/structure checks
      },
      {
        name: 'version',
        type: 'number',
        defaultValue: 1,
      },
    ],
  }
}
