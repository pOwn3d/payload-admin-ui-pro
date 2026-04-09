import type { CollectionConfig } from 'payload'

/**
 * Dashboard preferences collection.
 * Stores per-user widget layouts.
 *
 * Security:
 * - Users can only access their own preferences (where-clause filter on user ID)
 * - Hidden from admin nav
 * - JSON layout validated at the endpoint level before saving
 */
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
      read: ({ req }) => {
        if (!req.user) return false
        return { user: { equals: req.user.id } }
      },
      create: ({ req }) => !!req.user,
      update: ({ req }) => {
        if (!req.user) return false
        return { user: { equals: req.user.id } }
      },
      delete: ({ req }) => {
        if (!req.user) return false
        return { user: { equals: req.user.id } }
      },
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
