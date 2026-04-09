import { defineConfig, type Options } from 'tsup'
import { rmSync } from 'fs'

const externals = [
  'payload',
  'payload/shared',
  '@payloadcms/ui',
  '@payloadcms/translations',
  '@payloadcms/next',
  '@payloadcms/next/templates',
  'react',
  'react-dom',
  'react/jsx-runtime',
  'next',
  'next/navigation',
  'next/link',
  'next/server',
  'next/headers',
  // Peer plugin deps
  '@consilioweb/payload-admin-theme',
  '@consilioweb/payload-admin-theme/client',
  '@consilioweb/payload-admin-theme/rsc',
  '@consilioweb/admin-nav',
  '@consilioweb/admin-nav/client',
  // Self-references
  '@consilioweb/payload-admin-ui-pro',
  '@consilioweb/payload-admin-ui-pro/client',
  '@consilioweb/payload-admin-ui-pro/views',
]

// Clean dist once before build
rmSync('dist', { recursive: true, force: true })

const sharedConfig: Partial<Options> = {
  format: ['esm'],
  dts: true,
  sourcemap: false,
  splitting: false,
  treeshake: true,
  target: 'es2022',
  external: externals,
  clean: false,
  bundle: false,
}

export default defineConfig([
  // Pass 1: Server entry — plugin + types + globals + modules
  {
    ...sharedConfig,
    entry: { index: 'src/index.ts' },
    bundle: true,
    format: ['esm', 'cjs'],
  },

  // Pass 2: RSC views — server components (NO 'use client')
  {
    ...sharedConfig,
    entry: [
      'src/views.ts',
      'src/modules/branding/LoginView.tsx',
      'src/modules/branding/BrandingConfigBridge.tsx',
      'src/modules/branding/SettingsNavLink.tsx',
      'src/modules/dashboard/DashboardView.tsx',
      'src/modules/list-views/ListViewsConfigBridge.tsx',
    ],
  },

  // Pass 3: Client components — individual files with 'use client' prepended
  {
    ...sharedConfig,
    entry: [
      'src/client.ts',
      'src/modules/branding/LoginBackground.tsx',
      'src/modules/branding/FaviconInjector.tsx',
      'src/modules/dashboard/DashboardViewClient.tsx',
      'src/modules/dashboard/DashboardClient.tsx',
      'src/modules/dashboard/widgets/StatsWidget.tsx',
      'src/modules/dashboard/widgets/RecentActivityWidget.tsx',
      'src/modules/dashboard/widgets/QuickActionsWidget.tsx',
      'src/modules/dashboard/widgets/CollectionOverviewWidget.tsx',
      'src/modules/dashboard/types.ts',
      'src/modules/list-views/types.ts',
      'src/modules/list-views/ViewSwitcher.tsx',
      'src/modules/list-views/CardListView.tsx',
      'src/modules/list-views/GalleryListView.tsx',
      'src/modules/list-views/KanbanListView.tsx',
      'src/modules/list-views/CustomListView.tsx',
      'src/modules/list-views/CustomListViewWrapper.tsx',
      'src/modules/list-views/ListViewsInitializer.tsx',
      'src/modules/quick-actions/CommandPalette.tsx',
      'src/modules/quick-actions/CommandPaletteProvider.tsx',
      'src/modules/field-enhance/ToggleField.tsx',
      'src/modules/field-enhance/StatusBadgeField.tsx',
      'src/modules/field-enhance/ImagePreviewField.tsx',
      'src/modules/field-enhance/RatingField.tsx',
      'src/modules/field-enhance/RelationCardField.tsx',
      'src/modules/branding/SettingsReloader.tsx',
      'src/modules/branding/ThemePreview.tsx',
      'src/modules/activity/ActivityFeedWidget.tsx',
      'src/modules/activity/NotificationBell.tsx',
      'src/modules/activity/PresenceIndicator.tsx',
      'src/modules/branding/ExportImportUI.tsx',
      'src/modules/branding/ThemeMarketplace.tsx',
      'src/modules/dashboard/widgets/WelcomeWidget.tsx',
      'src/modules/list-views/CalendarListView.tsx',
      'src/modules/list-views/SavedFilters.tsx',
      'src/modules/list-views/SavedViews.tsx',
      'src/modules/list-views/BulkActionBar.tsx',
      'src/modules/list-views/useBulkSelect.ts',
      'src/modules/quick-actions/KeyboardShortcuts.tsx',
      'src/modules/branding/DarkModeToggle.tsx',
      'src/modules/list-views/ExportButton.tsx',
      'src/modules/activity/DocumentTimeline.tsx',
      'src/modules/activity/VersionDiff.tsx',
      'src/modules/activity/diffFields.ts',
      'src/modules/dashboard/widgets/BookmarksWidget.tsx',
      'src/modules/dashboard/widgets/NotesWidget.tsx',
      'src/modules/dashboard/widgets/ChartWidget.tsx',
      'src/modules/dashboard/widgetRegistry.ts',
      'src/modules/list-views/BulkEditModal.tsx',
      'src/modules/list-views/InlineEditCell.tsx',
      'src/modules/branding/PluginsHub.tsx',
      'src/modules/activity/ActivityAnalytics.tsx',
      'src/styles/tokens.ts',
      'src/styles/theme-presets.ts',
      'src/utils/themeApplier.ts',
      'src/utils/useTranslation.ts',
      'src/utils/collectionsCache.ts',
      'src/utils/settingsCache.ts',
      'src/utils/security.ts',
    ],
    onSuccess: async () => {
      const { readdirSync, readFileSync, writeFileSync, statSync } = await import('fs')
      const { join } = await import('path')

      // RSC files that must NOT get "use client" — they are server components
      const RSC_FILES = new Set([
        'BrandingConfigBridge.js',
        'DashboardView.js',
        'LoginView.js',
        'ListViewsConfigBridge.js',
        'SettingsNavLink.js',
      ])

      function addUseClient(dir: string) {
        try {
          for (const file of readdirSync(dir)) {
            const path = join(dir, file)
            if (statSync(path).isDirectory()) { addUseClient(path); continue }
            if (!file.endsWith('.js')) continue
            if (RSC_FILES.has(file)) continue // Skip RSC files
            const content = readFileSync(path, 'utf-8')
            if (!content.startsWith('"use client"')) {
              writeFileSync(path, '"use client";\n' + content)
            }
          }
        } catch {
          // Directory may not exist yet
        }
      }

      addUseClient('dist/modules')
      addUseClient('dist/utils')
      console.log('Prepended "use client" to client component/util files (skipped RSC)')
    },
  },
])
