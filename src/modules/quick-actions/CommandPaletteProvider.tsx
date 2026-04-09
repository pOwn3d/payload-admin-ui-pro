'use client'

import React from 'react'
import { CommandPalette } from './CommandPalette.js'
import { KeyboardShortcuts } from './KeyboardShortcuts.js'

/**
 * Provider wrapper for the Command Palette + Keyboard Shortcuts.
 * Injected via admin.components.providers to wrap the entire admin app.
 * This ensures it renders above everything, including when admin-nav
 * hides afterNavLinks siblings with display:none.
 */
export const CommandPaletteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <KeyboardShortcuts>
      {children}
      <CommandPalette />
    </KeyboardShortcuts>
  )
}
