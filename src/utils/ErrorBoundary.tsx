'use client'

import React from 'react'

/**
 * Error boundary for components this plugin injects into somebody else's admin
 * panel.
 *
 * WHY IT DEFAULTS TO RENDERING NOTHING
 *
 * Its predecessor (`utils/SafeProvider.tsx`, deleted) returned
 * `this.props.fallback ?? this.props.children ?? null`. Called without a
 * `fallback` — which was every intended call site, since the docblock advertised
 * a "silent catch" — it re-rendered the very children that had just thrown. They
 * threw again, React caught again, and after a few cycles React gives up on the
 * boundary and unmounts the whole root: the exact opposite of the promise. The
 * default here is `null`, and `children` is never a fallback.
 *
 * WHY THE FALLBACK IS SILENT AND NOT A MESSAGE
 *
 * These components sit in `providers`, `beforeLogin`, `afterNavLinks`, in field
 * rows and in list cells — slots that render on every admin page, sometimes once
 * per table row. A red error panel there would be a banner across the sidebar of
 * an application that is otherwise working. Degrading to nothing loses one
 * decoration; the error itself is still reported to the console.
 *
 * WHAT IT DOES NOT COVER
 *
 * React error boundaries only catch errors raised during render, in lifecycle
 * methods and in constructors. A rejected promise inside an async `useEffect`
 * and a throw inside an event handler both escape. Those need a `try/catch` at
 * the call site — most of the fetches in this package already have one.
 */

export interface ErrorBoundaryProps {
  children: React.ReactNode
  /**
   * What to render instead of the children once they have thrown.
   * Defaults to `null` — never to `children`.
   */
  fallback?: React.ReactNode
  /** Prefix for the console message, so the culprit is identifiable. */
  componentName?: string
  /**
   * Values identifying the input the subtree renders from (a document id, a
   * collection slug, a page number). When one of them changes the boundary
   * clears the error by itself, because the new input may well render fine.
   * Omitted means the boundary never resets on its own.
   */
  resetKeys?: unknown[]
}

interface ErrorBoundaryState {
  hasError: boolean
  /**
   * Bumped on every reset, and used as the `key` of the wrapper around the
   * children so a retry REMOUNTS the subtree. Clearing `hasError` alone keeps
   * the component instance that threw, along with the piece of state that made
   * it throw, so it throws again on the very next render.
   */
  resetCount: number
}

/**
 * Shallow comparison of two reset-key arrays. A missing array counts as empty,
 * so a boundary declared without `resetKeys` never auto-resets.
 */
export function haveResetKeysChanged(previous?: unknown[], next?: unknown[]): boolean {
  const a = previous ?? []
  const b = next ?? []

  if (a.length !== b.length) return true
  return a.some((value, index) => !Object.is(value, b[index]))
}

export class AupErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, resetCount: 0 }
  }

  static getDerivedStateFromError(): Pick<ErrorBoundaryState, 'hasError'> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // The screen shows nothing; the console keeps everything.
    console.error(
      `[admin-ui-pro] ${this.props.componentName || 'component'} crashed and was removed from the page:`,
      error,
      errorInfo,
    )
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (!this.state.hasError) return
    if (!haveResetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) return
    this.reset()
  }

  reset = (): void => {
    this.setState((prev) => ({ hasError: false, resetCount: prev.resetCount + 1 }))
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // `?? null`, never `?? this.props.children`.
      return this.props.fallback ?? null
    }

    return <React.Fragment key={this.state.resetCount}>{this.props.children}</React.Fragment>
  }
}

/**
 * Wrap a component in the boundary at its own module level.
 *
 * Payload mounts these components straight from the import map, so the plugin
 * never gets to be their parent in the host's tree: the only place a boundary
 * can be installed is inside the module that exports them. Keep the wrapped
 * component under the SAME export name the import map references.
 */
export function withAupErrorBoundary<P extends object>(
  Inner: React.ComponentType<P>,
  componentName: string,
  fallback: React.ReactNode = null,
): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => (
    <AupErrorBoundary componentName={componentName} fallback={fallback}>
      <Inner {...props} />
    </AupErrorBoundary>
  )
  Wrapped.displayName = componentName
  return Wrapped
}
