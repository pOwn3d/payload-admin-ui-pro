'use client'

import React from 'react'
import { CommandPalette } from './CommandPalette.js'
import { KeyboardShortcuts } from './KeyboardShortcuts.js'

/** Inline error boundary — catches crashes without taking down the app */
class SafeBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(e: Error) { console.warn('[admin-ui-pro] CommandPalette error caught:', e.message) }
  render() { return this.state.hasError ? this.props.fallback : this.props.children }
}

export const CommandPaletteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SafeBoundary fallback={<>{children}</>}>
      <KeyboardShortcuts>
        {children}
        <CommandPalette />
      </KeyboardShortcuts>
    </SafeBoundary>
  )
}
