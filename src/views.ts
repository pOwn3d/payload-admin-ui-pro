// RSC view exports — server components (NO 'use client' directive)
// These are registered in Payload's importMap and serialised through the RSC stream.

// Dashboard
export { DashboardView } from './modules/dashboard/DashboardView.js'

// Branding
export { BrandingConfigBridge } from './modules/branding/BrandingConfigBridge.js'
export { SettingsNavLink } from './modules/branding/SettingsNavLink.js'

// List views
export { ListViewsConfigBridge } from './modules/list-views/ListViewsConfigBridge.js'
