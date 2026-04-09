import type { Access } from 'payload'

// ─── Plugin Config ──────────────────────────────────────────────────────────

export interface AdminUiProConfig {
  /** Enable/disable the entire plugin (default: true) */
  enabled?: boolean

  /** Module: Dashboard builder with configurable widgets */
  dashboard?: false | DashboardModuleConfig

  /** Module: Alternative list views (cards, gallery, kanban, calendar) */
  listViews?: false | ListViewsModuleConfig

  /** Module: Command palette (⌘K) for quick navigation and actions */
  quickActions?: false | QuickActionsModuleConfig

  /** Module: Enhanced field components (toggle, rating, badges, previews) */
  fieldEnhance?: false | FieldEnhanceModuleConfig

  /** Module: Custom login page, favicon, meta, onboarding */
  branding?: false | BrandingModuleConfig

  /** Module: Activity feed / audit trail */
  activity?: false | ActivityModuleConfig

  /** Sync with @consilioweb/payload-admin-theme if installed */
  theme?: { sync?: boolean }

  /** Sync with @consilioweb/admin-nav if installed */
  nav?: { sync?: boolean }

  /** Access control overrides for the global settings and per-module permissions */
  access?: {
    settings?: Access
    /** Custom permission resolver — overrides role-based defaults */
    permissions?: (user: any) => Record<string, boolean | string> | Promise<Record<string, boolean | string>>
  }

  /**
   * Override component paths for symlinked/monorepo dev.
   * Same pattern as admin-theme's themeInjectorPath.
   */
  componentPaths?: {
    loginView?: string
    loginBackground?: string
    faviconInjector?: string
  }
}

// ─── Dashboard Module ───────────────────────────────────────────────────────

export interface DashboardModuleConfig {
  /** Register custom widgets */
  widgets?: WidgetRegistration[]
  /** Default widget layout for new users */
  defaultLayout?: WidgetLayoutItem[]
  /** Max widgets per dashboard (default: 20) */
  maxWidgets?: number
  /** Allow users to customize their dashboard (default: true) */
  allowUserCustomization?: boolean
}

export interface WidgetRegistration {
  slug: string
  label: string | Record<string, string>
  /** Path to the React component (must be 'use client') */
  component: string
  /** Default grid size (default: 'medium') */
  defaultSize?: 'small' | 'medium' | 'large' | 'full'
  /** Auto-refresh interval in ms (0 = no refresh) */
  refreshInterval?: number
  /** Minimum role required to see this widget */
  minRole?: string
}

export interface WidgetLayoutItem {
  widget: string
  x: number
  y: number
  w: number
  h: number
}

// ─── List Views Module ──────────────────────────────────────────────────────

export interface ListViewsModuleConfig {
  /** Per-collection view configuration */
  collections?: Record<string, CollectionViewConfig>
  /** Auto-detect appropriate views based on field types (default: true) */
  autoDetect?: boolean
  /** Enable saved filters per user (default: true) */
  savedFilters?: boolean
}

export interface CollectionViewConfig {
  /** Available view modes */
  views: Array<'table' | 'cards' | 'gallery' | 'kanban' | 'calendar'>
  /** Default view mode */
  defaultView?: 'table' | 'cards' | 'gallery' | 'kanban' | 'calendar'
  /** Card view configuration */
  cardConfig?: {
    imageField?: string
    titleField?: string
    subtitleField?: string
    statusField?: string
    statusOptions?: string[]
  }
  /** Kanban view configuration */
  kanbanConfig?: {
    statusField: string
    columns?: string[]
  }
  /** Calendar view configuration */
  calendarConfig?: {
    dateField: string
    titleField?: string
  }
}

// ─── Quick Actions Module ───────────────────────────────────────────────────

export interface QuickActionsModuleConfig {
  /** Keyboard shortcut to open (default: 'mod+k') */
  shortcut?: string
  /** Custom actions */
  actions?: CustomAction[]
  /** Number of recent docs to show (default: 10) */
  recentDocsCount?: number
  /** Limit search to these collections (null = all) */
  searchCollections?: string[]
}

export interface CustomAction {
  id: string
  label: string | Record<string, string>
  icon?: string
  /** Action to perform */
  action: ActionDefinition
  /** Optional keyboard shortcut */
  shortcut?: string
  /** Minimum role required */
  minRole?: string
}

export type ActionDefinition =
  | { type: 'url'; url: string }
  | { type: 'navigate'; path: string }
  | { type: 'create'; collection: string }
  | { type: 'callback'; handler: () => void | Promise<void> }

