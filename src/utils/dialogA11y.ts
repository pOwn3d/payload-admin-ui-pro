'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Modal-dialog behaviour: focus containment, focus restoration, and Escape.
 *
 * The five dialogs in this package all declared `role="dialog"` with an
 * `aria-label` and stopped there. What that leaves is a dialog a screen reader
 * announces but does not isolate: `Tab` walks straight out of it into the admin
 * panel underneath, which is still there, still clickable and still read out;
 * closing the dialog drops focus back to `<body>`, so the next `Tab` restarts
 * from the top of the page; and only one of the five closed on Escape.
 *
 * `aria-modal="true"` is the declaration; the three behaviours below are what
 * make the declaration true. Assistive technology is told the rest of the page
 * is inert, so it had better be.
 */

/**
 * Everything that can take focus. `:not([disabled])` and the negative-tabindex
 * exclusion matter: a disabled button and a `tabIndex={-1}` container are both
 * skipped by the browser's own Tab order, and a trap that includes them sends
 * focus to a place the user cannot leave by tabbing again.
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** Focusable descendants, in document order, minus the hidden ones. */
export function getFocusable(container: HTMLElement | null | undefined): HTMLElement[] {
  if (!container) return []

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => {
      if (element.hasAttribute('disabled')) return false
      if (element.getAttribute('aria-hidden') === 'true') return false
      // `offsetParent` is null for `display: none` — but also for a
      // `position: fixed` element, which every one of these dialogs is, so it
      // cannot be the test. `hidden` and the inert attribute can.
      if (element.hasAttribute('hidden')) return false
      return true
    },
  )
}

/**
 * Where `Tab` (or `Shift+Tab`) should land to stay inside the dialog, or `null`
 * when the browser's own behaviour is already correct and nothing should be
 * overridden.
 *
 * Only the two ends of the ring are handled: intercepting every Tab would break
 * the browser's own order inside composite widgets.
 */
export function nextFocusTarget(
  focusable: HTMLElement[],
  active: Element | null,
  shiftKey: boolean,
): HTMLElement | null {
  if (focusable.length === 0) return null

  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!

  // Focus is outside the dialog entirely — pull it back to the near end.
  if (!active || !focusable.includes(active as HTMLElement)) {
    return shiftKey ? last : first
  }

  if (shiftKey && active === first) return last
  if (!shiftKey && active === last) return first

  return null
}

export interface DialogA11yOptions {
  /** The element carrying `role="dialog"`. */
  containerRef: RefObject<HTMLElement | null>
  /** Whether the dialog is currently displayed. */
  open: boolean
  /** Called on Escape. Omit to leave Escape to the caller. */
  onClose?: () => void
  /**
   * Skip moving focus into the dialog on open. For dialogs that already focus a
   * specific control themselves — the command palette focuses its search input.
   */
  autoFocus?: boolean
}

export function useDialogA11y({
  containerRef,
  open,
  onClose,
  autoFocus = true,
}: DialogA11yOptions): void {
  useEffect(() => {
    if (!open) return
    if (typeof document === 'undefined') return

    // Captured before anything is focused, so the element the user came from is
    // the one they are returned to.
    const previouslyFocused = document.activeElement as HTMLElement | null

    if (autoFocus) {
      const focusable = getFocusable(containerRef.current)
      const target = focusable[0] ?? containerRef.current
      // A container with no focusable child still has to receive focus, or the
      // screen reader keeps reading the page behind the dialog.
      if (target === containerRef.current && containerRef.current) {
        containerRef.current.setAttribute('tabindex', '-1')
      }
      target?.focus?.()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const target = nextFocusTarget(
        getFocusable(containerRef.current),
        document.activeElement,
        event.shiftKey,
      )

      if (target) {
        event.preventDefault()
        target.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      // Restored only if it is still in the document: the dialog may have
      // navigated away or removed the element it was opened from.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus?.()
      }
    }
  }, [open, onClose, autoFocus, containerRef])
}
