'use client'

// Re-export the DashboardClient as DashboardViewClient
// This file exists as a separate "use client" entry point
// so the RSC view can import it safely across the server/client boundary.
export { DashboardClient as DashboardViewClient } from './DashboardClient.js'
