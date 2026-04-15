/**
 * Payload CMS Admin UI Pro Plugin.
 *
 * Modular plugin that transforms the Payload admin panel:
 * - Dashboard builder with configurable widgets
 * - Custom list views (cards, gallery, kanban, calendar)
 * - Command palette (⌘K) for quick navigation
 * - Enhanced field components (toggles, ratings, badges)
 * - Custom login page branding
 * - Activity feed / audit trail
 *
 * Each module is independently activatable.
 * Optionally integrates with @consilioweb/payload-admin-theme and @consilioweb/payload-admin-nav.
 *
 * Usage:
 *   import { adminUiProPlugin } from '@consilioweb/payload-admin-ui-pro'
 *
 *   export default buildConfig({
 *     plugins: [
 *       adminUiProPlugin({
 *         branding: {
 *           loginBackground: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
 *           welcomeMessage: 'Welcome to the admin panel',
 *         },
 *       }),
 *     ],
 *   })
 */

import type { Config, Plugin } from 'payload'
import { deepMergeSimple } from 'payload/shared'
import type { AdminUiProConfig } from './types.js'
import { createAdminUiProSettingsGlobal } from './globals/AdminUiProSettings.js'
import { brandingModule } from './modules/branding/plugin.js'
import { dashboardModule } from './modules/dashboard/plugin.js'
import { listViewsModule } from './modules/list-views/plugin.js'
import { quickActionsModule } from './modules/quick-actions/plugin.js'
import { fieldEnhanceModule } from './modules/field-enhance/plugin.js'
import { activityModule } from './modules/activity/plugin.js'
import { translations } from './translations/index.js'

export const adminUiProPlugin =
  (pluginConfig: AdminUiProConfig = {}): Plugin =>
  (incomingConfig: Config): Config => {
    // Allow disabling the plugin entirely
    if (pluginConfig.enabled === false) return incomingConfig

    let config = { ...incomingConfig }

    // ── 1. Merge i18n translations ────────────────────────────────
    config.i18n = config.i18n || {}
    const existingTranslations = (config.i18n.translations || {}) as Record<string, Record<string, unknown>>
    for (const [locale, strings] of Object.entries(translations)) {
      existingTranslations[locale] = deepMergeSimple(
        existingTranslations[locale] || {},
        strings,
      )
    }
    config.i18n.translations = existingTranslations as typeof config.i18n.translations

    // ── 2. Add the settings global ────────────────────────────────
    config.globals = [
      ...(config.globals || []),
      createAdminUiProSettingsGlobal(pluginConfig),
    ]

    // ── 3. Deep clone admin to avoid mutating incoming config ─────
    config.admin = { ...config.admin }
    config.admin.components = { ...config.admin.components }

    // ── 4. Apply active modules ───────────────────────────────────

    // Module: Branding (login page, favicon, title)
    if (pluginConfig.branding !== false) {
      const brandingConfig = typeof pluginConfig.branding === 'object'
        ? pluginConfig.branding
        : undefined
      config = brandingModule(brandingConfig, pluginConfig)(config)
    }

    // Module: Dashboard builder with configurable widgets
    if (pluginConfig.dashboard !== false) {
      const dashboardConfig = typeof pluginConfig.dashboard === 'object'
        ? pluginConfig.dashboard
        : undefined
      config = dashboardModule(dashboardConfig, pluginConfig)(config)
    }

    // Module: List Views (cards, gallery, kanban) with auto-detection
    if (pluginConfig.listViews !== false) {
      const listViewsConfig = typeof pluginConfig.listViews === 'object'
        ? pluginConfig.listViews
        : undefined
      config = listViewsModule(listViewsConfig, pluginConfig)(config)
    }

    // Module: Command palette (⌘K) for quick navigation
    if (pluginConfig.quickActions !== false) {
      const quickActionsConfig = typeof pluginConfig.quickActions === 'object'
        ? pluginConfig.quickActions
        : undefined
      config = quickActionsModule(quickActionsConfig, pluginConfig)(config)
    }

    // Module: Enhanced field components (toggle, badge, rating, preview, card)
    if (pluginConfig.fieldEnhance !== false) {
      const fieldEnhanceConfig = typeof pluginConfig.fieldEnhance === 'object'
        ? pluginConfig.fieldEnhance
        : undefined
      config = fieldEnhanceModule(fieldEnhanceConfig, pluginConfig)(config)
    }

    // Module: Activity feed / audit trail
    if (pluginConfig.activity !== false) {
      const activityConfig = typeof pluginConfig.activity === 'object'
        ? pluginConfig.activity
        : undefined
      config = activityModule(activityConfig, pluginConfig)(config)
    }

    return config
  }
