'use client'

import { useCallback, useState } from 'react'

/**
 * Hook for managing bulk selection state in list views.
 */
export function useBulkSelect(allIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelected(new Set(allIds))
  }, [allIds])

  const deselectAll = useCallback(() => {
    setSelected(new Set())
  }, [])

  const isSelected = useCallback((id: string) => selected.has(id), [selected])

  return { selected, toggle, selectAll, deselectAll, isSelected, count: selected.size }
}

/**
 * Bulk status update via Payload REST API.
 */
export async function bulkUpdateStatus(
  collection: string,
  ids: string[],
  statusField: string,
  newStatus: string,
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  // Sequential to avoid overwhelming the server
  for (const id of ids) {
    try {
      const res = await fetch(`/api/${collection}/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [statusField]: newStatus }),
      })
      if (res.ok) success++
      else failed++
    } catch {
      failed++
    }
  }

  return { success, failed }
}

/**
 * Bulk delete via Payload REST API.
 */
export async function bulkDelete(
  collection: string,
  ids: string[],
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const id of ids) {
    try {
      const res = await fetch(`/api/${collection}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) success++
      else failed++
    } catch {
      failed++
    }
  }

  return { success, failed }
}
