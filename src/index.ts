// Server-side exports — plugin, types, globals, utils
export { adminUiProPlugin } from './plugin.js'
export { createAdminUiProSettingsGlobal } from './globals/AdminUiProSettings.js'

// Dashboard module exports
export { createDashboardPreferencesCollection } from './modules/dashboard/collection.js'
export { createDashboardEndpoints } from './modules/dashboard/endpoints.js'

// Activity module exports
export { createActivityLogCollection } from './modules/activity/collection.js'
export { createActivityEndpoints } from './modules/activity/endpoints.js'

// Security utils (reusable by other plugins)
export { validateUrl, validateBackground, validateTextField, containsDangerousCSS } from './utils/security.js'

// Types
export type {
  AdminUiProConfig,
  DashboardModuleConfig,
  ListViewsModuleConfig,
  QuickActionsModuleConfig,
  FieldEnhanceModuleConfig,
  BrandingModuleConfig,
  ActivityModuleConfig,
  WidgetRegistration,
  WidgetLayoutItem,
  CollectionViewConfig,
  CustomAction,
  ActionDefinition,
  AdminUiProSettingsData,
} from './types.js'

export { SENSITIVE_FIELDS, VALIDATION_LIMITS } from './types.js'

// RBAC (server-side access control)
export { resolvePermissions, resolvePermissionsAsync, hasPermission } from './utils/rbac.js'
export type { AupPermissions, PermissionLevel, AupModule, PermissionsCallback } from './utils/rbac.js'

// Widget registry type (re-export for convenience — component is client-only)
export type { WidgetDefinition } from './modules/dashboard/widgetRegistry.js'
