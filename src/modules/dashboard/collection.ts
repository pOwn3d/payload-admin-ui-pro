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
 * - A row belongs to the caller who creates it, and stays with him: `create`
 *   compares the posted `user` to the session, and the field refuses to be
 *   rewritten afterwards. Membership of the admin collection alone used to be
 *   enough to POST a row on somebody else's behalf.
 * - Hidden from admin nav
 * - JSON layout validated at the endpoint level before saving
 */

/** Own-row scope, refused outright to anyone outside the admin collection. */
function ownRow({ req }: { req: PayloadRequest }) {
  if (!req.user) return false
  if (!isAdminCollectionUser(req as never)) return false
  return { user: { equals: req.user.id } }
}

/**
 * The id carried by a relationship value, whatever shape it arrived in.
 * A REST body may send `3`, `"3"` or `{ id: 3 }`; the permission probe replays
 * a document already read back. Only the id is compared.
 */
function relationId(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const inner = (value as { id?: unknown; value?: unknown }).id
      ?? (value as { value?: unknown }).value
    if (typeof inner === 'number' || typeof inner === 'string') return inner
  }
  return undefined
}

/**
 * Create scope — the row must belong to the caller.
 *
 * `read`/`update`/`delete` return a where-clause, so Payload scopes them to the
 * caller's own row. `create` cannot: there is no row yet to filter, and Payload
 * treats any truthy return as "allowed, write what you were given". Returning a
 * bare `true` therefore wrote whatever `user` the body carried, and the REST
 * route `POST /api/dashboard-preferences` exists whatever `admin.hidden` says —
 * the sibling audit-trail collection blocks it outright with `create: () => false`.
 *
 * Consequence, for any account of the admin collection and no role required:
 * pre-empt the (unique) preferences row of an administrator who has none yet,
 * with a layout that never passed through `validateLayout` — unbounded widget
 * count, unconstrained widget ids, out-of-range coordinates — which his browser
 * then renders and fetches from. `unique: true` is what makes it stick rather
 * than what locks it: the row the attacker plants IS the one row the victim's
 * dashboard reads. The victim is not locked out — the PATCH handler upserts, so
 * it finds the planted row and takes the update branch — but nothing tells them
 * their layout was written by somebody else.
 *
 * The comparison is on the id only, and stringified: `req.user.id` is a number
 * on SQLite/Postgres and a string on Mongo, while a JSON body may send either.
 */
function ownRowCreate({ req, data }: { data?: unknown; req: PayloadRequest }) {
  if (!req.user) return false
  if (!isAdminCollectionUser(req as never)) return false

  // `GET /api/access` resolves every rule with no data at all to build the
  // admin permission matrix. That question is "may this account create its own
  // preferences?", not "may it write this row" — and the answer is yes.
  if (!data) return true

  const owner = relationId((data as { user?: unknown }).user)
  if (owner === undefined) return false
  return String(owner) === String(req.user.id)
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
      create: ownRowCreate,
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
        access: {
          // Ownership is decided once, at creation. `update` is a where-clause
          // evaluated on the EXISTING document, so it never sees the incoming
          // value: PATCHing your own row with `{"user": <someone else>}` used
          // to hand him the row — same cross-user write, second door.
          //
          // This guards the TRANSITION, not the state: Payload drops the field
          // from the incoming data and falls back to the value already stored,
          // so rows already in the database stay updatable and the plugin's own
          // save path (which only ever sends `layout` and `version`) is
          // untouched. A `validate` would have done the opposite — re-judging
          // the merged document on every partial save.
          update: () => false,
        },
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
