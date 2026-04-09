'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAupT } from '../../../utils/useTranslation.js'

const STORAGE_KEY = 'aup-dashboard-notes'

/**
 * Notes widget — free-text memo on the dashboard.
 * Auto-saves to localStorage with debounce.
 */
export const NotesWidget: React.FC<{ id: string }> = () => {
  const t = useAupT()
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setNotes(stored)
    } catch {}

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNotes(value)
    setSaved(false)

    // Debounce save
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, value) } catch {}
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 500)
  }, [])

  return (
    <div style={containerStyle}>
      <textarea
        value={notes}
        onChange={handleChange}
        placeholder={t('notesPlaceholder')}
        style={textareaStyle}
        rows={6}
      />
      {saved && (
        <span style={savedStyle}>✓ {t('notesSaved')}</span>
      )}
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  position: 'relative', height: '100%',
  display: 'flex', flexDirection: 'column',
}

const textareaStyle: React.CSSProperties = {
  flex: 1, width: '100%',
  padding: '0',
  border: 'none', outline: 'none',
  resize: 'none',
  fontSize: '13px', lineHeight: 1.6,
  fontFamily: 'inherit',
  backgroundColor: 'transparent',
  color: 'var(--theme-text)',
}

const savedStyle: React.CSSProperties = {
  position: 'absolute', bottom: '0', right: '0',
  fontSize: '10px', fontWeight: 600,
  color: 'var(--aup-green)',
  padding: '2px 6px',
}
