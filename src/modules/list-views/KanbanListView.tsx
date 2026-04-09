'use client'

import React, { useCallback, useState } from 'react'
import type { ListViewComponentProps } from './types.js'
import { InlineEditCell } from './InlineEditCell.js'

/**
 * Kanban list view — drag & drop columns by status field value.
 * Uses native HTML drag & drop (no dnd-kit dependency to keep bundle light).
 *
 * Security: Status updates go through Payload REST API with full access control.
 */
export const KanbanListView: React.FC<ListViewComponentProps> = ({
  collection,
  docs,
  loading,
  kanbanConfig,
}) => {
  const statusField = kanbanConfig?.statusField || '_status'
  const [items, setItems] = useState(docs)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  // Derive columns from config or from actual data
  const columns = kanbanConfig?.columns || deriveColumns(docs, statusField)

  // Group docs by status
  const grouped = new Map<string, typeof docs>()
  for (const col of columns) {
    grouped.set(col, [])
  }
  for (const doc of items) {
    const status = String(doc[statusField] ?? 'unknown')
    if (!grouped.has(status)) grouped.set(status, [])
    grouped.get(status)!.push(doc)
  }

  // ── Drag handlers ───────────────────────────────────────────────
  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id)
  }, [])

  const handleDrop = useCallback(
    async (targetColumn: string) => {
      if (!draggedId || updating) return
      const currentDraggedId = draggedId // Capture before state change

      const doc = items.find((d) => d.id === currentDraggedId)
      if (!doc || String(doc[statusField]) === targetColumn) {
        setDraggedId(null)
        return
      }

      // Optimistic update
      setItems((prev) =>
        prev.map((d) =>
          d.id === currentDraggedId ? { ...d, [statusField]: targetColumn } : d,
        ),
      )
      setDraggedId(null)
      setUpdating(currentDraggedId)

      // Persist via Payload REST API
      try {
        const res = await fetch(`/api/${collection}/${currentDraggedId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [statusField]: targetColumn }),
        })
        if (!res.ok) {
          // Revert on failure
          setItems((prev) =>
            prev.map((d) =>
              d.id === currentDraggedId ? doc : d,
            ),
          )
        }
      } catch {
        // Revert on error
        setItems((prev) =>
          prev.map((d) =>
            d.id === draggedId ? doc : d,
          ),
        )
      } finally {
        setUpdating(null)
      }
    },
    [draggedId, items, collection, statusField],
  )

  const handleInlineTitleSaved = useCallback(
    (docId: string | number, newValue: string | number) => {
      setItems((prev) =>
        prev.map((d) => {
          if (d.id === docId) {
            // Update whichever title field exists
            const field = d.title != null ? 'title' : d.name != null ? 'name' : d.subject != null ? 'subject' : 'title'
            return { ...d, [field]: newValue }
          }
          return d
        }),
      )
    },
    [],
  )

  // Sync docs when parent data changes
  React.useEffect(() => {
    setItems(docs)
  }, [docs])

  if (loading) {
    return <div style={loadingStyle}>Loading...</div>
  }

  return (
    <div className="aup-kanban-board" style={boardStyle}>
      {columns.map((column) => {
        const columnDocs = grouped.get(column) || []

        return (
          <div
            key={column}
            className="aup-kanban-column"
            style={columnStyle}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(column)}
          >
            {/* Column header */}
            <div style={columnHeaderStyle}>
              <span style={columnTitleStyle}>{formatColumn(column)}</span>
              <span style={countBadgeStyle}>{columnDocs.length}</span>
            </div>

            {/* Cards */}
            <div style={columnBodyStyle}>
              {columnDocs.map((doc) => {
                const title = resolveTitle(doc)
                const isBeingUpdated = updating === doc.id

                return (
                  <div
                    key={doc.id}
                    draggable
                    onDragStart={() => handleDragStart(doc.id)}
                    style={{
                      ...kanbanCardStyle,
                      opacity: draggedId === doc.id ? 0.4 : isBeingUpdated ? 0.7 : 1,
                      cursor: 'grab',
                    }}
                  >
                    <a
                      href={`/admin/collections/${collection}/${doc.id}`}
                      style={cardLinkStyle}
                      onClick={(e) => {
                        // Prevent navigation during drag or inline edit
                        if (draggedId) e.preventDefault()
                        const target = e.target as HTMLElement
                        if (target.closest('[data-inline-edit]')) e.preventDefault()
                      }}
                    >
                      <span style={cardTitleStyle} data-inline-edit>
                        <InlineEditCell
                          collection={collection}
                          docId={doc.id}
                          fieldName={resolveTitleField(doc)}
                          value={title}
                          type="text"
                          onSaved={(newVal) =>
                            handleInlineTitleSaved(doc.id, newVal)
                          }
                        />
                      </span>
                      {typeof doc.updatedAt === 'string' && (
                        <span style={cardMetaStyle}>
                          {timeAgo(doc.updatedAt)}
                        </span>
                      )}
                    </a>
                    {isBeingUpdated && (
                      <span style={spinnerStyle}>⟳</span>
                    )}
                  </div>
                )
              })}

              {columnDocs.length === 0 && (
                <div style={emptyColumnStyle}>No items</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function deriveColumns(docs: Record<string, unknown>[], field: string): string[] {
  const seen = new Set<string>()
  for (const doc of docs) {
    const val = doc[field]
    if (typeof val === 'string') seen.add(val)
  }
  // Default columns if none found
  if (seen.size === 0) return ['draft', 'published']
  return Array.from(seen)
}

function resolveTitle(doc: Record<string, unknown>): string {
  return (
    (doc.title as string) ||
    (doc.name as string) ||
    (doc.subject as string) ||
    `#${doc.id}`
  )
}

function resolveTitleField(doc: Record<string, unknown>): string {
  if (doc.title != null) return 'title'
  if (doc.name != null) return 'name'
  if (doc.subject != null) return 'subject'
  return 'title'
}

function formatColumn(col: string): string {
  return col.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const boardStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  overflowX: 'auto',
  padding: '0.5rem 0',
  minHeight: '400px',
}

const columnStyle: React.CSSProperties = {
  flex: '0 0 280px',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'var(--theme-elevation-50)',
  borderRadius: 'var(--style-radius-m, 10px)',
  overflow: 'hidden',
}

const columnHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  borderBottom: '1px solid var(--theme-elevation-150)',
}

const columnTitleStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  fontWeight: 700,
  color: 'var(--theme-elevation-700)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const countBadgeStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 600,
  padding: '0.125rem 0.5rem',
  borderRadius: '9999px',
  backgroundColor: 'var(--theme-elevation-150)',
  color: 'var(--theme-elevation-600)',
}

const columnBodyStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  minHeight: '200px',
}

const kanbanCardStyle: React.CSSProperties = {
  position: 'relative',
  backgroundColor: 'var(--theme-elevation-0)',
  borderRadius: 'var(--style-radius-s, 6px)',
  border: '1px solid var(--theme-elevation-150)',
  transition: 'opacity 0.15s ease, box-shadow 0.15s ease',
}

const cardLinkStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: '0.75rem',
  textDecoration: 'none',
  gap: '0.25rem',
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: 'var(--theme-text)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const cardMetaStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  color: 'var(--theme-elevation-400)',
}

const emptyColumnStyle: React.CSSProperties = {
  padding: '1rem',
  textAlign: 'center',
  fontSize: '0.75rem',
  color: 'var(--theme-elevation-400)',
}

const spinnerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '0.5rem',
  right: '0.5rem',
  fontSize: '0.875rem',
  animation: 'spin 1s linear infinite',
}

const loadingStyle: React.CSSProperties = {
  padding: '2rem',
  textAlign: 'center',
  color: 'var(--theme-elevation-500)',
}
