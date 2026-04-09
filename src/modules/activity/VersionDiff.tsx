'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'
import { diffFields, type FieldDiff, type WordDiff } from './diffFields.js'

interface VersionEntry {
  id: string
  version: Record<string, unknown>
  createdAt: string
  updatedAt: string
  autosave?: boolean
  /** Populated user or just an id */
  parent?: string | number
}

/**
 * VersionDiff — collapsible panel showing Payload CMS version history
 * with field-by-field diff comparison and restore capability.
 *
 * Injected via afterDocument on collections that have `versions` enabled.
 * Uses the native Payload versions API: GET /api/{collection}/{docId}/versions
 */
export const VersionDiff: React.FC = () => {
  const t = useAupT()
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(true)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [diffs, setDiffs] = useState<FieldDiff[]>([])
  const [restoring, setRestoring] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Extract collection + docId from current URL
  const getDocInfo = useCallback(() => {
    if (typeof window === 'undefined') return null
    const match = window.location.pathname.match(/\/admin\/collections\/([^/]+)\/(\d+)/)
    if (!match) return null
    return { collection: match[1], docId: match[2] }
  }, [])

  // Fetch versions on mount
  useEffect(() => {
    const info = getDocInfo()
    if (!info) {
      setLoading(false)
      return
    }

    fetch(`/api/${info.collection}/${info.docId}/versions?limit=10&depth=0`, {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.docs) {
          setVersions(data.docs)
        }
      })
      .catch(() => {
        // Collection may not have versions enabled — silent fallback
      })
      .finally(() => setLoading(false))
  }, [getDocInfo])

  // Compute diff when a version is selected
  useEffect(() => {
    if (selectedIdx === null || versions.length < 2) {
      setDiffs([])
      return
    }

    // Compare selected version with the one before it (or current doc)
    const selectedVersion = versions[selectedIdx]?.version
    // The version above in the list is newer (or current state)
    const newerVersion = selectedIdx === 0
      ? null // First entry is latest — compare with current doc would need an extra fetch
      : versions[selectedIdx - 1]?.version

    if (!selectedVersion) {
      setDiffs([])
      return
    }

    if (newerVersion) {
      const result = diffFields(
        selectedVersion as Record<string, unknown>,
        newerVersion as Record<string, unknown>,
      )
      setDiffs(result.filter((d) => d.changeType !== 'unchanged'))
    } else {
      // For the latest version, show all fields as context
      const result = diffFields(
        versions.length > 1 ? (versions[1]?.version as Record<string, unknown>) : null,
        selectedVersion as Record<string, unknown>,
      )
      setDiffs(result.filter((d) => d.changeType !== 'unchanged'))
    }
  }, [selectedIdx, versions])

  // Restore a version
  const handleRestore = useCallback(async () => {
    if (selectedIdx === null) return
    const info = getDocInfo()
    if (!info) return

    const versionData = versions[selectedIdx]?.version
    if (!versionData) return

    setRestoring(true)
    setMessage(null)

    try {
      // Strip system fields before restoring
      const { id, createdAt, updatedAt, _status, ...restoreData } = versionData as any

      const res = await fetch(`/api/${info.collection}/${info.docId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restoreData),
      })

      if (res.ok) {
        setMessage(t('versionRestored'))
        setConfirmRestore(false)
        // Reload after short delay so user sees the success message
        setTimeout(() => window.location.reload(), 800)
      } else {
        setMessage(t('versionRestoreFailed'))
      }
    } catch {
      setMessage(t('versionRestoreFailed'))
    } finally {
      setRestoring(false)
    }
  }, [selectedIdx, versions, getDocInfo, t])

  // Don't render on create pages or non-document pages
  if (typeof window !== 'undefined' && !window.location.pathname.match(/\/admin\/collections\/[^/]+\/\d+/)) {
    return null
  }

  // Graceful fallback: no versions available
  if (loading) return null
  if (versions.length === 0) return null

  return (
    <div style={containerStyle}>
      <button onClick={() => setCollapsed(!collapsed)} type="button" style={headerBtnStyle}>
        <span style={headerIconStyle}>🔀</span>
        <span style={headerTitleStyle}>{t('versions')}</span>
        <span style={countBadge}>{versions.length}</span>
        <span style={chevronStyle}>{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div style={panelStyle}>
          {/* Version list */}
          <div style={versionListStyle}>
            {versions.map((v, idx) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedIdx(idx === selectedIdx ? null : idx)}
                style={{
                  ...versionItemStyle,
                  ...(idx === selectedIdx ? versionItemActiveStyle : {}),
                }}
              >
                <span style={versionDateStyle}>
                  {formatDate(v.createdAt)}
                </span>
                {v.autosave && (
                  <span style={autosaveBadgeStyle}>auto</span>
                )}
                {idx === 0 && (
                  <span style={latestBadgeStyle}>{t('versionLatest')}</span>
                )}
              </button>
            ))}
          </div>

          {/* Diff view */}
          {selectedIdx !== null && (
            <div style={diffContainerStyle}>
              <div style={diffHeaderStyle}>
                <span style={diffTitleStyle}>
                  {t('versionCompare')} — {formatDate(versions[selectedIdx]?.createdAt || '')}
                </span>

                {/* Restore button with confirmation */}
                {selectedIdx > 0 && (
                  <>
                    {!confirmRestore ? (
                      <button
                        type="button"
                        onClick={() => setConfirmRestore(true)}
                        style={restoreBtnStyle}
                      >
                        {t('versionRestore')}
                      </button>
                    ) : (
                      <div style={confirmBarStyle}>
                        <span style={confirmTextStyle}>{t('versionConfirmRestore')}</span>
                        <button
                          type="button"
                          onClick={handleRestore}
                          disabled={restoring}
                          style={confirmYesStyle}
                        >
                          {restoring ? '...' : t('versionConfirmYes')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRestore(false)}
                          style={confirmNoStyle}
                        >
                          {t('versionConfirmNo')}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {message && (
                <div style={messageStyle}>{message}</div>
              )}

              {diffs.length === 0 ? (
                <div style={noDiffsStyle}>{t('versionNoDiffs')}</div>
              ) : (
                <div style={diffListStyle}>
                  {diffs.map((d) => (
                    <div key={d.field} style={diffRowStyle}>
                      <div style={diffFieldNameStyle}>
                        <span style={changeIconStyle(d.changeType)}>
                          {d.changeType === 'added' ? '+' : d.changeType === 'removed' ? '−' : '~'}
                        </span>
                        {d.field}
                        <span style={changeTypeBadgeStyle(d.changeType)}>
                          {t(`version${capitalize(d.changeType)}`)}
                        </span>
                      </div>
                      <div style={diffValueContainerStyle}>
                        {d.wordDiff ? (
                          <WordDiffDisplay wordDiff={d.wordDiff} />
                        ) : (
                          <ValueDiffDisplay oldValue={d.oldValue} newValue={d.newValue} changeType={d.changeType} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const WordDiffDisplay: React.FC<{ wordDiff: WordDiff[] }> = ({ wordDiff }) => (
  <div style={wordDiffContainerStyle}>
    {wordDiff.map((w, i) => (
      <span
        key={`${i}-${w.text}`}
        style={
          w.type === 'added'
            ? wordAddedStyle
            : w.type === 'removed'
              ? wordRemovedStyle
              : wordSameStyle
        }
      >
        {w.text}{' '}
      </span>
    ))}
  </div>
)

const ValueDiffDisplay: React.FC<{
  oldValue: unknown
  newValue: unknown
  changeType: string
}> = ({ oldValue, newValue, changeType }) => {
  const formatVal = (val: unknown): string => {
    if (val === undefined || val === null) return '—'
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val, null, 2)
      } catch {
        return String(val)
      }
    }
    return String(val)
  }

  if (changeType === 'added') {
    return <span style={valueAddedStyle}>{formatVal(newValue)}</span>
  }
  if (changeType === 'removed') {
    return <span style={valueRemovedStyle}>{formatVal(oldValue)}</span>
  }

  return (
    <div style={valueChangedContainerStyle}>
      <span style={valueRemovedStyle}>{formatVal(oldValue)}</span>
      <span style={arrowStyle}> → </span>
      <span style={valueAddedStyle}>{formatVal(newValue)}</span>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: string): string {
  if (!ts) return ''
  const date = new Date(ts)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  margin: '16px 0',
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '12px',
  overflow: 'hidden',
  backgroundColor: 'var(--theme-elevation-0)',
}

const headerBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
  width: '100%', padding: '12px 16px',
  background: 'none', border: 'none', cursor: 'pointer',
  textAlign: 'left',
}

const headerIconStyle: React.CSSProperties = { fontSize: '16px' }

const headerTitleStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 700, color: 'var(--theme-text)', flex: 1,
}

const countBadge: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600,
  padding: '1px 8px', borderRadius: '9999px',
  backgroundColor: 'var(--aup-accent-subtle)', color: 'var(--aup-accent)',
}

const chevronStyle: React.CSSProperties = {
  fontSize: '12px', color: 'var(--theme-elevation-400)',
}

const panelStyle: React.CSSProperties = {
  padding: '0 16px 16px',
}

const versionListStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '4px',
  marginBottom: '12px',
}

const versionItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '8px 12px', borderRadius: '8px',
  background: 'var(--theme-elevation-50)',
  border: '1px solid transparent',
  cursor: 'pointer', textAlign: 'left',
  fontSize: '12px', color: 'var(--theme-text)',
  transition: 'all 0.15s ease',
}

const versionItemActiveStyle: React.CSSProperties = {
  borderColor: 'var(--aup-accent)',
  backgroundColor: 'var(--aup-accent-subtle)',
}

const versionDateStyle: React.CSSProperties = {
  flex: 1, fontWeight: 500,
  fontFamily: 'var(--aup-font-numeric)',
}

const autosaveBadgeStyle: React.CSSProperties = {
  fontSize: '9px', fontWeight: 600, textTransform: 'uppercase',
  padding: '1px 6px', borderRadius: '4px',
  backgroundColor: 'var(--theme-elevation-100)',
  color: 'var(--theme-elevation-500)',
}

const latestBadgeStyle: React.CSSProperties = {
  fontSize: '9px', fontWeight: 600, textTransform: 'uppercase',
  padding: '1px 6px', borderRadius: '4px',
  backgroundColor: 'var(--aup-green-subtle, rgba(34,197,94,0.1))',
  color: 'var(--aup-green)',
}

const diffContainerStyle: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: '8px', overflow: 'hidden',
}

const diffHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '10px 12px',
  backgroundColor: 'var(--theme-elevation-50)',
  borderBottom: '1px solid var(--theme-elevation-150)',
  flexWrap: 'wrap',
}

const diffTitleStyle: React.CSSProperties = {
  flex: 1, fontSize: '12px', fontWeight: 600, color: 'var(--theme-text)',
}

const restoreBtnStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600,
  padding: '4px 12px', borderRadius: '6px',
  border: '1px solid var(--aup-accent)',
  backgroundColor: 'transparent',
  color: 'var(--aup-accent)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const confirmBarStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
}

const confirmTextStyle: React.CSSProperties = {
  fontSize: '11px', color: 'var(--aup-red)',
}

const confirmYesStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600,
  padding: '3px 10px', borderRadius: '6px',
  border: 'none',
  backgroundColor: 'var(--aup-red)',
  color: '#fff',
  cursor: 'pointer',
}

const confirmNoStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 500,
  padding: '3px 10px', borderRadius: '6px',
  border: '1px solid var(--theme-elevation-200)',
  backgroundColor: 'transparent',
  color: 'var(--theme-text)',
  cursor: 'pointer',
}

const messageStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '12px', fontWeight: 500,
  color: 'var(--aup-green)',
  backgroundColor: 'var(--aup-green-subtle, rgba(34,197,94,0.08))',
}

const noDiffsStyle: React.CSSProperties = {
  padding: '16px 12px',
  fontSize: '12px', color: 'var(--theme-elevation-400)',
  textAlign: 'center',
}

const diffListStyle: React.CSSProperties = {
  padding: '8px 0',
}

const diffRowStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--theme-elevation-100)',
}

const diffFieldNameStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  fontSize: '12px', fontWeight: 600, color: 'var(--theme-text)',
  marginBottom: '4px',
}

function changeIconStyle(type: string): React.CSSProperties {
  return {
    width: '16px', height: '16px', borderRadius: '4px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', fontWeight: 700, flexShrink: 0,
    backgroundColor:
      type === 'added' ? 'var(--aup-green-subtle, rgba(34,197,94,0.1))'
        : type === 'removed' ? 'var(--aup-red-subtle, rgba(239,68,68,0.1))'
          : 'var(--aup-amber-subtle, rgba(245,158,11,0.1))',
    color:
      type === 'added' ? 'var(--aup-green)'
        : type === 'removed' ? 'var(--aup-red)'
          : 'var(--aup-amber)',
  }
}

function changeTypeBadgeStyle(type: string): React.CSSProperties {
  return {
    fontSize: '9px', fontWeight: 600, textTransform: 'uppercase',
    padding: '1px 6px', borderRadius: '4px', marginLeft: 'auto',
    backgroundColor:
      type === 'added' ? 'var(--aup-green-subtle, rgba(34,197,94,0.1))'
        : type === 'removed' ? 'var(--aup-red-subtle, rgba(239,68,68,0.1))'
          : 'var(--aup-amber-subtle, rgba(245,158,11,0.1))',
    color:
      type === 'added' ? 'var(--aup-green)'
        : type === 'removed' ? 'var(--aup-red)'
          : 'var(--aup-amber)',
  }
}

const diffValueContainerStyle: React.CSSProperties = {
  fontSize: '12px', lineHeight: '1.5',
  padding: '4px 0 0 22px',
}

const wordDiffContainerStyle: React.CSSProperties = {
  lineHeight: '1.8',
}

const wordAddedStyle: React.CSSProperties = {
  backgroundColor: 'var(--aup-green-subtle, rgba(34,197,94,0.15))',
  color: 'var(--aup-green)',
  padding: '1px 2px', borderRadius: '2px',
  textDecoration: 'none',
}

const wordRemovedStyle: React.CSSProperties = {
  backgroundColor: 'var(--aup-red-subtle, rgba(239,68,68,0.15))',
  color: 'var(--aup-red)',
  padding: '1px 2px', borderRadius: '2px',
  textDecoration: 'line-through',
}

const wordSameStyle: React.CSSProperties = {
  color: 'var(--theme-text)',
}

const valueAddedStyle: React.CSSProperties = {
  color: 'var(--aup-green)',
  fontFamily: 'var(--aup-font-numeric)',
}

const valueRemovedStyle: React.CSSProperties = {
  color: 'var(--aup-red)',
  textDecoration: 'line-through',
  fontFamily: 'var(--aup-font-numeric)',
}

const valueChangedContainerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', gap: '4px',
  flexWrap: 'wrap',
}

const arrowStyle: React.CSSProperties = {
  color: 'var(--theme-elevation-400)',
  fontSize: '11px',
}
