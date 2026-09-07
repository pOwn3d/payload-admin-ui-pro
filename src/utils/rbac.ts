/**
 * RBAC — Role-Based Access Control for Admin UI Pro modules.
 *
 * Resolves per-module permissions from user role(s) and optional overrides.
 * Works with any Payload user collection that has `role` or `roles` fields.
 */

import type { AdminUiProConfig } from '../types.js'

// ─── Public Types ───────────────────────────────────────────────────────────

export type PermissionLevel = boolean | 'view' | 'edit'

export interface AupPermissions {
  dashboard?: PermissionLevel
  listViews?: boolean
  quickActions?: boolean
  fieldEnhance?: boolean
  branding?: PermissionLevel
  activity?: boolean | 'view'
  settings?: boolean
}

export type AupModule = keyof AupPermissions

/** Callback signature for custom permission resolvers */
export type PermissionsCallback = (user: any) => AupPermissions | Promise<AupPermissions>

// ─── Default Permission Presets ─────────────────────────────────────────────

const ADMIN_PERMISSIONS: AupPermissions = {
  dashboard: 'edit',
  listViews: true,
  quickActions: true,
  fieldEnhance: true,
  branding: 'edit',
  activity: 'view',
  settings: true,
}

const EDITOR_PERMISSIONS: AupPermissions = {
  dashboard: 'view',
  listViews: true,
  quickActions: true,
  fieldEnhance: true,
  branding: 'view',
  activity: 'view',
  settings: false,
}

const USER_PERMISSIONS: AupPermissions = {
  dashboard: 'view',
  listViews: false,
  quickActions: false,
  fieldEnhance: false,
  branding: false,
  activity: false,
  settings: false,
}

const ROLE_DEFAULTS: Record<string, AupPermissions> = {
  admin: ADMIN_PERMISSIONS,
  superadmin: ADMIN_PERMISSIONS,
  editor: EDITOR_PERMISSIONS,
  author: EDITOR_PERMISSIONS,
  user: USER_PERMISSIONS,
  viewer: USER_PERMISSIONS,
}

/**
 * Role names this plugin treats as administrators — derived from ROLE_DEFAULTS
 * so `isAdminRole` can never drift from the permission presets.
 */
const ADMIN_ROLES = new Set(
  Object.keys(ROLE_DEFAULTS).filter((role) => ROLE_DEFAULTS[role] === ADMIN_PERMISSIONS),
)

// ─── Resolve Permissions ────────────────────────────────────────────────────

/**
 * A custom `access.permissions` resolver that throws falls back to the ADMIN
 * preset — the most permissive one. Say so out loud instead of failing open in
 * silence.
 */
function warnResolverFailed(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  console.warn(
    `[admin-ui-pro] access.permissions resolver threw (${message}); ` +
      'falling back to role-based defaults, which grant admin access when no ' +
      'role matches. Note the resolver receives the user object itself, not { user }.',
  )
}

/**
 * Determine the effective AUP permissions for a user.
 *
 * Priority:
 * 1. `user.aupPermissions` — explicit per-user override
 * 2. `pluginConfig.access?.permissions(user)` — project-level callback
 * 3. Role-based defaults from `user.role` or `user.roles`
 * 4. Fallback: admin-level access (generous default for setups without roles)
 */
export function resolvePermissions(
  user: any,
  pluginConfig?: AdminUiProConfig & { access?: { permissions?: PermissionsCallback } },
): AupPermissions {
  if (!user) return USER_PERMISSIONS

  // 1. Per-user override stored on the user document
  if (user.aupPermissions && typeof user.aupPermissions === 'object') {
    return { ...ADMIN_PERMISSIONS, ...user.aupPermissions }
  }

  // 2. Plugin-level custom resolver (sync result only — async handled by resolvePermissionsAsync)
  if (pluginConfig?.access && 'permissions' in pluginConfig.access) {
    const cb = (pluginConfig.access as any).permissions
    if (typeof cb === 'function') {
      try {
        const result = cb(user)
        // Only use if it's a plain object (not a Promise)
        if (result && typeof result === 'object' && typeof result.then !== 'function') {
          return { ...ADMIN_PERMISSIONS, ...result }
        }
      } catch (err) {
        // The fallback below is ADMIN_PERMISSIONS, so a resolver that throws
        // grants MORE than intended, not less. Swallowing that silently made
        // the mistake undetectable — the README's own example used to be
        // written `({ user }) => ...`, which throws on every call.
        warnResolverFailed(err)
      }
    }
  }

  // 3. Role-based defaults
  const role = getPrimaryRole(user)
  if (role && ROLE_DEFAULTS[role]) {
    return ROLE_DEFAULTS[role]!
  }

  // 4. Fallback — authenticated but no recognized role → full access
  return ADMIN_PERMISSIONS
}

