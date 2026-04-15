import type { Config } from 'payload'
import type { BrandingModuleConfig, AdminUiProConfig } from '../../types.js'

/**
 * Branding sub-module.
 * Injects custom login page components and favicon.
 */
export function brandingModule(
  moduleConfig: BrandingModuleConfig | undefined,
  pluginConfig: AdminUiProConfig,
) {
  return (incomingConfig: Config): Config => {
    const config = { ...incomingConfig }
    config.admin = { ...config.admin }
    config.admin.components = { ...config.admin.components }

    // 1. Inject LoginBackground into beforeLogin
    const loginBackgroundPath =
      pluginConfig.componentPaths?.loginBackground ??
      '@consilioweb/payload-admin-ui-pro/client#LoginBackground'

    // Inject BrandingConfigBridge (RSC) to pass config values to client
    const brandingConfig = JSON.stringify({
      loginBackground: moduleConfig?.loginBackground || null,
      loginLayout: moduleConfig?.loginLayout || 'center',
      welcomeMessage: moduleConfig?.welcomeMessage || null,
      loginFooter: moduleConfig?.loginFooter || null,
    })

    // Keep ConfigBridge in beforeLogin for fallback config values
    const existingBeforeLogin = config.admin.components.beforeLogin || []
    config.admin.components.beforeLogin = [
      {
        path: '@consilioweb/payload-admin-ui-pro/views#BrandingConfigBridge',
        clientProps: { config: brandingConfig },
      },
      ...(Array.isArray(existingBeforeLogin) ? existingBeforeLogin : [existingBeforeLogin]),
    ]

    // 2. Inject LoginBackground into beforeLogin (NOT providers).
    //    Using providers wraps the ENTIRE admin tree which causes
    //    hydration mismatches (#310) with Payload 3.82+.
    //    beforeLogin only renders on auth pages — safe.
    config.admin.components.beforeLogin = [
      ...(config.admin.components.beforeLogin || []),
      loginBackgroundPath,
    ]

    // 3. Inject FaviconInjector into afterNavLinks (runs on every admin page)
    const faviconPath =
      pluginConfig.componentPaths?.faviconInjector ??
      '@consilioweb/payload-admin-ui-pro/client#FaviconInjector'

    const existingAfterNav = config.admin.components.afterNavLinks || []
    config.admin.components.afterNavLinks = [
      ...(Array.isArray(existingAfterNav) ? existingAfterNav : [existingAfterNav]),
      faviconPath,
      '@consilioweb/payload-admin-ui-pro/client#DarkModeToggle',
    ]

    // 3. Set titleSuffix if provided
    if (moduleConfig?.titleSuffix) {
      config.admin.meta = {
        ...config.admin.meta,
        titleSuffix: ` — ${moduleConfig.titleSuffix}`,
      }
    }

    return config
  }
}