// ─── Field Enhance Module ───────────────────────────────────────────────────

export interface FieldEnhanceModuleConfig {
  /** Auto-detect fields to enhance without explicit opt-in (default: false) */
  aggressive?: boolean
  /** Checkbox → toggle switch (default: true) */
  toggle?: boolean
  /** Select with status values → colored badge (default: true) */
  statusBadge?: boolean
  /** Upload fields → inline image preview (default: true) */
  imagePreview?: boolean
  /** Relationship → card with preview (default: true) */
  relationCard?: boolean
  /** Number (0-5, 0-10) → star rating (default: true) */
  rating?: boolean
}

// ─── Branding Module ────────────────────────────────────────────────────────

export interface BrandingModuleConfig {
  /** Background image URL or CSS gradient for login page */
  loginBackground?: string
  /** Login page layout (default: 'center') */
  loginLayout?: 'center' | 'split'
  /** Welcome message shown on login page */
  welcomeMessage?: string | false
  /** Custom footer text on login page */
  loginFooter?: string
  /** Override favicon URL (syncs with admin-theme if available) */
  faviconUrl?: string
  /** Custom app title suffix */
  titleSuffix?: string
}

// ─── Activity Module ────────────────────────────────────────────────────────

export interface ActivityModuleConfig {
  /** Only track these collections (null = all) */
  collections?: string[]
  /** Skip these collections */
  skipCollections?: string[]
  /** Auto-delete logs older than N days (default: 90) */
  retentionDays?: number
  /** Record which fields changed (default: true) */
  trackFields?: boolean
}

// ─── Internal Types ─────────────────────────────────────────────────────────

/** Settings stored in the AdminUiPro global */
export interface AdminUiProSettingsData {
  modulesEnabled: {
    dashboard: boolean
    listViews: boolean
    quickActions: boolean
    fieldEnhance: boolean
    branding: boolean
    activity: boolean
  }
  theme?: {
    preset: string | null
    customAccent: string | null
    customGreen: string | null
    customAmber: string | null
    customRed: string | null
  }
  brand?: {
    brandName: string | null
    logoUrl: string | null
    logoHeight: number | null
  }
  branding: {
    loginBackground: string | null
    loginLayout: 'center' | 'split'
    welcomeMessage: string | null
    loginFooter: string | null
    faviconUrl: string | null
    titleSuffix: string | null
  }
  dashboardConfig?: {
    defaultWidgets: string[] | null
    allowCustomization: boolean
    dashboardTitle?: string | null
    dashboardSubtitle?: string | null
  }
  activityConfig?: {
    retentionDays: number
    trackFields: boolean
    notificationRules?: Array<{
      id: string
      event: 'create' | 'update' | 'delete'
      collection: string
      channel: 'webhook' | 'in-app'
      webhookUrl?: string
      conditionField?: string
      conditionEquals?: string
    }>
  }
  commandPalette?: {
    shortcut: string
    recentDocsCount: number
  }
  listViewsConfig?: {
    autoDetect: boolean
    defaultView: string
    savedFilters: boolean
  }
  fieldEnhanceConfig?: {
    aggressive: boolean
    toggle: boolean
    statusBadge: boolean
    rating: boolean
    imagePreview: boolean
    relationCard: boolean
  }
  exportImport?: {
    exportConfig: unknown
  }
}

// ─── Security ───────────────────────────────────────────────────────────────

/** Fields that must never appear in activity log diffs */
export const SENSITIVE_FIELDS = [
  'password',
  'salt',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'secretKey',
  'hash',
  'resetPasswordToken',
  'resetPasswordExpiration',
  'loginAttempts',
  'lockUntil',
  '_verificationToken',
  'totpSecret',
  'refreshToken',
  'accessToken',
  'sessionToken',
  'encryptionKey',
  'privateKey',
] as const

// ─── Re-exports for public API ─────────────────────────────────────────────

export type { WidgetDefinition } from './modules/dashboard/widgetRegistry.js'
export type { AupPermissions, PermissionLevel, AupModule, PermissionsCallback } from './utils/rbac.js'

/** Max sizes for preference payloads */
export const VALIDATION_LIMITS = {
  maxWidgets: 20,
  maxWidgetTitleLength: 100,
  maxLayoutSize: 50_000,
  maxUrlLength: 2048,
  maxCssLength: 50_000,
  maxTextFieldLength: 500,
} as const
