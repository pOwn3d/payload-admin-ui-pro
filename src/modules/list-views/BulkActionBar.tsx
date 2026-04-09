'use client'

import React, { useCallback, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'
import { bulkDelete, bulkUpdateStatus } from './useBulkSelect.js'
import { BulkEditModal } from './BulkEditModal.js'

interface BulkActionBarProps {
  count: number
  collection: string
  selectedIds: string[]
  statusField?: string
  statusOptions?: string[]
  onComplete: () => void
  onSelectAll: () => void
  onDeselectAll: () => void
}

/**
 * Floating action bar shown when items are selected in cards/kanban/gallery views.
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  count,
  collection,
  selectedIds,
  statusField,
  statusOptions,
  onComplete,
  onSelectAll,
  onDeselectAll,
}) => {
  const t = useAupT()
  const [loading, setLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const handleDelete = useCallback(async () => {
    if (!confirm(`Delete ${count} document(s)?`)) return
    setLoading(true)
    await bulkDelete(collection, selectedIds)
    setLoading(false)
    onComplete()
  }, [collection, selectedIds, count, onComplete])

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!statusField) return
    setLoading(true)
    await bulkUpdateStatus(collection, selectedIds, statusField, newStatus)
    setLoading(false)
    onComplete()
  }, [collection, selectedIds, statusField, onComplete])

  if (count === 0) return null

  return (
    <div style={barStyle}>
      <span style={countStyle}>{t('selectedCount', { count: String(count) })}</span>

      <div style={actionsStyle}>
        <button onClick={onSelectAll} type="button" style={btnStyle}>{t('selectAll')}</button>
        <button onClick={onDeselectAll} type="button" style={btnStyle}>{t('deselectAll')}</button>

        <div style={separatorStyle} />

        {statusField && statusOptions && statusOptions.length > 0 && (
          <select
            onChange={(e) => e.target.value && handleStatusChange(e.target.value)}
            defaultValue=""
            style={selectStyle}
            disabled={loading}
          >
            <option value="" disabled>{t('bulkStatusChange')}</option>
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}

        <button onClick={() => setShowEditModal(true)} type="button" style={editBtnStyle} disabled={loading}>
          ✎ {t('bulkEditTitle')}
        </button>

        <button onClick={handleDelete} type="button" style={deleteBtnStyle} disabled={loading}>
          {loading ? '...' : t('bulkDelete')}
        </button>
      </div>

      {showEditModal && (
        <BulkEditModal
          collection={collection}
          selectedIds={selectedIds}
          onClose={() => setShowEditModal(false)}
          onComplete={onComplete}
        />
      )}
    </div>
  )
}

const barStyle: React.CSSProperties = {
  position: 'sticky', bottom: '16px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: '16px',
  padding: '12px 20px',
  borderRadius: '12px',
  background: 'var(--theme-elevation-50)',
  border: 'var(--aup-border-subtle)',
  boxShadow: 'var(--aup-shadow-3)',
  marginTop: '16px',
  zIndex: 100,
}

const countStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 700, color: 'var(--aup-accent)',
}

const actionsStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
}

const btnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: '6px',
  border: '1px solid var(--theme-elevation-200)',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
  fontSize: '12px', fontWeight: 500, cursor: 'pointer',
}

const selectStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: '6px',
  border: '1px solid var(--aup-accent-border)',
  background: 'var(--aup-accent-subtle)',
  color: 'var(--aup-accent)',
  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
}

const editBtnStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: '6px',
  border: '1px solid var(--aup-accent-border)',
  background: 'var(--aup-accent)',
  color: '#fff',
  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
}

const deleteBtnStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: '6px',
  border: 'none',
  background: 'var(--aup-red)',
  color: '#fff',
  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
}

const separatorStyle: React.CSSProperties = {
  width: '1px', height: '20px',
  background: 'var(--theme-elevation-200)',
}
