'use client'

import React, { useCallback, useState } from 'react'
import { useAupT } from '../../../utils/useTranslation.js'

const STORAGE_KEY = 'aup-welcome-dismissed'

/**
 * Welcome/onboarding widget for new users.
 * Shows quick setup steps and dismisses permanently via localStorage.
 */
export const WelcomeWidget: React.FC<{ id: string }> = () => {
  const t = useAupT()
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
  })

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
  }, [])

  if (dismissed) return null

  const steps = [
    { icon: '🎨', label: t('welcomeTheme'), href: '/admin/globals/aup-settings', done: false },
    { icon: '✦', label: t('welcomeBranding'), href: '/admin/globals/aup-settings', done: false },
    { icon: '📊', label: t('welcomeDashboard'), href: '#', done: true },
  ]

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>{t('welcomeTitle')} 🎉</h3>
          <p style={subtitleStyle}>{t('welcomeSubtitle')}</p>
        </div>
      </div>

      <div style={stepsStyle}>
        {steps.map((step, i) => (
          <a key={i} href={step.href} style={stepStyle}>
            <span style={stepIconStyle}>{step.icon}</span>
            <span style={stepLabelStyle}>{step.label}</span>
            {step.done && <span style={checkStyle}>✓</span>}
            <span style={arrowStyle}>→</span>
          </a>
        ))}
      </div>

      <button onClick={handleDismiss} type="button" style={dismissStyle}>
        {t('welcomeDismiss')}
      </button>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  background: 'var(--aup-gradient-accent)',
  borderRadius: '16px',
  padding: '24px',
  color: '#fff',
  position: 'relative',
  overflow: 'hidden',
}

const headerStyle: React.CSSProperties = {
  marginBottom: '20px',
}

const titleStyle: React.CSSProperties = {
  margin: 0, fontSize: '18px', fontWeight: 700,
}

const subtitleStyle: React.CSSProperties = {
  margin: '4px 0 0', fontSize: '13px', opacity: 0.8,
}

const stepsStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px',
}

const stepStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '10px 14px', borderRadius: '10px',
  background: 'hsla(0,0%,100%,0.12)',
  textDecoration: 'none', color: '#fff',
  transition: 'background 150ms',
}

const stepIconStyle: React.CSSProperties = {
  fontSize: '16px', width: '24px', textAlign: 'center',
}

const stepLabelStyle: React.CSSProperties = {
  flex: 1, fontSize: '13px', fontWeight: 600,
}

const checkStyle: React.CSSProperties = {
  fontSize: '14px', color: 'hsl(158, 64%, 60%)',
}

const arrowStyle: React.CSSProperties = {
  fontSize: '14px', opacity: 0.5,
}

const dismissStyle: React.CSSProperties = {
  background: 'hsla(0,0%,100%,0.15)',
  border: '1px solid hsla(0,0%,100%,0.2)',
  borderRadius: '8px',
  padding: '8px 16px',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  width: '100%',
}
