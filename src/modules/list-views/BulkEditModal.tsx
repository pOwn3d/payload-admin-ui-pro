'use client'

import React, { useCallback, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'

interface BulkEditModalProps {
  collection: string
  selectedIds: string[]
  onClose: () => void
  onComplete: () => void
}

interface FieldEdit {
  field: string
  value: string
}

/**
 * Modal for bulk editing multiple fields across selected documents.
 * Allows adding multiple field/value pairs and applies them via PATCH.
 */
export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  collection,
  selectedIds,
  onClose,
  onComplete,
}) => {
  const t = useAupT()
  const [fields, setFields] = useState<FieldEdit[]>([{ field: '', value: '' }])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)

  const addField = useCallback(() => {
    setFields((prev) => [...prev, { field: '', value: '' }])
  }, [])

  const removeField = useCallback((index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateField = useCallback((index: number, key: 'field' | 'value', val: string) => {
    setFields((prev) => prev.map((f, i) => i === index ? { ...f, [key]: val } : f))
  }, [])

  const handleApply = useCallback(async () => {
    const validFields = fields.filter((f) => f.field.trim())
    if (validFields.length === 0) return

    setLoading(true)
    let success = 0
    let failed = 0

    // Build the patch body
    const body: Record<string, string> = {}
    for (const f of validFields) {
      body[f.field.trim()] = f.value
    }

    // Apply to each document
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/${collection}/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) success++
        else failed++
      } catch {
        failed++
      }
    }

    setResult({ success, failed })
    setLoading(false)

    if (failed === 0) {
      setTimeout(() => { onComplete(); onClose() }, 1000)
    }
  }, [fields, selectedIds, collection, onComplete, onClose])

  return (
    <>
      {/* Backdrop */}
      <div style={overlayStyle} onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div style={modalStyle} role="dialog" aria-label={t('bulkEditTitle')}>
        <h3 style={titleStyle}>
          {t('bulkEditTitle')} — {selectedIds.length} document{selectedIds.length !== 1 ? 's' : ''}
        </h3>

        <div style={fieldsContainerStyle}>
          {fields.map((f, i) => (
            <div key={i} style={fieldRowStyle}>
              <input
                value={f.field}
                onChange={(e) => updateField(i, 'field', e.target.value)}
                placeholder={t('fieldName')}
                style={inputStyle}
              />
              <input
                value={f.value}
                onChange={(e) => updateField(i, 'value', e.target.value)}
                placeholder={t('fieldValue')}
                style={{ ...inputStyle, flex: 2 }}
              />
              {fields.length > 1 && (
                <button onClick={() => removeField(i)} type="button" style={removeFieldBtnStyle}>×</button>
              )}
            </div>
          ))}
          <button onClick={addField} type="button" style={addFieldBtnStyle}>
            + {t('addField')}
          </button>
        </div>

        {result && (
          <div style={{
            ...resultStyle,
            background: result.failed === 0 ? 'var(--aup-green-subtle)' : 'var(--aup-amber-subtle)',
            color: result.failed === 0 ? 'var(--aup-green)' : 'var(--aup-amber)',
          }}>
            {result.success} {t('bulkEditSuccess')}{result.failed > 0 ? `, ${result.failed} ${t('bulkEditFailed')}` : ''}
          </div>
        )}

        <div style={actionsStyle}>
          <button onClick={onClose} type="button" style={cancelBtnStyle}>{t('close')}</button>
          <button
            onClick={handleApply}
            type="button"
            disabled={loading || fields.every((f) => !f.field.trim())}
            style={{
              ...applyBtnStyle,
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? '...' : t('applyBulkEdit')}
          </button>
        </div>
      </div>
    </>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'hsl(220 40% 10% / 0.40)',
  backdropFilter: 'blur(4px)',
  zIndex: 99998,
}

const modalStyle: React.CSSProperties = {
  position: 'fixed', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'min(520px, calc(100vw - 32px))',
  background: 'var(--theme-elevation-50)',
  borderRadius: '16px',
  border: 'var(--aup-border-subtle)',
  boxShadow: 'var(--aup-shadow-4)',
  padding: '24px',
  zIndex: 99999,
}

const titleStyle: React.CSSProperties = {
  margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: 'var(--theme-text)',
}

const fieldsContainerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px',
}

const fieldRowStyle: React.CSSProperties = {
  display: 'flex', gap: '8px', alignItems: 'center',
}

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '8px 12px', borderRadius: '8px',
  border: '1px solid var(--theme-elevation-200)',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
  fontSize: '13px', outline: 'none',
}

const removeFieldBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none',
  color: 'var(--aup-red)', fontSize: '18px', cursor: 'pointer', padding: '4px 8px',
}

const addFieldBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none',
  color: 'var(--aup-accent)', fontSize: '13px', fontWeight: 600,
  cursor: 'pointer', textAlign: 'left', padding: '4px 0',
}

const resultStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: '8px',
  fontSize: '13px', fontWeight: 600, marginBottom: '12px',
}

const actionsStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: '8px',
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px',
  border: '1px solid var(--theme-elevation-200)',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-text)',
  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
}

const applyBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: '8px',
  border: 'none', background: 'var(--aup-accent)',
  color: '#fff',
  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
}
