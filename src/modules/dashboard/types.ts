/** A single widget instance in a dashboard layout */
export interface WidgetInstance {
  id: string
  widget: string  // slug reference to a registered widget
  x: number       // grid column (0-based, out of 12)
  y: number       // grid row
  w: number       // width in columns (1-12)
  h: number       // height in rows (1-6)
}

/** Full dashboard layout stored per-user */
export interface DashboardLayout {
  widgets: WidgetInstance[]
  version: number
}

/** Props passed to every widget component */
export interface WidgetProps {
  /** Unique instance ID */
  id: string
  /** Widget registration slug */
  slug: string
  /** Grid width (1-12) */
  width: number
  /** Grid height (1-6) */
  height: number
}

/** Internal widget registry entry (built-in + user-registered) */
export interface WidgetEntry {
  slug: string
  label: string | Record<string, string>
  component: string  // component path for importMap
  defaultSize: 'small' | 'medium' | 'large' | 'full'
  refreshInterval: number
  minRole?: string
}

/** Default grid sizes mapped to columns */
export const SIZE_TO_GRID: Record<string, { w: number; h: number }> = {
  small: { w: 3, h: 2 },
  medium: { w: 4, h: 2 },
  large: { w: 6, h: 3 },
  full: { w: 12, h: 3 },
}
