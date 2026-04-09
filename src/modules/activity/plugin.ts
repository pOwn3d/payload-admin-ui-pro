import type { Config } from 'payload'
import type { ActivityModuleConfig, AdminUiProConfig } from '../../types.js'
import { createActivityLogCollection } from './collection.js'
import { createAfterChangeHook, createAfterDeleteHook } from './hooks.js'
import { createActivityEndpoints } from './endpoints.js'

const LOG_COLLECTION_SLUG = 'activity-log'

// Collections that should never be tracked
const ALWAYS_SKIP = new Set([
  'activity-log',
  'dashboard-preferences',
  'admin-nav-preferences',
  'payload-preferences',
  'payload-migrations',
  'payload-locked-documents',
])

/**
 * Activity sub-module.
 * Adds an audit trail that logs who did what, when.
 *
 * Adds:
 * - An 'activity-log' collection (hidden, admin-only read, immutable)
 * - afterChange + afterDelete hooks on all tracked collections
 * - API endpoints for fetching and cleaning up activity
 *
 * Security:
 * - Never logs field values — only field names
 * - Skips sensitive fields (password, token, apiKey, etc.)
 * - Log creation uses overrideAccess (internal only)
 * - API read is admin-only
 */
export function activityModule(
  moduleConfig: ActivityModuleConfig | undefined,
  _pluginConfig: AdminUiProConfig,
) {
  return (incomingConfig: Config): Config => {
    const config = { ...incomingConfig }
    const retentionDays = moduleConfig?.retentionDays ?? 90
    const targetCollections = moduleConfig?.collections
    const skipCollections = new Set([
      ...ALWAYS_SKIP,
      ...(moduleConfig?.skipCollections || []),
    ])

    // 1. Add the activity-log collection
    config.collections = [
      ...(config.collections || []),
      createActivityLogCollection(LOG_COLLECTION_SLUG),
    ]

    // 2. Add API endpoints
    config.endpoints = [
      ...(config.endpoints || []),
      ...createActivityEndpoints(LOG_COLLECTION_SLUG, retentionDays),
    ]

    // 3. Attach hooks to all tracked collections
    config.collections = config.collections.map((col) => {
      // Skip excluded collections
      if (skipCollections.has(col.slug)) return col
      // If specific collections are set, only track those
      if (targetCollections && !targetCollections.includes(col.slug)) return col

      const modifiedCol = { ...col }
      modifiedCol.hooks = { ...modifiedCol.hooks }

      // afterChange hook
      const existingAfterChange = modifiedCol.hooks.afterChange || []
      modifiedCol.hooks.afterChange = [
        ...(Array.isArray(existingAfterChange) ? existingAfterChange : [existingAfterChange]),
        createAfterChangeHook(LOG_COLLECTION_SLUG, col.slug),
      ]

      // afterDelete hook
      const existingAfterDelete = modifiedCol.hooks.afterDelete || []
      modifiedCol.hooks.afterDelete = [
        ...(Array.isArray(existingAfterDelete) ? existingAfterDelete : [existingAfterDelete]),
        createAfterDeleteHook(LOG_COLLECTION_SLUG, col.slug),
      ]

      return modifiedCol
    })

    return config
  }
}
