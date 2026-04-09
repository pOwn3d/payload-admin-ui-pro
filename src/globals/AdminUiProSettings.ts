import type { GlobalConfig } from 'payload'
import type { AdminUiProConfig } from '../types.js'
import { validateUrl, validateBackground, validateTextField } from '../utils/security.js'
import { THEME_PRESETS } from '../styles/theme-presets.js'
import { resolvePermissions, hasPermission } from '../utils/rbac.js'

/**
 * Create the AdminUiPro settings global.
 * Stores persistent configuration editable from the admin panel.
 */
export function createAdminUiProSettingsGlobal(
  pluginConfig: AdminUiProConfig,
): GlobalConfig {
  const brandingDefaults = typeof pluginConfig.branding === 'object' ? pluginConfig.branding : {}
  const activityDefaults = typeof pluginConfig.activity === 'object' ? pluginConfig.activity : {}

  // Build theme options from presets
  const themeOptions = THEME_PRESETS.map((t) => ({
    label: { en: t.name, fr: t.nameFr },
    value: t.id,
  }))
  themeOptions.unshift({ label: { en: 'Custom', fr: 'Personnalisé' }, value: 'custom' })

  return {
    slug: 'aup-settings',
    label: { en: 'Admin UI Pro', fr: 'Admin UI Pro' },
    admin: {
      group: { en: 'Settings', fr: 'Paramètres' },
    },
    access: {
      read: () => true,
      update: pluginConfig.access?.settings ?? defaultUpdateAccess,
    },
    fields: [
      // ── Modules Toggle ─────────────────────────────────────────────
      {
        type: 'group',
        name: 'modulesEnabled',
        label: { en: 'Active Modules', fr: 'Modules actifs' },
        admin: {
          description: {
            en: 'Toggle modules on/off. Note: List Views, Field Enhance, and Activity modules require a server restart to take effect.',
            fr: 'Activez/désactivez les modules. Note : Vues de listes, Champs améliorés et Fil d\'activité nécessitent un redémarrage serveur pour prendre effet.',
          },
        },
        fields: [
          {
            type: 'row',
            fields: [
              moduleToggle('dashboard', { en: 'Dashboard', fr: 'Tableau de bord' }, pluginConfig.dashboard),
              moduleToggle('listViews', { en: 'List Views', fr: 'Vues de listes' }, pluginConfig.listViews),
              moduleToggle('quickActions', { en: 'Quick Actions', fr: 'Actions rapides' }, pluginConfig.quickActions),
            ],
          },
          {
            type: 'row',
            fields: [
              moduleToggle('fieldEnhance', { en: 'Field Enhance', fr: 'Champs améliorés' }, pluginConfig.fieldEnhance),
              moduleToggle('branding', { en: 'Branding', fr: 'Branding' }, pluginConfig.branding),
              moduleToggle('activity', { en: 'Activity Feed', fr: 'Fil d\'activité' }, pluginConfig.activity),
            ],
          },
        ],
      },

      // ── Theme ──────────────────────────────────────────────────────
      {
        type: 'collapsible',
        label: { en: '🎨 Theme', fr: '🎨 Thème' },
        admin: { initCollapsed: true },
        fields: [
          {
            type: 'group',
            name: 'theme',
            label: '',
            fields: [
              {
                name: 'preset',
                type: 'select',
                label: { en: 'Theme Preset', fr: 'Thème prédéfini' },
                defaultValue: 'indigo-pro',
                options: themeOptions,
                admin: {
                  description: {
                    en: 'Choose a professional theme or select "Custom" to define your own colors',
                    fr: 'Choisissez un thème professionnel ou "Personnalisé" pour définir vos propres couleurs',
                  },
                },
              },
              // Theme preview (UI-only field — no data stored)
              {
                name: 'themePreview',
                type: 'ui',
                admin: {
                  components: {
                    Field: '@consilioweb/payload-admin-ui-pro/client#ThemePreview',
                  },
                },
              },
              // Theme marketplace — import/export community themes
              {
                name: 'themeMarketplace',
                type: 'ui',
                admin: {
                  components: {
                    Field: '@consilioweb/payload-admin-ui-pro/client#ThemeMarketplace',
                  },
                },
              },
              {
                name: 'customAccent',
                type: 'text',
                label: { en: 'Custom Accent Color (HSL)', fr: 'Couleur accent personnalisée (HSL)' },
                admin: {
                  condition: (data) => data?.theme?.preset === 'custom',
                  description: {
                    en: 'HSL format: hsl(250, 84%, 60%) — the main accent color for buttons, links, active states',
                    fr: 'Format HSL : hsl(250, 84%, 60%) — couleur accent pour boutons, liens, états actifs',
                  },
                },
                validate: (value: string | null | undefined) => {
                  if (!value) return true
                  if (!/^hsl\(\s*\d+/.test(value)) return 'Format HSL requis : hsl(H, S%, L%)'
                  return true
                },
              },
              {
                name: 'customGreen',
                type: 'text',
                label: { en: 'Custom Success Color (HSL)', fr: 'Couleur succès personnalisée (HSL)' },
                admin: {
                  condition: (data) => data?.theme?.preset === 'custom',
                  width: '50%',
                },
              },
              {
                name: 'customAmber',
                type: 'text',
                label: { en: 'Custom Warning Color (HSL)', fr: 'Couleur avertissement personnalisée (HSL)' },
                admin: {
                  condition: (data) => data?.theme?.preset === 'custom',
                  width: '50%',
                },
              },
              {
                name: 'customRed',
                type: 'text',
                label: { en: 'Custom Danger Color (HSL)', fr: 'Couleur danger personnalisée (HSL)' },
                admin: {
                  condition: (data) => data?.theme?.preset === 'custom',
                  width: '50%',
                },
              },
            ],
          },
        ],
      },

      // ── Logo & Brand ───────────────────────────────────────────────
      {
        type: 'collapsible',
        label: { en: '✦ Logo & Brand', fr: '✦ Logo & Marque' },
        admin: { initCollapsed: true },
        fields: [
          {
            type: 'group',
            name: 'brand',
            label: '',
            fields: [
              {
                name: 'brandName',
                type: 'text',
                label: { en: 'Brand Name', fr: 'Nom de la marque' },
                admin: {
                  description: {
                    en: 'Replaces "Payload" in the admin header',
                    fr: 'Remplace "Payload" dans l\'en-tête admin',
                  },
                },
                validate: (value: string | null | undefined) => {
                  if (!value) return true
                  return validateTextField(value, 50)
                },
              },
              {
                type: 'row',
                fields: [
                  {
                    name: 'logoUrl',
                    type: 'text',
                    label: { en: 'Logo URL', fr: 'URL du logo' },
                    admin: {
                      width: '50%',
                      description: {
                        en: 'URL of the logo image (/ or https://)',
                        fr: 'URL de l\'image du logo (/ ou https://)',
                      },
                    },
                    validate: (value: string | null | undefined) => {
                      if (!value) return true
                      return validateUrl(value)
                    },
                  },
                  {
                    name: 'logoHeight',
                    type: 'number',
                    label: { en: 'Logo Height (px)', fr: 'Hauteur du logo (px)' },
                    defaultValue: 40,
                    min: 16,
                    max: 200,
                    admin: { width: '50%' },
                  },
                ],
              },
            ],
          },
        ],
      },

      // ── Branding & Login ───────────────────────────────────────────
      {
        type: 'collapsible',
        label: { en: '🔐 Branding & Login', fr: '🔐 Branding & Connexion' },
        admin: {
          initCollapsed: true,
          condition: (data) => data?.modulesEnabled?.branding !== false,
        },
        fields: [
          {
            type: 'group',
            name: 'branding',
            label: '',
            fields: [
              {
                name: 'loginBackground',
                type: 'text',
                label: { en: 'Login Background', fr: 'Arrière-plan connexion' },
                defaultValue: brandingDefaults.loginBackground || undefined,
                admin: {
                  description: {
                    en: 'Image URL or CSS gradient. Leave empty to use the theme\'s default login gradient.',
                    fr: 'URL d\'image ou gradient CSS. Laisser vide pour utiliser le gradient par défaut du thème.',
                  },
                },
                validate: (value: string | null | undefined) => {
                  if (!value) return true
                  return validateBackground(value)
                },
              },
              {
                name: 'loginLayout',
                type: 'select',
                label: { en: 'Login Layout', fr: 'Disposition connexion' },
                defaultValue: 'center',
                options: [
                  { label: { en: 'Centered', fr: 'Centrée' }, value: 'center' },
                  { label: { en: 'Split', fr: 'Séparée' }, value: 'split' },
                ],
              },
              {
                type: 'row',
                fields: [
                  {
                    name: 'welcomeMessage',
                    type: 'text',
                    label: { en: 'Welcome Message', fr: 'Message de bienvenue' },
                    defaultValue: brandingDefaults.welcomeMessage || undefined,
                    admin: { width: '50%' },
                    validate: (value: string | null | undefined) => {
                      if (!value) return true
                      return validateTextField(value, 200)
                    },
                  },
                  {
                    name: 'loginFooter',
                    type: 'text',
                    label: { en: 'Footer Text', fr: 'Texte pied de page' },
                    defaultValue: brandingDefaults.loginFooter || undefined,
                    admin: { width: '50%' },
                    validate: (value: string | null | undefined) => {
                      if (!value) return true
                      return validateTextField(value, 200)
                    },
                  },
                ],
              },
              {
                type: 'row',
                fields: [
                  {
                    name: 'faviconUrl',
                    type: 'text',
                    label: { en: 'Favicon URL', fr: 'URL Favicon' },
                    admin: { width: '50%' },
                    validate: (value: string | null | undefined) => {
                      if (!value) return true
                      return validateUrl(value)
                    },
                  },
                  {
                    name: 'titleSuffix',
                    type: 'text',
                    label: { en: 'Title Suffix', fr: 'Suffixe titre' },
                    admin: {
                      width: '50%',
                      description: {
                        en: 'Appended to browser tab title',
                        fr: 'Ajouté au titre de l\'onglet',
                      },
                    },
                    validate: (value: string | null | undefined) => {
                      if (!value) return true
                      return validateTextField(value, 100)
                    },
                  },
                ],
              },
            ],
          },
        ],
      },

      // ── Dashboard ──────────────────────────────────────────────────
      {
        type: 'collapsible',
        label: { en: '📊 Dashboard', fr: '📊 Tableau de bord' },
        admin: {
          initCollapsed: true,
          condition: (data) => data?.modulesEnabled?.dashboard !== false,
        },
        fields: [
          {
            type: 'group',
            name: 'dashboardConfig',
            label: '',
            fields: [
              {
                name: 'defaultWidgets',
                type: 'select',
                hasMany: true,
                label: { en: 'Default Widgets', fr: 'Widgets par défaut' },
                defaultValue: ['stats', 'quick-actions', 'recent-activity', 'collection-overview'],
                options: [
                  { label: { en: 'Collection Stats', fr: 'Statistiques collections' }, value: 'stats' },
                  { label: { en: 'Quick Actions', fr: 'Actions rapides' }, value: 'quick-actions' },
                  { label: { en: 'Recent Activity', fr: 'Activité récente' }, value: 'recent-activity' },
                  { label: { en: 'Collection Overview', fr: 'Aperçu collection' }, value: 'collection-overview' },
                  { label: { en: 'Activity Feed (audit)', fr: 'Fil d\'activité (audit)' }, value: 'activity-feed' },
                  { label: { en: 'Welcome / Onboarding', fr: 'Bienvenue / Onboarding' }, value: 'welcome' },
                  { label: { en: 'Bookmarks', fr: 'Favoris' }, value: 'bookmarks' },
                  { label: { en: 'Notes', fr: 'Notes' }, value: 'notes' },
                  { label: { en: 'Activity Chart', fr: 'Graphique d\'activit\u00e9' }, value: 'chart' },
                ],
                admin: {
                  description: {
                    en: 'Widgets shown by default for new users',
                    fr: 'Widgets affichés par défaut pour les nouveaux utilisateurs',
                  },
                },
              },
              {
                name: 'dashboardTitle',
                type: 'text',
                label: { en: 'Dashboard Title', fr: 'Titre du tableau de bord' },
                admin: {
                  description: {
                    en: 'Custom title shown on the dashboard (default: "Dashboard")',
                    fr: 'Titre personnalisé affiché sur le tableau de bord (défaut : "Tableau de bord")',
                  },
                },
              },
              {
                name: 'dashboardSubtitle',
                type: 'text',
                label: { en: 'Dashboard Subtitle', fr: 'Sous-titre du tableau de bord' },
                admin: {
                  description: {
                    en: 'Short text shown below the title (e.g. company motto)',
                    fr: 'Texte court sous le titre (ex: slogan de l\'entreprise)',
                  },
                },
              },
              {
                name: 'allowCustomization',
                type: 'checkbox',
                label: { en: 'Allow users to customize their dashboard', fr: 'Permettre aux utilisateurs de personnaliser leur tableau de bord' },
                defaultValue: true,
              },
            ],
          },
        ],
      },

      // ── Activity Feed ──────────────────────────────────────────────
      {
        type: 'collapsible',
        label: { en: '📝 Activity Feed', fr: '📝 Fil d\'activité' },
        admin: {
          initCollapsed: true,
          condition: (data) => data?.modulesEnabled?.activity !== false,
        },
        fields: [
          {
            type: 'group',
            name: 'activityConfig',
            label: '',
            fields: [
              {
                name: 'retentionDays',
                type: 'number',
                label: { en: 'Retention (days)', fr: 'Rétention (jours)' },
                defaultValue: activityDefaults.retentionDays ?? 90,
                min: 7,
                max: 365,
                admin: {
                  description: {
                    en: 'Activity logs older than this will be automatically cleaned up',
                    fr: 'Les logs d\'activité plus anciens seront automatiquement supprimés',
                  },
                },
              },
              {
                name: 'trackFields',
                type: 'checkbox',
                label: { en: 'Track changed field names', fr: 'Enregistrer les noms de champs modifiés' },
                defaultValue: true,
                admin: {
                  description: {
                    en: 'Records which fields were modified (never records values)',
                    fr: 'Enregistre quels champs ont été modifiés (jamais les valeurs)',
                  },
                },
              },
              // ── Notification Rules ────────────────────────────────
              {
                name: 'notificationRules',
                type: 'array',
                dbName: 'aup_notif_rules',
                label: { en: 'Notification Rules', fr: 'Règles de notification' },
                labels: {
                  singular: { en: 'Rule', fr: 'Règle' },
                  plural: { en: 'Rules', fr: 'Règles' },
                },
                admin: {
                  description: {
                    en: 'Define rules to send notifications when events occur. Webhooks are fire-and-forget (5s timeout).',
                    fr: 'Définissez des règles pour envoyer des notifications lors d\'événements. Les webhooks sont fire-and-forget (timeout 5s).',
                  },
                  initCollapsed: true,
                },
                fields: [
                  {
                    type: 'row',
                    fields: [
                      {
                        name: 'event',
                        type: 'select',
                        dbName: 'aup_nr_event',
                        label: { en: 'Event', fr: 'Événement' },
                        required: true,
                        options: [
                          { label: { en: 'Created', fr: 'Création' }, value: 'create' },
                          { label: { en: 'Updated', fr: 'Mise à jour' }, value: 'update' },
                          { label: { en: 'Deleted', fr: 'Suppression' }, value: 'delete' },
                        ],
                        admin: { width: '33%' },
                      },
                      {
                        name: 'collection',
                        type: 'text',
                        label: { en: 'Collection', fr: 'Collection' },
                        required: true,
                        defaultValue: '*',
                        admin: {
                          width: '33%',
                          description: {
                            en: 'Collection slug or * for all',
                            fr: 'Slug de collection ou * pour toutes',
                          },
                        },
                      },
                      {
                        name: 'channel',
                        type: 'select',
                        dbName: 'aup_nr_channel',
                        label: { en: 'Channel', fr: 'Canal' },
                        required: true,
                        options: [
                          { label: { en: 'Webhook', fr: 'Webhook' }, value: 'webhook' },
                          { label: { en: 'In-App', fr: 'In-App' }, value: 'in-app' },
                        ],
                        admin: { width: '33%' },
                      },
                    ],
                  },
                  {
                    name: 'webhookUrl',
                    type: 'text',
                    label: { en: 'Webhook URL', fr: 'URL du webhook' },
                    admin: {
                      condition: (_data, siblingData) => siblingData?.channel === 'webhook',
                      description: {
                        en: 'Endpoint receiving the POST request (JSON payload)',
                        fr: 'Endpoint recevant la requête POST (payload JSON)',
                      },
                    },
                    validate: (value: string | null | undefined, { siblingData }: any) => {
                      if (siblingData?.channel !== 'webhook') return true
                      if (!value) return 'Webhook URL is required when channel is webhook'
                      return validateUrl(value)
                    },
                  },
                  {
                    type: 'collapsible',
                    label: { en: 'Condition (optional)', fr: 'Condition (optionnel)' },
                    admin: { initCollapsed: true },
                    fields: [
                      {
                        type: 'row',
                        fields: [
                          {
                            name: 'conditionField',
                            type: 'text',
                            label: { en: 'Field name', fr: 'Nom du champ' },
                            admin: {
                              width: '50%',
                              description: {
                                en: 'Only fire when this field equals the value below',
                                fr: 'Ne déclencher que si ce champ a la valeur ci-dessous',
                              },
                            },
                          },
                          {
                            name: 'conditionEquals',
                            type: 'text',
                            label: { en: 'Equals', fr: 'Égale' },
                            admin: { width: '50%' },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },

      // ── Command Palette ────────────────────────────────────────────
      {
        type: 'collapsible',
        label: { en: '⌘ Command Palette', fr: '⌘ Palette de commandes' },
        admin: {
          initCollapsed: true,
          condition: (data) => data?.modulesEnabled?.quickActions !== false,
        },
        fields: [
          {
            type: 'group',
            name: 'commandPalette',
            label: '',
            fields: [
              {
                name: 'shortcut',
                type: 'select',
                label: { en: 'Keyboard Shortcut', fr: 'Raccourci clavier' },
                defaultValue: 'mod+k',
                options: [
                  { label: '⌘K / Ctrl+K', value: 'mod+k' },
                  { label: '⌘P / Ctrl+P', value: 'mod+p' },
                  { label: '⌘/ / Ctrl+/', value: 'mod+/' },
                ],
              },
              {
                name: 'recentDocsCount',
                type: 'number',
                label: { en: 'Recent documents shown', fr: 'Documents récents affichés' },
                defaultValue: 10,
                min: 0,
                max: 30,
              },
            ],
          },
        ],
      },

      // ── List Views ─────────────────────────────────────────────────
      {
        type: 'collapsible',
        label: { en: '📋 List Views', fr: '📋 Vues de listes' },
        admin: {
          initCollapsed: true,
          condition: (data) => data?.modulesEnabled?.listViews !== false,
        },
        fields: [
          {
            type: 'group',
            name: 'listViewsConfig',
            label: '',
            fields: [
              {
                name: 'autoDetect',
                type: 'checkbox',
                label: { en: 'Auto-detect view modes', fr: 'Détecter automatiquement les modes de vue' },
                defaultValue: true,
                admin: {
                  description: {
                    en: 'Automatically suggest cards/gallery/kanban based on collection field types. ⚠ Requires server restart.',
                    fr: 'Suggérer automatiquement cards/galerie/kanban selon les types de champs. ⚠ Nécessite un redémarrage serveur.',
                  },
                },
              },
              {
                name: 'defaultView',
                type: 'select',
                label: { en: 'Default View Mode', fr: 'Mode de vue par défaut' },
                defaultValue: 'table',
                options: [
                  { label: { en: 'Table', fr: 'Tableau' }, value: 'table' },
                  { label: { en: 'Cards', fr: 'Cartes' }, value: 'cards' },
                  { label: { en: 'Gallery', fr: 'Galerie' }, value: 'gallery' },
                  { label: { en: 'Kanban', fr: 'Kanban' }, value: 'kanban' },
                  { label: { en: 'Calendar', fr: 'Calendrier' }, value: 'calendar' },
                ],
                admin: {
                  description: {
                    en: 'Default view for collections (users can switch individually)',
                    fr: 'Vue par défaut pour les collections (les utilisateurs peuvent changer individuellement)',
                  },
                },
              },
              {
                name: 'savedFilters',
                type: 'checkbox',
                label: { en: 'Enable saved filters', fr: 'Activer les filtres sauvegardés' },
                defaultValue: true,
              },
            ],
          },
        ],
      },

      // ── Field Enhance ──────────────────────────────────────────────
      {
        type: 'collapsible',
        label: { en: '✨ Field Enhancements', fr: '✨ Améliorations des champs' },
        admin: {
          initCollapsed: true,
          condition: (data) => data?.modulesEnabled?.fieldEnhance !== false,
        },
        fields: [
          {
            type: 'group',
            name: 'fieldEnhanceConfig',
            label: '',
            fields: [
              {
                name: 'aggressive',
                type: 'checkbox',
                label: { en: 'Auto-enhance fields', fr: 'Améliorer automatiquement les champs' },
                defaultValue: false,
                admin: {
                  description: {
                    en: 'When enabled, automatically detects and enhances fields. ⚠ Requires server restart.',
                    fr: 'Quand activé, détecte et améliore automatiquement les champs. ⚠ Nécessite un redémarrage serveur.',
                  },
                },
              },
              {
                type: 'row',
                fields: [
                  {
                    name: 'toggle',
                    type: 'checkbox',
                    label: { en: 'Toggle switches', fr: 'Interrupteurs toggle' },
                    defaultValue: true,
                    admin: { width: '33%', description: { en: 'Checkbox → switch', fr: 'Checkbox → interrupteur' } },
                  },
                  {
                    name: 'statusBadge',
                    type: 'checkbox',
                    label: { en: 'Status badges', fr: 'Badges de statut' },
                    defaultValue: true,
                    admin: { width: '33%', description: { en: 'Select → colored pills', fr: 'Select → pilules colorées' } },
                  },
                  {
                    name: 'rating',
                    type: 'checkbox',
                    label: { en: 'Star ratings', fr: 'Notes étoiles' },
                    defaultValue: true,
                    admin: { width: '33%', description: { en: 'Number → stars', fr: 'Number → étoiles' } },
                  },
                ],
              },
              {
                type: 'row',
                fields: [
                  {
                    name: 'imagePreview',
                    type: 'checkbox',
                    label: { en: 'Image previews', fr: 'Aperçus images' },
                    defaultValue: true,
                    admin: { width: '50%', description: { en: 'Upload → inline preview', fr: 'Upload → aperçu inline' } },
                  },
                  {
                    name: 'relationCard',
                    type: 'checkbox',
                    label: { en: 'Relation cards', fr: 'Cartes relation' },
                    defaultValue: true,
                    admin: { width: '50%', description: { en: 'Relationship → card preview', fr: 'Relationship → carte aperçu' } },
                  },
                ],
              },
            ],
          },
        ],
      },

      // ── Integrated Plugins ─────────────────────────────────────────
      {
        type: 'collapsible',
        label: { en: '🔌 Integrated Plugins', fr: '🔌 Plugins intégrés' },
        admin: { initCollapsed: true },
        fields: [
          {
            name: 'pluginsHub',
            type: 'ui',
            admin: {
              components: {
                Field: '@consilioweb/payload-admin-ui-pro/client#PluginsHub',
              },
            },
          },
        ],
      },

      // ── Export / Import ────────────────────────────────────────────
      {
        type: 'collapsible',
        label: { en: '📦 Export / Import', fr: '📦 Exporter / Importer' },
        admin: { initCollapsed: true },
        fields: [
          {
            name: 'exportImportUI',
            type: 'ui',
            admin: {
              components: {
                Field: '@consilioweb/payload-admin-ui-pro/client#ExportImportUI',
              },
            },
          },
        ],
      },
    ],
  }
}

function defaultUpdateAccess({ req }: { req: any }): boolean {
  if (!req.user) return false

  // Use RBAC system to determine settings access
  const permissions = resolvePermissions(req.user)
  return hasPermission(permissions, 'settings', 'edit')
}

function moduleToggle(
  name: string,
  label: string | Record<string, string>,
  configValue: false | object | undefined,
) {
  return {
    name,
    type: 'checkbox' as const,
    label,
    defaultValue: configValue !== false,
    admin: {
      width: '33%',
      readOnly: configValue === false,
    },
  }
}
