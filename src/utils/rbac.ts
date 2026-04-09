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

// ─── Resolve Permissions ────────────────────────────────────────────────────

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
      } catch {
        // Fall through to role-based defaults
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
      } catch {
        // Fall through
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
function getPrimaryRole(user: any): string | null {
  if (typeof user.role === 'string') return user.role.toLowerCase()
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
