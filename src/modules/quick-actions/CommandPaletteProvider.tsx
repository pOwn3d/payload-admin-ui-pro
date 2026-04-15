'use client'

import React, { useState, useEffect } from 'react'
import { CommandPalette } from './CommandPalette.js'
import { KeyboardShortcuts } from './KeyboardShortcuts.js'

// Auth pages where complex components should NOT mount (no hooks → no #310)
const AUTH_PATHS = ['/login', '/create-first-user', '/forgot-password', '/reset-password', '/verify-totp', '/setup-totp']

export const CommandPaletteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always call hooks (consistent count between renders)
  const [isAdminPage, setIsAdminPage] = useState(false)

  useEffect(() => {
    const path = window.location.pathname
    const isAuth = AUTH_PATHS.some((p) => path.includes(p))
    setIsAdminPage(!isAuth)
  }, [])

  // On login/auth pages: just render children, skip complex components
  if (!isAdminPage) return <>{children}</>

  return (
    <KeyboardShortcuts>
      {children}
      <CommandPalette />
    </KeyboardShortcuts>
  )
}
