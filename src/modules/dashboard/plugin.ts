import type { Config } from 'payload'
import type { DashboardModuleConfig, AdminUiProConfig } from '../../types.js'
import { createDashboardPreferencesCollection } from './collection.js'
import { createDashboardEndpoints } from './endpoints.js'

const COLLECTION_SLUG = 'dashboard-preferences'

/**
 * Dashboard sub-module.
 * Replaces the default Payload dashboard with a widget-based builder.
 *
 * Adds:
 * - A 'dashboard-preferences' collection (hidden, per-user layouts)
 * - API endpoints for GET/PATCH/DELETE dashboard preferences
 * - Custom dashboard view replacing the default
 */
export function dashboardModule(
  moduleConfig: DashboardModuleConfig | undefined,
  pluginConfig: AdminUiProConfig,
) {
  return (incomingConfig: Config): Config => {
    const config = { ...incomingConfig }

    // 1. Add dashboard preferences collection
    config.collections = [
      ...(config.collections || []),
      createDashboardPreferencesCollection(COLLECTION_SLUG),
    ]

    // 2. Add API endpoints
    config.endpoints = [
      ...(config.endpoints || []),
      ...createDashboardEndpoints(COLLECTION_SLUG),
    ]

    // 3. Replace the default dashboard view
    config.admin = { ...config.admin }
    config.admin.components = { ...config.admin.components }
    config.admin.components.views = {
      ...config.admin.components.views,
      dashboard: {
        Component:
          '@consilioweb/payload-admin-ui-pro/views#DashboardView',
      },
    }

    return config
  }
}
