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

/**
 * Minimal shape every caller of `isAdminCollectionUser` can produce — the
 * access rules receive a real `PayloadRequest`, the endpoints an `any`.
 */
export interface AdminCollectionReq {
  user?: { collection?: string } | null
  payload?: { config?: { admin?: { user?: string } } }
}

/**
 * Does this request come from a member of the collection that authenticates
 * the admin panel?
 *
 * `!!req.user` is NOT an admin check. A host typically runs several auth
 * collections side by side — `users` for the back-office, `customers` /
 * `members` / `subscribers` for the front-office. A customer who signs up
 * normally and logs in on `POST /api/customers/login` carries a perfectly
 * valid `req.user`, and every rule written as `!!req.user` let them through:
 * the settings global, the webhook URL, the presence endpoints and the
 * dashboard preferences were all reachable from a front-office account.
 *
 * `user.id` alone is no better as a scope: ids are per-collection sequences on
 * SQLite and Postgres, so `users#3` and `customers#3` collide.
 *
 * The `adminUserSlug` fallback stays open on purpose: a sanitized Payload
 * config always populates `admin.user`, so an empty value only happens in
 * hand-rolled test doubles and in configs Payload has not sanitized yet.
 * Denying there would break those setups for no security gain — the same
 * trade-off `canAccessActivityLog` already makes.
 */
export function isAdminCollectionUser(req: AdminCollectionReq | null | undefined): boolean {
  const user = req?.user
  if (!user) return false

  const adminUserSlug = req?.payload?.config?.admin?.user
  if (adminUserSlug && user.collection !== adminUserSlug) return false

  return true
}
