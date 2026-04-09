/** Available view modes for list views */
export type ViewMode = 'table' | 'cards' | 'gallery' | 'kanban' | 'calendar'

/** Props passed to custom list view components */
export interface ListViewComponentProps {
  /** Collection slug */
  collection: string
  /** Documents fetched from API */
  docs: DocItem[]
  /** Total number of documents matching the query */
  totalDocs: number
  /** Current page number */
  page: number
  /** Documents per page */
  limit: number
  /** Whether data is currently loading */
  loading: boolean
  /** Callback to change page */
  onPageChange: (page: number) => void
  /** Card config from plugin settings */
  cardConfig?: {
    imageField?: string
    titleField?: string
    subtitleField?: string
    statusField?: string
    statusOptions?: string[]
  }
  /** Kanban config from plugin settings */
  kanbanConfig?: {
    statusField: string
    columns?: string[]
  }
}

/** Generic document item from Payload API */
export interface DocItem {
  id: string
  [key: string]: unknown
}

/** Stored user preference for a collection's view mode */
export interface ViewPreference {
  collection: string
  mode: ViewMode
}

/** Module-level cache for view preferences */
const _viewPrefs = new Map<string, ViewMode>()

export function getCachedViewMode(collection: string): ViewMode | undefined {
  return _viewPrefs.get(collection)
}

const STORAGE_KEY = 'admin-ui-pro-view-prefs'

export function setCachedViewMode(collection: string, mode: ViewMode): void {
  _viewPrefs.set(collection, mode)
  // Persist to localStorage (survives page reloads and browser restarts)
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    stored[collection] = mode
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // localStorage may not be available
  }
}

export function loadCachedViewPrefs(): void {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    for (const [key, value] of Object.entries(stored)) {
      if (typeof value === 'string' && ['table', 'cards', 'gallery', 'kanban', 'calendar'].includes(value)) {
        _viewPrefs.set(key, value as ViewMode)
      }
    }
  } catch {
    // Ignore
  }
}
