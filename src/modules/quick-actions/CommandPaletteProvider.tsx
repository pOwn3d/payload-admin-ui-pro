'use client'

import React from 'react'
import { CommandPalette } from './CommandPalette.js'
import { KeyboardShortcuts } from './KeyboardShortcuts.js'
import { withAupErrorBoundary } from '../../utils/ErrorBoundary.js'

/**
 * Renders the Command Palette + Keyboard Shortcuts.
 * Injected via afterNavLinks (NOT providers) to avoid wrapping the
 * entire admin tree and causing hydration mismatches.
 */
const CommandPaletteProviderInner: React.FC<{ children?: React.ReactNode }> = () => {
  return (
    <>
      <KeyboardShortcuts>{null}</KeyboardShortcuts>
      <CommandPalette />
    </>
  )
}

/** Exported through the boundary: Payload mounts this straight from the
  * import map, so the module itself is the only place a boundary fits. */
export const CommandPaletteProvider = withAupErrorBoundary(CommandPaletteProviderInner, 'CommandPaletteProvider')
