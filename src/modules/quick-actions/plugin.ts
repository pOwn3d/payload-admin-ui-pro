import type { Config } from 'payload'
import type { QuickActionsModuleConfig, AdminUiProConfig } from '../../types.js'

/**
 * Quick Actions sub-module.
 * Injects a Command Palette (⌘K) accessible from any admin page.
 *
 * Uses `providers` injection to wrap the entire admin app.
 * This ensures the command palette renders above everything,
 * including when admin-nav hides afterNavLinks siblings.
 */
export function quickActionsModule(
  moduleConfig: QuickActionsModuleConfig | undefined,
  _pluginConfig: AdminUiProConfig,
) {
  return (incomingConfig: Config): Config => {
    const config = { ...incomingConfig }
    config.admin = { ...config.admin }
    config.admin.components = { ...config.admin.components }

    // Inject CommandPalette into providers (wraps entire admin, not hidden by admin-nav)
    const existingProviders = config.admin.components.providers || []
    config.admin.components.providers = [
      ...(Array.isArray(existingProviders) ? existingProviders : [existingProviders]),
      '@consilioweb/payload-admin-ui-pro/client#CommandPaletteProvider',
    ]

    return config
  }
}
