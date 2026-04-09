/**
 * Widget Registry — dynamic registration of custom dashboard widgets.
 *
 * Uses `window.__aupWidgets` as the backing store for Turbopack compatibility
 * (same pattern as listViews registration via window globals).
 *
 * Usage from consumer code:
 *   import { registerWidget } from '@consilioweb/payload-admin-ui-pro/client'
 *   registerWidget({ id: 'my-widget', name: 'My Widget', icon: '🔧', component: MyComponent })
 */

import type React from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WidgetDefinition {
  /** Unique widget identifier (used as slug) */
  id: string
  /** Display name shown in the widget menu */
  name: string
  /** Emoji or text icon for the widget header */
  icon: string
  /** React component to render inside the widget card */
  component: React.FC<any>
  /** Default grid size when adding the widget (defaults to { w: 6, h: 2 }) */
  defaultSize?: { w: number; h: number }
  /** Optional background color for the icon badge */
  iconBg?: string
}

// ─── Global Store ───────────────────────────────────────────────────────────

/** Augment Window to include the widget registry */
declare global {
  interface Window {
    __aupWidgets?: WidgetDefinition[]
  }
}

function getStore(): WidgetDefinition[] {
  if (typeof window === 'undefined') return []
  if (!window.__aupWidgets) {
    window.__aupWidgets = []
  }
  return window.__aupWidgets
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Register a custom widget for the AUP dashboard.
 * Call this at module init time (e.g. in a 'use client' barrel or layout component).
 *
 * Duplicate IDs are silently ignored (first registration wins).
 */
export function registerWidget(def: WidgetDefinition): void {
  const store = getStore()
  if (store.some((w) => w.id === def.id)) return
  store.push(def)
}

/**
 * Get all registered custom widgets.
 * Returns an empty array during SSR.
 */
export function getRegisteredWidgets(): WidgetDefinition[] {
  return getStore()
}
