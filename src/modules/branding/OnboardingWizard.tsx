'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'

type Step = 'theme' | 'brand' | 'dashboard' | 'done'

const STORAGE_KEY = 'aup-onboarding-completed'

/**
 * Onboarding wizard — multi-step first-run guide.
 * Walks the admin through: theme selection, branding setup, dashboard config.
 * Dismisses permanently via localStorage.
 */
export const OnboardingWizard: React.FC = () => {
  const t = useAupT()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<Step>('theme')

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') {
        // Only show on dashboard page
        if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') {
          setVisible(true)
        }
      }
    } catch {}
  }, [])

  const complete = useCallback(() => {
    setVisible(false)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
  }, [])

  const next = useCallback(() => {
    if (step === 'theme') setStep('brand')
    else if (step === 'brand') setStep('dashboard')
    else if (step === 'dashboard') setStep('done')
  }, [step])

  const skip = useCallback(() => {
    complete()
  }, [complete])

  if (!visible) return null

  if (step === 'done') {
    complete()
    return null
  }

  const steps: Record<Step, { icon: string; title: string; description: string; action: string; href: string }> = {
    theme: {
      icon: '🎨',
      title: t('welcomeTheme'),
      description: t('welcomeThemeDesc'),
      action: t('welcomeTheme'),
      href: '/admin/globals/aup-settings',
    },
    brand: {
      icon: '✦',
      title: t('welcomeBranding'),
      description: t('welcomeBrandingDesc'),
      action: t('welcomeBranding'),
      href: '/admin/globals/aup-settings',
    },
    dashboard: {
      icon: '📊',
      title: t('welcomeDashboard'),
      description: t('welcomeDashboardDesc'),
      action: t('welcomeDashboard'),
      href: '/admin',
    },
    done: { icon: '✅', title: '', description: '', action: '', href: '' },
  }

  const current = steps[step]
  const stepIndex = step === 'theme' ? 0 : step === 'brand' ? 1 : 2

  return (
    <>
      <div style={overlayStyle} onClick={skip} aria-hidden="true" />
      <div style={modalStyle} role="dialog" aria-label="Onboarding">
        {/* Progress */}
        <div style={progressStyle}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              ...dotStyle,
              background: i <= stepIndex ? 'var(--aup-accent)' : 'var(--theme-elevation-200)',
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={contentStyle}>
          <span style={{ fontSize: '2.5rem' }}>{current.icon}</span>
          <h2 style={titleStyle}>{current.title}</h2>
          <p style={descStyle}>{current.description}</p>
        </div>

        {/* Actions */}
        <div style={actionsStyle}>
          <button onClick={skip} type="button" style={skipBtnStyle}>
            {t('welcomeDismiss')}
          </button>
          {step === 'dashboard' ? (
            <a href={current.href} onClick={complete} style={nextBtnStyle}>
              🚀 {current.action} →
            </a>
          ) : (
            <button onClick={next} type="button" style={nextBtnStyle}>
              {current.action} →
            </button>
          )}
        </div>

        <div style={stepCountStyle}>
          {stepIndex + 1} / 3
        </div>
      </div>
    </>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'hsl(220 40% 10% / 0.50)',
  backdropFilter: 'blur(6px)',
  zIndex: 99998,
}

const modalStyle: React.CSSProperties = {
  position: 'fixed', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'min(440px, calc(100vw - 32px))',
  background: 'var(--theme-elevation-50)',
  borderRadius: '20px',
  boxShadow: 'var(--aup-shadow-4)',
  padding: '32px',
  zIndex: 99999,
  textAlign: 'center',
}

const progressStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px',
}

const dotStyle: React.CSSProperties = {
  width: '8px', height: '8px', borderRadius: '50%',
  transition: 'background 200ms',
}

const contentStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
  marginBottom: '24px',
}

const titleStyle: React.CSSProperties = {
  margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--theme-text)',
}

const descStyle: React.CSSProperties = {
  margin: 0, fontSize: '14px', color: 'var(--theme-elevation-500)',
  lineHeight: 1.6, maxWidth: '320px',
}

const actionsStyle: React.CSSProperties = {
  display: 'flex', gap: '12px', justifyContent: 'center',
}

const skipBtnStyle: React.CSSProperties = {
  padding: '10px 20px', borderRadius: '10px',
  border: '1px solid var(--theme-elevation-200)',
  background: 'var(--theme-elevation-0)',
  color: 'var(--theme-elevation-500)',
  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
}

const nextBtnStyle: React.CSSProperties = {
  padding: '10px 24px', borderRadius: '10px',
  border: 'none', background: 'var(--aup-gradient-accent)',
  color: '#fff',
  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  textDecoration: 'none',
}

const stepCountStyle: React.CSSProperties = {
  marginTop: '16px', fontSize: '11px', fontWeight: 600,
  color: 'var(--theme-elevation-400)',
}
