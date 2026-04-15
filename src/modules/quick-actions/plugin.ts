import type { Config } from 'payload'
import type { QuickActionsModuleConfig, AdminUiProConfig } from '../../types.js'

/**
 * Quick Actions sub-module.
 * Injects a Command Palette (Cmd+K) accessible from any admin page.
 *
 * Uses `afterNavLinks` injection (NOT providers) to avoid wrapping the
 * entire admin component tree, which causes hydration mismatches (#310)
 * with Payload 3.82+.
 */
export function quickActionsModule(
  moduleConfig: QuickActionsModuleConfig | undefined,
  _pluginConfig: AdminUiProConfig,
) {
  return (incomingConfig: Config): Config => {
    const config = { ...incomingConfig }
    config.admin = { ...config.admin }
    config.admin.components = { ...config.admin.components }

    // Inject CommandPalette + KeyboardShortcuts as afterNavLinks
    // (renders inside the nav area, does NOT wrap the component tree)
    const existingAfterNav = config.admin.components.afterNavLinks || []
    config.admin.components.afterNavLinks = [
      ...(Array.isArray(existingAfterNav) ? existingAfterNav : [existingAfterNav]),
      '@consilioweb/payload-admin-ui-pro/client#CommandPaletteProvider',
    ]

    return config
  }
}
