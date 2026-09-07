import type { Config } from 'payload'

/**
 * Resolve the slug of the collection that authenticates admin users.
 *
 * The plugin used to hardcode `relationTo: 'users'`. On a host whose auth
 * collection is named `admins`, `staff` or `members`, config sanitization
 * throws `InvalidFieldRelationship` and the app stops booting — the only way
 * out being to disable both flagship modules. The silent variant is worse: a
 * host that keeps a NON-auth `users` collection next to an `admins` one boots
 * fine, then writes `admins` ids into a relation pointing at `users` (a bogus
 * foreign key on Postgres).
 *
 * Resolution order: explicit override > `config.admin.user` >
 * first collection with `auth` > 'users'.
 */
export function resolveUserCollectionSlug(
  config: Pick<Config, 'admin' | 'collections'>,
  override?: string,
): string {
  if (override) return override
  if (config.admin?.user) return config.admin.user

  const authCollection = (config.collections || []).find((col) => Boolean(col.auth))
  if (authCollection) return authCollection.slug

  return 'users'
}
