/**
 * DashboardView — RSC wrapper for the custom dashboard.
 * Uses Payload's DefaultTemplate for consistent admin layout (sidebar + header).
 */

import type { AdminViewServerProps } from 'payload'
import React from 'react'
import { DashboardViewClient } from './DashboardViewClient.js'

/**
 * DashboardView — RSC wrapper for the custom dashboard.
 * Payload already wraps dashboard views in its own template (sidebar + header),
 * so we do NOT use DefaultTemplate here — that would duplicate the sidebar.
 */
export const DashboardView: React.FC<AdminViewServerProps> = (props) => {
  const { initPageResult } = props

  // Let Payload handle auth redirects — don't redirect ourselves
  if (!initPageResult?.req?.user) {
    return null
  }

  return <DashboardViewClient />
}

export default DashboardView
