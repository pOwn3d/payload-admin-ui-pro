'use client'

import React from 'react'

/**
 * Error boundary that silently catches crashes and renders children only.
 * Used to wrap admin-ui-pro components injected globally (providers, beforeLogin)
 * so that 401 errors or other issues don't crash the entire React app.
 */
export class SafeErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error): void {
    // Silent catch — don't crash the admin app
    console.warn('[admin-ui-pro] Component error caught by SafeErrorBoundary:', error.message)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? this.props.children ?? null
    }
    return this.props.children
  }
}
