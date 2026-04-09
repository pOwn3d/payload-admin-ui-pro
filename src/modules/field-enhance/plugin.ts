import type { CollectionConfig, Config, Field } from 'payload'
import type { FieldEnhanceModuleConfig, AdminUiProConfig } from '../../types.js'

/**
 * Field Enhance sub-module.
 * Scans collections and replaces field components with enhanced versions.
 *
 * Two modes:
 * - opt-in (default): only fields with admin.custom.enhance are modified
 * - aggressive: auto-detects eligible fields by type and constraints
 */
export function fieldEnhanceModule(
  moduleConfig: FieldEnhanceModuleConfig | undefined,
  _pluginConfig: AdminUiProConfig,
) {
  return (incomingConfig: Config): Config => {
    const config = { ...incomingConfig }
    const aggressive = moduleConfig?.aggressive ?? false
    const enableToggle = moduleConfig?.toggle !== false
    const enableBadge = moduleConfig?.statusBadge !== false
    const enablePreview = moduleConfig?.imagePreview !== false
    const enableRelation = moduleConfig?.relationCard !== false
    const enableRating = moduleConfig?.rating !== false

    config.collections = (config.collections || []).map((col) => {
      if (col.admin?.hidden) return col
      return enhanceCollection(col, { aggressive, enableToggle, enableBadge, enablePreview, enableRelation, enableRating })
    })

    // Also enhance globals
    config.globals = (config.globals || []).map((glob) => {
      const enhanced = enhanceFields(glob.fields || [], { aggressive, enableToggle, enableBadge, enablePreview, enableRelation, enableRating })
      return { ...glob, fields: enhanced }
    })

    return config
  }
}

interface EnhanceOptions {
  aggressive: boolean
  enableToggle: boolean
  enableBadge: boolean
  enablePreview: boolean
  enableRelation: boolean
  enableRating: boolean
}

function enhanceCollection(col: CollectionConfig, opts: EnhanceOptions): CollectionConfig {
  return {
    ...col,
    fields: enhanceFields(col.fields || [], opts),
  }
}

function enhanceFields(fields: Field[], opts: EnhanceOptions): Field[] {
  return fields.map((field): Field => {
    // Skip UI fields and unnamed fields
    if (!('name' in field)) {
      // Handle group/row/collapsible/tabs that contain sub-fields
      if ('fields' in field) {
        const f = field as Field & { fields: Field[] }
        return { ...f, fields: enhanceFields(f.fields, opts) } as unknown as Field
      }
      if ('tabs' in field) {
        return field // Don't recurse into tabs — complex type, low ROI
      }
      return field
    }

    const enhance = (field as { admin?: { custom?: { enhance?: string } } }).admin?.custom?.enhance

    // Toggle: checkbox → switch
    if (opts.enableToggle && field.type === 'checkbox') {
      if (enhance === 'toggle' || (opts.aggressive && !enhance)) {
        const f = field as Field & { admin?: Record<string, unknown> }
        return {
          ...f,
          admin: {
            ...f.admin,
            components: {
              ...(f.admin?.components as Record<string, unknown>),
              Field: '@consilioweb/payload-admin-ui-pro/client#ToggleField',
            },
          },
        } as unknown as Field
      }
    }

    // Status badge: select → badges
    if (opts.enableBadge && field.type === 'select') {
      if (enhance === 'badge' || (opts.aggressive && isStatusField(field))) {
        const f = field as Field & { admin?: Record<string, unknown> }
        return {
          ...f,
          admin: {
            ...f.admin,
            components: {
              ...(f.admin?.components as Record<string, unknown>),
              Field: '@consilioweb/payload-admin-ui-pro/client#StatusBadgeField',
              Cell: '@consilioweb/payload-admin-ui-pro/client#StatusBadgeCell',
            },
          },
        } as unknown as Field
      }
    }

    // Rating: number (0-5 or 0-10) → stars
    if (opts.enableRating && field.type === 'number') {
      if (enhance === 'rating' || (opts.aggressive && isRatingField(field))) {
        const f = field as Field & { admin?: Record<string, unknown> }
        return {
          ...f,
          admin: {
            ...f.admin,
            components: {
              ...(f.admin?.components as Record<string, unknown>),
              Field: '@consilioweb/payload-admin-ui-pro/client#RatingField',
            },
          },
        } as unknown as Field
      }
    }

    // Image preview: upload → afterInput preview
    if (opts.enablePreview && field.type === 'upload') {
      if (enhance === 'preview' || opts.aggressive) {
        const f = field as Field & { admin?: Record<string, unknown> }
        const existing = ((f.admin?.components as Record<string, unknown>)?.afterInput as string[]) || []
        return {
          ...f,
          admin: {
            ...f.admin,
            components: {
              ...(f.admin?.components as Record<string, unknown>),
              afterInput: [...existing, '@consilioweb/payload-admin-ui-pro/client#ImagePreviewField'],
            },
          },
        } as unknown as Field
      }
    }

    // Relation card: relationship → afterInput card
    if (opts.enableRelation && field.type === 'relationship') {
      if (enhance === 'card' || (opts.aggressive && !field.hasMany)) {
        const f = field as Field & { admin?: Record<string, unknown> }
        const existing = ((f.admin?.components as Record<string, unknown>)?.afterInput as string[]) || []
        return {
          ...f,
          admin: {
            ...f.admin,
            components: {
              ...(f.admin?.components as Record<string, unknown>),
              afterInput: [...existing, '@consilioweb/payload-admin-ui-pro/client#RelationCardField'],
            },
          },
        } as unknown as Field
      }
    }

    // Recurse into group/array fields
    if (field.type === 'group' || field.type === 'array') {
      const f = field as Field & { fields: Field[] }
      return { ...f, fields: enhanceFields(f.fields, opts) } as unknown as Field
    }

    return field
  })
}

function isStatusField(field: { name?: string }): boolean {
  const name = (field.name || '').toLowerCase()
  return ['status', '_status', 'state', 'phase', 'stage'].includes(name)
}

function isRatingField(field: { min?: number; max?: number }): boolean {
  const min = field.min ?? 0
  const max = field.max ?? Infinity
  return min === 0 && (max === 5 || max === 10)
}
