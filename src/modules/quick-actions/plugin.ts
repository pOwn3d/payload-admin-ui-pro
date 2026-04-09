import type { Config } from 'payload'
import type { QuickActionsModuleConfig, AdminUiProConfig } from '../../types.js'

/**
 * Quick Actions sub-module.
 * Injects a Command Palette (⌘K) accessible from any admin page.
 *
 * Uses afterNavLinks injection to mount on every page.
 * The component is client-only, renders nothing until ⌘K is pressed.
 */
export function quickActionsModule(
  moduleConfig: QuickActionsModuleConfig | undefined,
  _pluginConfig: AdminUiProConfig,
) {
  return (incomingConfig: Config): Config => {
    const config = { ...incomingConfig }
    config.admin = { ...config.admin }
    config.admin.components = { ...config.admin.components }

    // Inject CommandPalette into afterNavLinks (runs on every admin page, renders nothing until opened)
    const existingAfterNav = config.admin.components.afterNavLinks || []
    config.admin.components.afterNavLinks = [
      ...(Array.isArray(existingAfterNav) ? existingAfterNav : [existingAfterNav]),
      '@consilioweb/payload-admin-ui-pro/client#CommandPalette',
    ]

    return config
  }
}
