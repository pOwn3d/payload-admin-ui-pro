import type { Config } from 'payload'
import type { ActivityModuleConfig, AdminUiProConfig } from '../../types.js'
import { createActivityLogCollection } from './collection.js'
import { createAfterChangeHook, createAfterDeleteHook } from './hooks.js'
import { createActivityEndpoints } from './endpoints.js'
import { resolveUserCollectionSlug } from '../../utils/userCollection.js'
import { createActivityCleanupTask, DEFAULT_RETENTION_CRON } from './retention.js'

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
  pluginConfig: AdminUiProConfig,
) {
  return (incomingConfig: Config): Config => {
    const config = { ...incomingConfig }
    // Never assume the auth collection is called `users` — see resolveUserCollectionSlug.
    const userCollectionSlug = resolveUserCollectionSlug(
      incomingConfig,
      pluginConfig.userCollectionSlug,
    )
    const retentionDays = moduleConfig?.retentionDays ?? 90
    const hookOptions = {
      userCollectionSlug,
      webhookAllowedHosts: moduleConfig?.webhookAllowedHosts,
    }
    const targetCollections = moduleConfig?.collections
    const skipCollections = new Set([
      ...ALWAYS_SKIP,
      ...(moduleConfig?.skipCollections || []),
    ])

    // 1. Add the activity-log collection
    config.collections = [
      ...(config.collections || []),
      createActivityLogCollection(LOG_COLLECTION_SLUG, userCollectionSlug),
    ]

    // 2. Add API endpoints
    config.endpoints = [
      ...(config.endpoints || []),
      ...createActivityEndpoints(LOG_COLLECTION_SLUG, retentionDays),
    ]

    // 2b. Scheduled retention — opt-in, and deliberately so.
    //
    // `retentionDays` was a promise nothing kept: the only reader was the manual
    // cleanup endpoint. A Payload Jobs task is the right mechanism (setInterval
    // does not survive serverless and fires once per instance behind a load
    // balancer), but declaring one is NOT free, and the cost has to be the
    // integrator's decision:
    //
    //  - `sanitizeConfig` sets `jobs.enabled` as soon as one task exists and then
    //    appends Payload's `payload-jobs` COLLECTION; a task carrying `schedule`
    //    additionally appends the `payload-jobs-stats` GLOBAL. On a host that
    //    uses no jobs today, switching this on is two new tables — an additive
    //    schema change that production has to migrate.
    //  - a scheduled task only runs if something drives the queue
    //    (`payload jobs:handle-schedules` + `payload jobs:run`, or `jobs.autoRun`).
    //    Registering it by default would have paid the schema cost on every host
    //    while purging nothing on most of them.
    //
    // So: off unless asked for. `true` uses the daily default, a string is taken
    // as the cron expression. The manual endpoint stays in both cases.
    const scheduleOption = moduleConfig?.retentionSchedule
    if (scheduleOption) {
      const cron = typeof scheduleOption === 'string' ? scheduleOption : DEFAULT_RETENTION_CRON
      const jobs = { ...(config.jobs || {}) }
      jobs.tasks = [
        ...(jobs.tasks || []),
        createActivityCleanupTask({
          logCollectionSlug: LOG_COLLECTION_SLUG,
          retentionDays,
          cron,
          queue: moduleConfig?.retentionQueue || 'default',
        }) as never,
      ]
      config.jobs = jobs
    }

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
        createAfterChangeHook(LOG_COLLECTION_SLUG, col.slug, hookOptions),
      ]

      // afterDelete hook
      const existingAfterDelete = modifiedCol.hooks.afterDelete || []
      modifiedCol.hooks.afterDelete = [
        ...(Array.isArray(existingAfterDelete) ? existingAfterDelete : [existingAfterDelete]),
        createAfterDeleteHook(LOG_COLLECTION_SLUG, col.slug, hookOptions),
      ]

      return modifiedCol
    })

    // 4. Inject DocumentTimeline + VersionDiff into the edit view on tracked collections.
    //
    // These used to target `admin.components.afterDocument`, which does not exist
    // on a Payload collection — the key was silently dropped and none of these
    // three components ever rendered. `edit.beforeDocumentControls` is the
    // documented array slot inside the edit view, so they mount there instead.
    config.collections = config.collections.map((col) => {
      if (skipCollections.has(col.slug)) return col
      if (targetCollections && !targetCollections.includes(col.slug)) return col

      const modCol = { ...col }
      modCol.admin = { ...modCol.admin }
      modCol.admin.components = { ...modCol.admin?.components }
      modCol.admin.components.edit = { ...modCol.admin.components.edit }

      const existing = modCol.admin.components.edit.beforeDocumentControls || []
      const editComponents = [
        ...(Array.isArray(existing) ? existing : [existing]),
        '@consilioweb/payload-admin-ui-pro/client#DocumentTimeline',
        '@consilioweb/payload-admin-ui-pro/client#PresenceIndicator',
      ]

      // Inject VersionDiff only on collections that have versions enabled
      if (col.versions) {
        editComponents.push(
          '@consilioweb/payload-admin-ui-pro/client#VersionDiff',
        )
      }

      modCol.admin.components.edit.beforeDocumentControls = editComponents
      return modCol
    })

    // 5. Inject NotificationBell into afterNavLinks
    config.admin = { ...config.admin }
    config.admin.components = { ...config.admin.components }
    const existingAfterNav = config.admin.components.afterNavLinks || []
    config.admin.components.afterNavLinks = [
      ...(Array.isArray(existingAfterNav) ? existingAfterNav : [existingAfterNav]),
      '@consilioweb/payload-admin-ui-pro/client#NotificationBell',
    ]

    return config
  }
}
