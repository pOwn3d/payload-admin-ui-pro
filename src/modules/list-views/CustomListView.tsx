'use client'

import React, { useCallback, useEffect, useState } from 'react'
import type { ViewMode, DocItem } from './types.js'
import { getCachedViewMode, setCachedViewMode, loadCachedViewPrefs } from './types.js'
import { ViewSwitcher } from './ViewSwitcher.js'
import { CardListView } from './CardListView.js'
import { GalleryListView } from './GalleryListView.js'
import { KanbanListView } from './KanbanListView.js'

interface CustomListViewProps {
  /** Collection slug */
  collection: string
  /** Available view modes for this collection */
  availableViews: ViewMode[]
  /** Default view mode */
  defaultView: ViewMode
  /** Card config */
  cardConfig?: {
    imageField?: string
    titleField?: string
    subtitleField?: string
    statusField?: string
  }
  /** Kanban config */
  kanbanConfig?: {
    statusField: string
    columns?: string[]
  }
}

/**
 * Custom list view wrapper.
 * Shows a ViewSwitcher toolbar and renders the selected view mode.
 * When in 'table' mode, renders nothing (lets Payload's default list through).
 *
 * Injected via beforeListTable on target collections.
 */
export const CustomListView: React.FC<CustomListViewProps> = ({
  collection,
  availableViews,
  defaultView,
  cardConfig,
  kanbanConfig,
}) => {
  // Load cached preferences on mount
  useEffect(() => {
    loadCachedViewPrefs()
  }, [])

  const cached = getCachedViewMode(collection)
  const [mode, setMode] = useState<ViewMode>(cached || defaultView)
  const [docs, setDocs] = useState<DocItem[]>([])
  const [totalDocs, setTotalDocs] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const limit = 20

  // Fetch docs when in a non-table mode
  const fetchDocs = useCallback(
    async (pageNum: number) => {
      if (mode === 'table') return
      setLoading(true)

      try {
        // Build URL with depth for relationships
        const depth = mode === 'cards' ? 1 : 0
        const sort = '-updatedAt'
        const url = `/api/${collection}?limit=${limit}&page=${pageNum}&depth=${depth}&sort=${sort}`

        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) {
          setLoading(false)
          return
        }
        const data = await res.json()
        setDocs(data.docs || [])
        setTotalDocs(data.totalDocs || 0)
      } catch {
        // Keep current state on error
      } finally {
        setLoading(false)
      }
    },
    [collection, mode, limit],
  )

  // Fetch on mode change or page change
  useEffect(() => {
    if (mode !== 'table') {
      fetchDocs(page)
    }
  }, [mode, page, fetchDocs])

  // Handle view mode change
  const handleModeChange = useCallback(
    (newMode: ViewMode) => {
      setMode(newMode)
      setCachedViewMode(collection, newMode)
      setPage(1)
    },
    [collection],
  )

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  // If table mode, only show the switcher (the default Payload table renders below)
  if (mode === 'table') {
    return (
      <div style={toolbarStyle}>
        <ViewSwitcher
          current={mode}
          available={availableViews}
          onChange={handleModeChange}
        />
      </div>
    )
  }

  // Shared props for all list view components
  const viewProps = {
    collection,
    docs,
    totalDocs,
    page,
    limit,
    loading,
    onPageChange: handlePageChange,
    cardConfig,
    kanbanConfig,
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <ViewSwitcher
          current={mode}
          available={availableViews}
          onChange={handleModeChange}
        />
        <span style={countStyle}>
          {totalDocs} document{totalDocs !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Active view */}
      {mode === 'cards' && <CardListView {...viewProps} />}
      {mode === 'gallery' && <GalleryListView {...viewProps} />}
      {mode === 'kanban' && <KanbanListView {...viewProps} />}

      {/* Hide the default Payload table when not in table mode */}
      <style>{`
        .collection-list__table,
        .list-controls,
        .collection-list .table {
          display: none !important;
        }
      `}</style>
    </div>
  )
}

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.75rem 0',
  marginBottom: '0.5rem',
}

const countStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--theme-elevation-500)',
}
