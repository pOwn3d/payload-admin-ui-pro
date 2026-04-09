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

// List views module
export { ViewSwitcher } from './modules/list-views/ViewSwitcher.js'
export { CardListView } from './modules/list-views/CardListView.js'
export { GalleryListView } from './modules/list-views/GalleryListView.js'
export { KanbanListView } from './modules/list-views/KanbanListView.js'
export { CustomListView } from './modules/list-views/CustomListView.js'
export { CustomListViewWrapper, registerListViewConfig } from './modules/list-views/CustomListViewWrapper.js'
export { ListViewsInitializer } from './modules/list-views/ListViewsInitializer.js'

// Quick actions module
export { CommandPalette } from './modules/quick-actions/CommandPalette.js'

// Field enhance module
export { ToggleField } from './modules/field-enhance/ToggleField.js'
export { StatusBadgeField, StatusBadgeCell } from './modules/field-enhance/StatusBadgeField.js'
export { ImagePreviewField } from './modules/field-enhance/ImagePreviewField.js'
export { RatingField } from './modules/field-enhance/RatingField.js'
export { RelationCardField } from './modules/field-enhance/RelationCardField.js'

// Activity module
export { ActivityFeedWidget } from './modules/activity/ActivityFeedWidget.js'

// Settings reloader
export { SettingsReloader } from './modules/branding/SettingsReloader.js'

// Utils (client-safe)
export { fetchSettings, invalidateSettingsCache } from './utils/settingsCache.js'
export { fetchCollections, invalidateCollectionsCache } from './utils/collectionsCache.js'
