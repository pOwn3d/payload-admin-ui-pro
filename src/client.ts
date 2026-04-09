// Client-side barrel — re-exports only, NO 'use client' directive here.
// Individual component files get "use client" prepended by tsup onSuccess.
// This pattern is required for Next.js 16 Turbopack compatibility.
//
// No createContext anywhere in this module tree — safe for Turbopack SSR bundling.

// Branding module
export { LoginBackground } from './modules/branding/LoginBackground.js'
export { FaviconInjector } from './modules/branding/FaviconInjector.js'

// Dashboard module
export { DashboardViewClient } from './modules/dashboard/DashboardViewClient.js'
export { DashboardClient } from './modules/dashboard/DashboardClient.js'
export { StatsWidget } from './modules/dashboard/widgets/StatsWidget.js'
export { RecentActivityWidget } from './modules/dashboard/widgets/RecentActivityWidget.js'
export { QuickActionsWidget } from './modules/dashboard/widgets/QuickActionsWidget.js'
export { CollectionOverviewWidget } from './modules/dashboard/widgets/CollectionOverviewWidget.js'
export { WelcomeWidget } from './modules/dashboard/widgets/WelcomeWidget.js'
export { BookmarksWidget, addBookmark, removeBookmark, isBookmarked, getBookmarks } from './modules/dashboard/widgets/BookmarksWidget.js'
export { NotesWidget } from './modules/dashboard/widgets/NotesWidget.js'
export { ChartWidget } from './modules/dashboard/widgets/ChartWidget.js'
export { registerWidget, getRegisteredWidgets } from './modules/dashboard/widgetRegistry.js'

// List views module
export { ViewSwitcher } from './modules/list-views/ViewSwitcher.js'
export { CardListView } from './modules/list-views/CardListView.js'
export { GalleryListView } from './modules/list-views/GalleryListView.js'
export { KanbanListView } from './modules/list-views/KanbanListView.js'
export { CalendarListView } from './modules/list-views/CalendarListView.js'
export { CustomListView } from './modules/list-views/CustomListView.js'
export { CustomListViewWrapper, registerListViewConfig } from './modules/list-views/CustomListViewWrapper.js'
export { ListViewsInitializer } from './modules/list-views/ListViewsInitializer.js'
export { SavedFilters } from './modules/list-views/SavedFilters.js'
export { SavedViews } from './modules/list-views/SavedViews.js'
export { BulkActionBar } from './modules/list-views/BulkActionBar.js'
export { ExportButton } from './modules/list-views/ExportButton.js'
export { BulkEditModal } from './modules/list-views/BulkEditModal.js'
export { InlineEditCell } from './modules/list-views/InlineEditCell.js'
export { useBulkSelect, bulkUpdateStatus, bulkDelete } from './modules/list-views/useBulkSelect.js'

// Quick actions module
export { CommandPalette } from './modules/quick-actions/CommandPalette.js'
export { CommandPaletteProvider } from './modules/quick-actions/CommandPaletteProvider.js'
export { KeyboardShortcuts } from './modules/quick-actions/KeyboardShortcuts.js'

// Field enhance module
export { ToggleField } from './modules/field-enhance/ToggleField.js'
export { StatusBadgeField, StatusBadgeCell } from './modules/field-enhance/StatusBadgeField.js'
export { ImagePreviewField } from './modules/field-enhance/ImagePreviewField.js'
export { RatingField } from './modules/field-enhance/RatingField.js'
export { RelationCardField } from './modules/field-enhance/RelationCardField.js'

// Activity module
export { ActivityFeedWidget } from './modules/activity/ActivityFeedWidget.js'
export { NotificationBell } from './modules/activity/NotificationBell.js'
export { PresenceIndicator } from './modules/activity/PresenceIndicator.js'
export { DocumentTimeline } from './modules/activity/DocumentTimeline.js'
export { VersionDiff } from './modules/activity/VersionDiff.js'

// Settings reloader + theme preview + export/import
export { SettingsReloader } from './modules/branding/SettingsReloader.js'
export { ThemePreview } from './modules/branding/ThemePreview.js'
export { ExportImportUI } from './modules/branding/ExportImportUI.js'
export { DarkModeToggle } from './modules/branding/DarkModeToggle.js'
export { ThemeMarketplace } from './modules/branding/ThemeMarketplace.js'
export { PluginsHub } from './modules/branding/PluginsHub.js'

// Activity analytics
export { ActivityAnalytics } from './modules/activity/ActivityAnalytics.js'

// Utils (client-safe)
export { fetchSettings, invalidateSettingsCache } from './utils/settingsCache.js'
export { fetchCollections, invalidateCollectionsCache } from './utils/collectionsCache.js'
