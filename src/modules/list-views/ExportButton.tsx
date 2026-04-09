'use client'

import React, { useCallback, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'

interface ExportButtonProps {
  collection: string
  totalDocs: number
}

/**
 * Export button for list views — downloads all filtered documents as CSV.
 * Fetches ALL docs (paginated) then generates CSV client-side.
 */
export const ExportButton: React.FC<ExportButtonProps> = ({ collection, totalDocs }) => {
  const t = useAupT()
  const [exporting, setExporting] = useState(false)

  const handleExport = useCallback(async () => {
    if (exporting || totalDocs === 0) return
    setExporting(true)

    try {
      // Fetch all docs (paginated, max 500)
      const limit = 100
      const pages = Math.min(Math.ceil(totalDocs / limit), 5) // Cap at 500 docs
      const allDocs: Record<string, unknown>[] = []

      for (let page = 1; page <= pages; page++) {
        const url = `/api/${collection}?limit=${limit}&page=${page}&depth=0&sort=-updatedAt`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) break
        const data = await res.json()
        if (data.docs) allDocs.push(...data.docs)
      }

      if (allDocs.length === 0) return

      // Determine columns from first doc
      const skipFields = new Set(['_status', '__v', 'globalType'])
      const columns = Object.keys(allDocs[0]!)
        .filter((key) => !skipFields.has(key))
        .filter((key) => {
          // Skip complex nested objects (keep only scalar values)
          const val = allDocs[0]![key]
          return val === null || val === undefined || typeof val !== 'object' || val instanceof Date
        })

      // Generate CSV
      const escape = (val: unknown): string => {
        if (val === null || val === undefined) return ''
        const str = String(val)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      const header = columns.map(escape).join(',')
      const rows = allDocs.map((doc) =>
        columns.map((col) => escape(doc[col])).join(',')
      )
      const csv = [header, ...rows].join('\n')

      // Download
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${collection}-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Silent fail
    } finally {
      setExporting(false)
    }
  }, [collection, totalDocs, exporting])

  return (
    <button
      onClick={handleExport}
      type="button"
      disabled={exporting || totalDocs === 0}
      style={{
        ...btnStyle,
        opacity: exporting || totalDocs === 0 ? 0.5 : 1,
      }}
      title={t('exportCsv')}
    >
      {exporting ? '...' : '📥'} CSV
    </button>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '6px',
  border: '1px solid var(--theme-elevation-200)',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
}
