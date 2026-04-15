'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useAupT } from '../../utils/useTranslation.js'

interface PluginInfo {
  name: string
  package: string
  icon: string
  description: { en: string; fr: string }
  configUrl: string
  npmUrl: string
  detectBy: string
  category: 'ui' | 'seo' | 'tools' | 'support'
}

interface PluginState extends PluginInfo {
  installed: boolean
  version: string | null
}

const CONSILIOWEB_PLUGINS: PluginInfo[] = [
  {
    name: 'Admin Nav',
    package: '@consilioweb/payload-admin-nav',
    icon: '🧭',
    description: {
      en: 'Customizable sidebar navigation with drag & drop, 70+ icons, and per-user preferences.',
      fr: 'Navigation sidebar personnalisable avec drag & drop, 70+ icônes et préférences par utilisateur.',
    },
    configUrl: '/admin/nav-customizer',
    npmUrl: 'https://www.npmjs.com/package/@consilioweb/payload-admin-nav',
    detectBy: 'nav-customizer',
    category: 'ui',
  },
  {
    name: 'SEO Analyzer',
    package: '@consilioweb/payload-seo-analyzer',
    icon: '🔍',
    description: {
      en: 'SEO scoring, sitemap audit, keyword research, schema.org builder, and performance tracking.',
      fr: 'Score SEO, audit sitemap, recherche mots-clés, schema.org et suivi de performance.',
    },
    configUrl: '/admin/seo',
    npmUrl: 'https://www.npmjs.com/package/@consilioweb/payload-seo-analyzer',
    detectBy: 'seo',
    category: 'seo',
  },
  {
    name: 'Maintenance',
    package: '@consilioweb/payload-maintenance',
    icon: '🔧',
    description: {
      en: 'Maintenance mode with custom page, scheduling, subscriber notifications, and analytics.',
      fr: 'Mode maintenance avec page personnalisée, planification, notifications et analytics.',
    },
    configUrl: '/admin/maintenance',
    npmUrl: 'https://www.npmjs.com/package/@consilioweb/payload-maintenance',
    detectBy: 'maintenance',
    category: 'tools',
  },
  {
    name: 'Spellcheck',
    package: '@consilioweb/payload-spellcheck',
    icon: '✏️',
    description: {
      en: 'Real-time spell checking and grammar suggestions for content fields.',
      fr: 'Vérification orthographique et suggestions grammaticales en temps réel.',
    },
    configUrl: '/admin/spellcheck',
    npmUrl: 'https://www.npmjs.com/package/@consilioweb/payload-spellcheck',
    detectBy: 'spellcheck',
    category: 'tools',
  },
  {
    name: 'Support',
    package: '@consilioweb/payload-support',
    icon: '💬',
    description: {
      en: 'Customer support ticketing system with live chat, AI responses, SLA tracking, and CRM.',
      fr: 'Système de support client avec chat en direct, réponses IA, suivi SLA et CRM.',
    },
    configUrl: '/admin/support-dashboard',
    npmUrl: 'https://www.npmjs.com/package/@consilioweb/payload-support',
    detectBy: 'support',
    category: 'support',
  },
]

const CATEGORIES = {
  ui: { en: 'Interface', fr: 'Interface' },
  seo: { en: 'SEO', fr: 'SEO' },
  tools: { en: 'Tools', fr: 'Outils' },
  support: { en: 'Support', fr: 'Support' },
}

/**
 * Plugins Hub — central management panel for ConsilioWEB plugins.
 * Detects installed plugins, shows install commands, and links to configuration.
 */
