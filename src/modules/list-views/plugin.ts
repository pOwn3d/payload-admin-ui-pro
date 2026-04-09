import type { CollectionConfig, Config } from 'payload'
import type { ListViewsModuleConfig, AdminUiProConfig, CollectionViewConfig } from '../../types.js'
import type { ViewMode } from './types.js'

/**
 * List views sub-module.
 * Adds alternative view modes (cards, gallery, kanban) to configured collections.
 *
 * For each collection:
 * - Injects a CustomListView component via beforeListTable
 * - The component renders a ViewSwitcher toolbar and the selected view
 * - Table mode passes through to Payload's default list view
 *
 * Auto-detection:
 * - Collections with upload fields → gallery view available
 * - Collections with a 'status' or '_status' select field → kanban view available
 * - All collections → cards view available
 */
export function listViewsModule(
  moduleConfig: ListViewsModuleConfig | undefined,
  pluginConfig: AdminUiProConfig,
) {
  return (incomingConfig: Config): Config => {
    const config = { ...incomingConfig }
    const collections = config.collections || []
    const collectionConfigs = moduleConfig?.collections || {}
    const autoDetect = moduleConfig?.autoDetect !== false

    // Build config map for the client-side registry
    const listViewsConfigMap: Record<string, object> = {}

    config.collections = collections.map((col) => {
      // Skip hidden and plugin collections
      if (col.admin?.hidden) return col
      if (col.slug === 'dashboard-preferences') return col

      // Get explicit config or auto-detect
      let viewConfig: CollectionViewConfig | undefined = collectionConfigs[col.slug]

      if (!viewConfig && autoDetect) {
        viewConfig = autoDetectViews(col)
      }

      if (!viewConfig || viewConfig.views.length <= 1) return col

      // Inject the CustomListView into beforeListTable
      const modifiedCol = { ...col }
      modifiedCol.admin = { ...modifiedCol.admin }
      modifiedCol.admin.components = { ...modifiedCol.admin?.components }

      // Use admin.custom to pass config to the client component
      modifiedCol.admin.custom = {
        ...modifiedCol.admin.custom,
        listViews: {
          availableViews: viewConfig.views,
          defaultView: viewConfig.defaultView || viewConfig.views[0],
          cardConfig: viewConfig.cardConfig,
          kanbanConfig: viewConfig.kanbanConfig,
        },
      }

      // Store in the config map for the initializer
      listViewsConfigMap[col.slug] = {
        availableViews: viewConfig.views,
        defaultView: viewConfig.defaultView || viewConfig.views[0],
        cardConfig: viewConfig.cardConfig,
        kanbanConfig: viewConfig.kanbanConfig,
      }

      // Register the list view component replacement
      // We use beforeListTable to inject our toolbar + views above the table
      const beforeListTable = modifiedCol.admin.components.beforeListTable || []
      modifiedCol.admin.components.beforeListTable = [
        ...(Array.isArray(beforeListTable) ? beforeListTable : [beforeListTable]),
        '@consilioweb/payload-admin-ui-pro/client#CustomListViewWrapper',
      ]

      return modifiedCol
    })

    // Inject the ListViewsInitializer + ConfigBridge into afterNavLinks
    // so they run on every admin page and populate the registry
    config.admin = { ...config.admin }
    config.admin.components = { ...config.admin.components }

    const existingAfterNav = config.admin.components.afterNavLinks || []
    config.admin.components.afterNavLinks = [
      ...(Array.isArray(existingAfterNav) ? existingAfterNav : [existingAfterNav]),
      '@consilioweb/payload-admin-ui-pro/client#ListViewsInitializer',
      {
        path: '@consilioweb/payload-admin-ui-pro/views#ListViewsConfigBridge',
        clientProps: { config: JSON.stringify(listViewsConfigMap) },
      },
    ]

    return config
  }
}

/**
 * Auto-detect appropriate view modes based on collection fields.
 */
function autoDetectViews(collection: CollectionConfig): CollectionViewConfig | undefined {
  const views: ViewMode[] = ['table']
  let cardConfig: CollectionViewConfig['cardConfig']
  let kanbanConfig: CollectionViewConfig['kanbanConfig']

  const isUpload = !!collection.upload
  const fields = collection.fields || []

  // Detect image/title/status fields
  let hasImageField = false
  let statusField: string | undefined
  let titleField: string | undefined
  let dateField: string | undefined

  for (const field of fields) {
    if (!('name' in field)) continue

    // Image detection
    if (field.type === 'upload' || field.name === 'heroImage' || field.name === 'image' || field.name === 'thumbnail') {
      hasImageField = true
    }

    // Status detection
    if (field.type === 'select' && (field.name === 'status' || field.name === '_status')) {
      statusField = field.name
    }

    // Title detection (first text field that looks like a title)
    if (!titleField && field.type === 'text' && (field.name === 'title' || field.name === 'name' || field.name === 'subject')) {
      titleField = field.name
    }

    // Date detection
    if (!dateField && field.type === 'date') {
      dateField = field.name
    }
  }

  // Upload collections → gallery
  if (isUpload) {
    views.push('gallery')
  }

  // Collections with images → cards
  if (hasImageField || titleField) {
    views.push('cards')
    cardConfig = {
      titleField: titleField || collection.admin?.useAsTitle,
      imageField: hasImageField ? 'heroImage' : undefined,
      statusField: statusField || '_status',
    }
  }

  // Collections with status field → kanban
  if (statusField) {
    views.push('kanban')
    kanbanConfig = {
      statusField,
    }
  }

  // Only return if we found more than just 'table'
  if (views.length <= 1) return undefined

  return {
    views,
    defaultView: 'table',
    cardConfig,
    kanbanConfig,
  }
}
