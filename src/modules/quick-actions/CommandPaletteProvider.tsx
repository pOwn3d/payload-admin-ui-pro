'use client'

import React from 'react'
import { CommandPalette } from './CommandPalette.js'
import { KeyboardShortcuts } from './KeyboardShortcuts.js'

/**
 * Renders the Command Palette + Keyboard Shortcuts.
 * Injected via afterNavLinks (NOT providers) to avoid wrapping the
 * entire admin tree and causing hydration mismatches.
 */
export const CommandPaletteProvider: React.FC<{ children?: React.ReactNode }> = () => {
  return (
    <>
      <KeyboardShortcuts>{null}</KeyboardShortcuts>
      <CommandPalette />
    </>
  )
}