export const PluginsHub: React.FC = () => {
  const t = useAupT()
  const [plugins, setPlugins] = useState<PluginState[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const lang = (typeof document !== 'undefined' && document.documentElement.lang?.startsWith('fr')) ? 'fr' : 'en'

  useEffect(() => {
    const states: PluginState[] = CONSILIOWEB_PLUGINS.map((p) => {
      const navLink = document.querySelector(`a[href*="${p.detectBy}"]`)
      return {
        ...p,
        installed: !!navLink,
        version: null, // Could be fetched from a server endpoint
      }
    })
    setPlugins(states)
  }, [])

  const copyInstall = useCallback((pkg: string) => {
    const cmd = `pnpm add ${pkg}`
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(pkg)
      setTimeout(() => setCopied(null), 2000)
    }).catch(() => {})
  }, [])

  const installed = plugins.filter((p) => p.installed)
  const available = plugins.filter((p) => !p.installed)

  const categories = ['ui', 'seo', 'tools', 'support'] as const

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>🔌 {t('pluginsActive')} ({installed.length}/{plugins.length})</h3>
          <p style={subtitleStyle}>
            {lang === 'fr'
              ? 'Gérez vos plugins ConsilioWEB depuis un seul endroit.'
              : 'Manage your ConsilioWEB plugins from one place.'}
          </p>
        </div>
      </div>

      {/* Installed plugins */}
      {installed.length > 0 && (
        <div style={sectionStyle}>
          {installed.map((p) => (
            <a key={p.package} href={p.configUrl} style={installedCardStyle}>
              <div style={cardTopStyle}>
                <span style={iconBigStyle}>{p.icon}</span>
                <div style={cardInfoStyle}>
                  <span style={cardNameStyle}>{p.name}</span>
                  <span style={packageNameStyle}>{p.package}</span>
                </div>
                <span style={activeBadge}>✓ {lang === 'fr' ? 'Actif' : 'Active'}</span>
              </div>
              <p style={cardDescStyle}>{p.description[lang]}</p>
              <span style={configLinkStyle}>{t('pluginsConfigure')} →</span>
            </a>
          ))}
        </div>
      )}

      {/* Available plugins by category */}
      {available.length > 0 && (
        <>
          <div style={dividerStyle}>
            <span style={dividerTextStyle}>
              {lang === 'fr' ? 'Plugins disponibles' : 'Available plugins'}
            </span>
          </div>

          {categories.map((cat) => {
            const catPlugins = available.filter((p) => p.category === cat)
            if (catPlugins.length === 0) return null
            return (
              <div key={cat} style={catSectionStyle}>
                <h4 style={catTitleStyle}>{CATEGORIES[cat][lang]}</h4>
                {catPlugins.map((p) => (
                  <div key={p.package} style={availableCardStyle}>
                    <div style={cardTopStyle}>
                      <span style={iconBigStyle}>{p.icon}</span>
                      <div style={cardInfoStyle}>
                        <span style={cardNameStyle}>{p.name}</span>
                        <span style={packageNameStyle}>{p.package}</span>
                      </div>
                    </div>
                    <p style={cardDescStyle}>{p.description[lang]}</p>
                    <div style={installRowStyle}>
                      <button
                        onClick={() => copyInstall(p.package)}
                        type="button"
                        style={installBtnStyle}
                      >
                        {copied === p.package ? '✓' : '📋'} pnpm add {p.package}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '16px',
}

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
}

const titleStyle: React.CSSProperties = {
  margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--theme-text)',
}

const subtitleStyle: React.CSSProperties = {
  margin: '4px 0 0', fontSize: '13px', color: 'var(--theme-elevation-500)',
}

const sectionStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '8px',
}

const installedCardStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '8px',
  padding: '16px', borderRadius: '12px',
  border: '1px solid var(--aup-accent-border)',
  background: 'var(--aup-accent-subtle)',
  textDecoration: 'none', color: 'inherit',
  transition: 'box-shadow 150ms',
}

const availableCardStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '8px',
  padding: '16px', borderRadius: '12px',
  border: 'var(--aup-border-subtle)',
  background: 'var(--theme-elevation-0)',
}

const cardTopStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
}

const iconBigStyle: React.CSSProperties = {
  fontSize: '24px', width: '40px', height: '40px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: '10px', background: 'var(--theme-elevation-50)',
  border: 'var(--aup-border-subtle)', flexShrink: 0,
}

const cardInfoStyle: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', gap: '1px',
}

const cardNameStyle: React.CSSProperties = {
  fontSize: '14px', fontWeight: 700, color: 'var(--theme-text)',
}

const packageNameStyle: React.CSSProperties = {
  fontSize: '11px', color: 'var(--theme-elevation-400)',
  fontFamily: 'var(--aup-font-numeric)',
}

const activeBadge: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700,
  padding: '3px 10px', borderRadius: '6px',
  background: 'var(--aup-green-subtle)', color: 'var(--aup-green)',
  whiteSpace: 'nowrap',
}

const cardDescStyle: React.CSSProperties = {
  margin: 0, fontSize: '12.5px', color: 'var(--theme-elevation-500)',
  lineHeight: 1.5,
}

const configLinkStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 600, color: 'var(--aup-accent)',
}

const dividerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  margin: '8px 0',
}

const dividerTextStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--theme-elevation-400)',
  whiteSpace: 'nowrap',
}

const catSectionStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '6px',
}

const catTitleStyle: React.CSSProperties = {
  margin: 0, fontSize: '12px', fontWeight: 700,
  color: 'var(--theme-elevation-500)',
  textTransform: 'uppercase', letterSpacing: '0.04em',
}

const installRowStyle: React.CSSProperties = {
  display: 'flex', gap: '8px', alignItems: 'center',
}

const installBtnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: '8px',
  border: '1px solid var(--theme-elevation-200)',
  background: 'var(--theme-elevation-50)',
  color: 'var(--theme-text)',
  fontSize: '11px', fontWeight: 600, cursor: 'pointer',
  fontFamily: 'var(--aup-font-numeric)',
  transition: 'background 150ms',
}
