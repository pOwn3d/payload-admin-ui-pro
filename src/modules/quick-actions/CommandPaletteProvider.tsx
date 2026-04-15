'use client'

import React from 'react'
import { SafeErrorBoundary } from '../../utils/SafeProvider.js'
import { CommandPalette } from './CommandPalette.js'
import { KeyboardShortcuts } from './KeyboardShortcuts.js'

/**
 * Provider wrapper for the Command Palette + Keyboard Shortcuts.
 * Injected via admin.components.providers to wrap the entire admin app.
 * Wrapped in SafeErrorBoundary so 401 errors on unauthenticated pages
 * don't crash the entire React tree with #310.
 */
export const CommandPaletteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SafeErrorBoundary fallback={<>{children}</>}>
      <KeyboardShortcuts>
        {children}
        <CommandPalette />
      </KeyboardShortcuts>
    </SafeErrorBoundary>
  )
}