/**
 * Async variant of resolvePermissions.
 * Use this when the plugin config may have an async permissions callback.
 */
export async function resolvePermissionsAsync(
  user: any,
  pluginConfig?: AdminUiProConfig & { access?: { permissions?: PermissionsCallback } },
): Promise<AupPermissions> {
  if (!user) return USER_PERMISSIONS

  // 1. Per-user override
  if (user.aupPermissions && typeof user.aupPermissions === 'object') {
    return { ...ADMIN_PERMISSIONS, ...user.aupPermissions }
  }

  // 2. Plugin-level custom resolver (supports async)
  if (pluginConfig?.access && 'permissions' in pluginConfig.access) {
    const cb = (pluginConfig.access as any).permissions
    if (typeof cb === 'function') {
      try {
        const result = await cb(user)
        if (result && typeof result === 'object') {
          return { ...ADMIN_PERMISSIONS, ...result }
        }
      } catch (err) {
        warnResolverFailed(err)
      }
    }
  }

  // 3 & 4 — same as sync
  return resolvePermissions(user, undefined)
}

// ─── Permission Check ───────────────────────────────────────────────────────

/**
 * Check if the resolved permissions grant access to a given module + action.
 *
 * @param permissions - Resolved AupPermissions object
 * @param module      - Module key (e.g. 'dashboard', 'settings')
 * @param action      - Optional action: 'view' or 'edit'. If omitted, any truthy value passes.
 *
 * @returns true if the user has the requested permission level
 */
export function hasPermission(
  permissions: AupPermissions,
  module: string,
  action?: 'view' | 'edit',
): boolean {
  const value = permissions[module as AupModule]

  // Undefined or explicitly false → no access
  if (value === undefined || value === false) return false

  // Boolean true → full access
  if (value === true) return true

  // String level: 'view' or 'edit'
  if (typeof value === 'string') {
    if (!action) return true // any level is fine when no specific action requested
    if (action === 'view') return value === 'view' || value === 'edit'
    if (action === 'edit') return value === 'edit'
  }

  return false
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract the primary role string from a user object.
 * Supports both `user.role` (string) and `user.roles` (array).
 */
export function getPrimaryRole(user: any): string | null {
  // An empty `role` must not shadow a populated `roles` array — falling through
  // is what the ad-hoc `if (user.role)` checks used to do.
  if (typeof user.role === 'string' && user.role.trim()) return user.role.trim().toLowerCase()
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    // Pick the highest-privilege role: admin > editor > user
    const normalized = user.roles.map((r: any) => (typeof r === 'string' ? r : r?.value || '').toLowerCase())
    for (const privileged of ['superadmin', 'admin', 'editor', 'author']) {
      if (normalized.includes(privileged)) return privileged
    }
    return normalized[0] || null
  }
  return null
}

/**
 * Does this user hold a role this plugin considers administrative?
 *
 * Returns `null` when the host declares no role field at all, so each caller
 * picks its own policy for that case (the audit trail deliberately fails open
 * there — see `canAccessActivityLog`).
 *
 * This is the ONE implementation. Three divergent inline variants used to
 * exist (`user.role === 'admin'`, `user.roles?.includes('admin')`, and the
 * normalising `getPrimaryRole`), so a host whose admin role is spelled
 * `superadmin` or `Admin` got ADMIN_PERMISSIONS everywhere but a 403 on the
 * audit trail.
 */
export function isAdminRole(user: any): boolean | null {
  if (!user) return null

  const role = getPrimaryRole(user)
  if (role) return ADMIN_ROLES.has(role)

  // Nothing usable came out. A `roles` value that is present but empty or
  // malformed still means the host declares roles and this account holds none
  // we recognise → deny (the previous `Array.isArray(...) && includes(...)`
  // resolved to false here too). Only the total absence of role information
  // yields `null`.
  if (user.roles) return false
  return null
}
