# @consilioweb/payload-admin-ui-pro

> Adds a themeable shell, a widget dashboard, alternative list views, a command palette, enhanced field controls and an audit trail to the Payload CMS 3 admin panel.

[![npm](https://img.shields.io/npm/v/@consilioweb/payload-admin-ui-pro.svg)](https://www.npmjs.com/package/@consilioweb/payload-admin-ui-pro)
[![license](https://img.shields.io/npm/l/@consilioweb/payload-admin-ui-pro.svg)](https://github.com/pOwn3d/payload-admin-ui-pro/blob/main/LICENSE)
[![Payload](https://img.shields.io/badge/Payload%20CMS-3.x-000000.svg)](https://payloadcms.com)

## About

Payload 3 ships an admin panel built for correctness rather than for the people who spend their day
in it. This plugin adds the layer editors usually ask for next: eight themes, a widget dashboard,
card/gallery/kanban/calendar list views, a `⌘K` palette, richer field controls, and an audit trail
that records who changed what.

Each of the six modules can be switched off independently from the plugin config, and most of the
day-to-day tuning happens in a settings global inside the admin panel rather than in code. The
plugin only touches `config.admin`, `config.endpoints`, collection hooks and two hidden collections
of its own — your collections and data model are left alone.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Modules](#modules)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Collections and Globals](#collections-and-globals)
- [Package Exports](#package-exports)
- [Requirements](#requirements)
- [Access Control](#access-control)
- [Widget SDK](#widget-sdk)
- [Support](#support)
- [License](#license)

## Features

- **8 theme presets** plus a `custom` accent mode, switchable live from the admin panel. Every
  accent is documented in the source with its contrast ratio against white (WCAG AA, 4.5:1).
- **Dashboard builder** — 9 built-in widgets, drag, drop and resize with `@dnd-kit`, layout saved
  per user.
- **5 list view modes** — table, cards, gallery, kanban, calendar — auto-detected from the fields
  a collection actually declares.
- **Command palette** (`⌘K`) over collections, globals, admin pages and recent documents, with a
  server-side search that runs as the caller.
- **Field enhancements** — toggle, status badge, star rating, image preview, relationship card;
  opt-in per field or automatic.
- **Login branding** — background, layout, welcome message, footer, favicon, title suffix.
- **Audit trail** — who did what and when, field names only, never field values; notification bell,
  per-document timeline, version diff with restore, analytics widget and webhook rules.
- **Collaboration presence** — who else has this document open.
- **Dark mode toggle** and a **Plugins Hub** that detects the other ConsilioWEB plugins installed.
- **7 UI languages** — English, French, German, Spanish, Italian, Portuguese, Japanese — on both the
  client components and the Payload labels.

## Installation

```bash
pnpm add @consilioweb/payload-admin-ui-pro
```

Peer dependencies, if your project does not already declare them:

```bash
pnpm add payload @payloadcms/ui react
```

## Quick Start

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { adminUiProPlugin } from '@consilioweb/payload-admin-ui-pro'

export default buildConfig({
  plugins: [
    adminUiProPlugin({
      branding: {
        loginBackground: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        welcomeMessage: 'Welcome back',
      },
      listViews: { autoDetect: true },
      fieldEnhance: { aggressive: true },
      activity: { retentionDays: 90 },
    }),
  ],
})
```

Then regenerate the Payload import map — **this step is not optional**:

```bash
pnpm payload generate:importmap
```

The plugin registers its components by string path (`@consilioweb/payload-admin-ui-pro/client#...`).
Payload resolves those paths through `app/(payload)/admin/importMap.js`, so until that file is
regenerated none of the injected components render — no error, just nothing.
Re-run it after every upgrade of this package.

Everything else is configured from **Settings > Admin UI Pro** in the admin panel
(`/admin/globals/aup-settings`).

## Modules

### Themes (8 presets)

| Theme | `theme.preset` id | Style |
|-------|-------------------|-------|
| Indigo Pro | `indigo-pro` | Deep indigo-violet. Professional, tech-forward. The default. |
| Emerald Nature | `emerald-nature` | Rich green accent. Organic, clean, trustworthy. |
| Slate Corporate | `slate-corporate` | Cool blue-gray. Minimal, enterprise, conservative. |
| Amber Warm | `amber-warm` | Warm golden-orange accent. Energetic, creative, confident. |
| Rose Soft | `rose-soft` | Soft pink-rose accent. Modern, elegant, premium. |
| Ocean Deep | `ocean-deep` | Deep teal-cyan accent. Calm, focused, data-oriented. |
| Crimson Bold | `crimson-bold` | Deep red accent. Strong, confident, media and publishing. |
| Midnight Dark | `midnight-dark` | Ultra-dark. Neon purple on near-black, OLED-optimized. |

Use the id, never the display name: an unknown id makes `getThemeById()` return `null`, no theme
CSS is emitted, and nothing warns. `custom` is also accepted — see `theme.accent` below.

The settings global also exposes a live preview and a small marketplace panel that exports the
current theme as JSON and imports a pasted one, validated against the preset schema.

### Dashboard

Replaces Payload's default dashboard view. Widgets are dragged, dropped and resized with
`@dnd-kit`; the layout is persisted per user in the `dashboard-preferences` collection.

Built-in widgets: `stats` (collection counts), `quick-actions`, `recent-activity`,
`collection-overview`, `welcome`, `bookmarks`, `notes`, `chart` (documents created over the last 30 days, SVG only) and
`activity-analytics` (top collections, top contributors, action breakdown).

Two known gaps in the settings global's **Default Widgets** picker: it offers an `activity-feed`
entry that has no matching built-in widget (the slot renders nothing), and it does not offer
`activity-analytics`, which you can still add from the dashboard's own edit mode.

### List Views (5 modes)

| Mode | Description | Auto-detected when |
|------|-------------|--------------------|
| Table | Payload default | Always |
| Cards | Visual cards with images and badges | A `title`, `name` or `subject` text field, or an upload/`heroImage`/`image`/`thumbnail` field |
| Gallery | Image grid | The collection is an upload collection |
| Kanban | Drag and drop by status | A `select` field named `status` or `_status` |
| Calendar | Monthly grid, grouped by `cardConfig.subtitleField` | A `date` field other than the system timestamps, on a non-upload collection |

A collection is only touched when auto-detection (or your explicit `listViews.collections` entry)
yields more than the table view. The chosen mode is remembered per collection in `localStorage`.

The date that *unlocks* the calendar view and the date the grid *groups on* are two different
things. Detection accepts any content `date` field, but the grid reads `cardConfig.subtitleField`
and falls back to `createdAt` — and auto-detection never fills `subtitleField`. An auto-detected
calendar therefore always groups by `createdAt`, whichever field triggered it; set
`cardConfig.subtitleField` explicitly in `listViews.collections` to group on your own date.

The non-table views add a toolbar with **saved views** (name the current query, view mode and
columns; stored in Payload preferences, so they follow the user across browsers) and a **CSV
export**. The export re-fetches from the collection's REST endpoint sorted by `-updatedAt`: it is
capped at 500 documents, keeps scalar fields only, and does **not** carry over the list's active
filters. Cells starting with `=`, `+`, `-`, `@`, a tab or a carriage return are prefixed with an
apostrophe so a spreadsheet reads them as text — a value stored through a public form must not
become a formula in the exporting administrator's Excel.

Two further features live inside the views rather than in that toolbar, and neither covers all of
them: **inline editing** of titles and status, in cards and kanban, and **bulk select** with a
bulk-edit modal, in the cards view **only** — gallery, kanban and calendar have no selection.
`useBulkSelect`, `BulkActionBar` and `BulkEditModal` are exported from `./client` if you want to
wire them elsewhere.

### Command Palette

`⌘K` / `Ctrl+K`. Indexes collections, globals, a create shortcut per collection, the dashboard and
account pages, and recent documents from the first four collections.

From three characters, it also queries `GET /api/admin-ui-pro/search` (debounced, rate limited to
30 requests per minute). That search is a `like` match on `title` and `name` across at most five
collections, capped at five results per collection and fifteen in total, and it runs as the caller —
documents the account cannot read are not returned.

The shortcut key and the number of recent documents come from the settings global. Only `mod+k`,
`mod+p` and `mod+/` are supported; anything else falls back to `⌘K`.

### Field Enhancements

| Field type | Enhanced into | `admin.custom.enhance` | Auto-applied with `aggressive: true` when |
|------------|---------------|------------------------|-------------------------------------------|
| `checkbox` | Toggle switch | `'toggle'` | The field carries no other `admin.custom.enhance` value |
| `select` | Colored badge (field + list cell) | `'badge'` | Name is `status`, `_status`, `state`, `phase` or `stage` |
| `number` | Star rating | `'rating'` | `max` is 5 or 10, and `min` is 0 or left undeclared |
| `upload` | Inline image preview | `'preview'` | Always |
| `relationship` | Card preview | `'card'` | The field is not `hasMany` |

Applies to collections and globals, recursing into `group`, `array`, `row` and `collapsible`
fields. Tabs are not traversed. Collections marked `admin.hidden` are skipped.

### Branding

Injected on the login screen and on every admin page: gradient or image login background, centered
or split layout, welcome message, footer text, favicon override, and an app title suffix. Brand
name, logo URL and logo height are set in the settings global rather than in the plugin config.

This module also injects the favicon override and the dark mode toggle into `afterNavLinks`, so
`branding: false` removes those two along with the login page — they are not independent switches.

### Activity and Notifications

- Audit trail on every tracked collection: who, what action, which collection, which document,
  which field **names** changed — never the values, and the fields listed in `SENSITIVE_FIELDS`
  (password, token, apiKey, …) are stripped.
- Notification bell in the nav with an unread count and a dropdown feed.
- Per-document timeline and collaboration presence, injected into the edit view's
  `beforeDocumentControls`.
- Version diff with word-level comparison and restore, injected only on collections that have
  `versions` enabled.
- Notification rules, configured in the settings global: match an event (create/update/delete), a
  collection slug (or `*`), and optionally a field-equals condition, then POST the action metadata
  to a webhook — fire-and-forget, 5 s timeout, never any field values. The `in-app` channel is a
  no-op: the notification bell already reads the activity log. The target must be `https` and must
  resolve to a public address: loopback, RFC1918, CGNAT and link-local ranges are refused, at input
  time and again at request time, on the initial URL and after every redirect. Add
  `activity.webhookAllowedHosts` when you deliberately notify an internal endpoint — the allowlist
  is honoured by both checks. A URL already stored before the plugin was upgraded is not re-judged
  when you save an unrelated setting (that would freeze the whole global behind one `400`), but it
  is still refused at request time, so it never fires.

### Dark Mode

Light, dark and auto (system preference), toggled from the admin nav and remembered in
`localStorage`. The toggle is injected by the branding module, so `branding: false` takes it away.

### Plugins Hub

A panel in the settings global that detects which other ConsilioWEB plugins are installed — by
looking for their admin nav links — and links to their configuration page or their npm install
command: `payload-admin-nav`, `payload-seo-analyzer`, `payload-maintenance`, `payload-spellcheck`
and `payload-support`.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Command palette |
| `⌘/` | Shortcuts help dialog |
| `⌘E` | Toggle sidebar |
| `⌘S` | Save document |

## Configuration

### Plugin options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | `false` returns the incoming config untouched. |
| `userCollectionSlug` | `string` | auto-detected | Slug of the collection that authenticates admin users; both hidden collections build a relationship on it. Resolution order: this option, then `admin.user`, then the first collection with `auth`, then `'users'`. Set it only when auto-detection picks the wrong one. |
| `dashboard` | `false \| DashboardModuleConfig` | enabled | Widget dashboard replacing the default view. |
| `listViews` | `false \| ListViewsModuleConfig` | enabled | Alternative list views. |
| `quickActions` | `false \| QuickActionsModuleConfig` | enabled | Command palette and keyboard shortcuts. |
| `fieldEnhance` | `false \| FieldEnhanceModuleConfig` | enabled | Enhanced field components. |
| `branding` | `false \| BrandingModuleConfig` | enabled | Login page, favicon, title suffix. |
| `activity` | `false \| ActivityModuleConfig` | enabled | Audit trail. |
| `theme.preset` | `string` | `'indigo-pro'` | Default value of the settings global's preset select. |
| `theme.accent` | `string` | — | Default custom accent (HSL). Read **only** when the preset is `custom`; with any other preset the theme's own accent wins. Custom colours are validated as whole colour values — a string that could terminate its CSS declaration is refused, at input time and again before injection. |
| `access.settings` | `Access` | RBAC `settings: edit` | Update access on the `aup-settings` global. |
| `access.permissions` | `(user) => Record<string, boolean \| string> \| Promise<Record<string, boolean \| string>>` | — | Custom permission resolver. The exported `PermissionsCallback` type is narrower (`AupPermissions`), but this is the signature TypeScript actually enforces on the config. See [Access Control](#access-control). |
| `componentPaths` | `{ loginBackground?, faviconInjector? }` | package paths | Override component paths for symlinked monorepo development. |

### Module options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `branding.loginBackground` | `string` | — | Image URL or CSS gradient. |
| `branding.loginLayout` | `'center' \| 'split'` | `'center'` | Login card layout. |
| `branding.welcomeMessage` | `string \| false` | — | Heading on the login page. |
| `branding.loginFooter` | `string` | — | Footer text on the login page. |
| `branding.titleSuffix` | `string` | — | Appended to the admin document title as ` — <suffix>`. |
| `listViews.autoDetect` | `boolean` | `true` | Derive the available views from each collection's fields. |
| `listViews.collections` | `Record<string, CollectionViewConfig>` | `{}` | Explicit per-collection configuration; overrides auto-detection for that slug. |
| `fieldEnhance.aggressive` | `boolean` | `false` | Enhance eligible fields without an `admin.custom.enhance` opt-in. |
| `fieldEnhance.toggle` | `boolean` | `true` | Enable the checkbox enhancement. |
| `fieldEnhance.statusBadge` | `boolean` | `true` | Enable the select enhancement. |
| `fieldEnhance.rating` | `boolean` | `true` | Enable the number enhancement. |
| `fieldEnhance.imagePreview` | `boolean` | `true` | Enable the upload enhancement. |
| `fieldEnhance.relationCard` | `boolean` | `true` | Enable the relationship enhancement. |
| `activity.retentionDays` | `number` | `90` | Cutoff used by the cleanup endpoint. |
| `activity.collections` | `string[]` | all | Track only these collections. |
| `activity.skipCollections` | `string[]` | `[]` | Exclude collections, on top of the plugin's own internal ones. |
| `activity.webhookAllowedHosts` | `string[]` | `[]` | Hostnames accepted as notification-webhook targets even though they resolve into private address space. Webhook targets are otherwise refused when they land on loopback, RFC1918, CGNAT or link-local addresses — including after a redirect. Declared in code on purpose: editing the settings global can never widen it. |

`CollectionViewConfig` takes `views` (required), `defaultView`, `cardConfig`
(`imageField`, `titleField`, `subtitleField`, `statusField`, `statusOptions`) and `kanbanConfig`
(`statusField`, `columns`). A `calendarConfig` key also type-checks, but nothing reads it — the
calendar view takes its date from `cardConfig.subtitleField`. See
[Declared but not implemented](#declared-but-not-implemented).

```ts
adminUiProPlugin({
  listViews: {
    autoDetect: true,
    collections: {
      posts: {
        views: ['table', 'cards', 'kanban', 'calendar'],
        defaultView: 'cards',
        // subtitleField doubles as the date the calendar view groups on.
        cardConfig: {
          titleField: 'title',
          imageField: 'heroImage',
          statusField: '_status',
          subtitleField: 'publishedAt',
        },
        kanbanConfig: { statusField: '_status' },
      },
    },
  },
})
```

### Declared but not implemented

These fields exist on the config types — so your editor will suggest them — but nothing in the
plugin reads them. They are kept so existing configurations keep type-checking, and are listed here
so nobody spends an afternoon wondering why they do nothing.

| Option | What to use instead |
|--------|---------------------|
| `theme.sync`, `nav.sync` | Nothing syncs with `payload-admin-theme` or `payload-admin-nav`; the Plugins Hub only detects them from the DOM. |
| `dashboard.widgets`, `dashboard.defaultLayout` | Register widgets client-side with `registerWidget` — see [Widget SDK](#widget-sdk). |
| `dashboard.maxWidgets` | Fixed at 20 (`VALIDATION_LIMITS.maxWidgets`), enforced by the save endpoint. |
| `dashboard.allowUserCustomization` | `dashboardConfig.allowCustomization` in the settings global. |
| `listViews.savedFilters` | Saved views are always available on the non-table views. |
| `listViews.collections[slug].calendarConfig` | `cardConfig.subtitleField` — it is the field the calendar grid actually groups on. `calendarConfig` is never forwarded to the view. |
| `quickActions.shortcut`, `quickActions.recentDocsCount` | The `commandPalette` group of the settings global. |
| `quickActions.actions`, `quickActions.searchCollections` | No substitute today; the palette is injected without props. |
| `fieldEnhance` sub-toggles at runtime | The plugin config values above are the ones that apply; the settings global mirrors them for display only. |
| `activity.trackFields` | `activityConfig.trackFields` in the settings global. |
| `branding.faviconUrl` | `branding.faviconUrl` in the settings global. |
| `componentPaths.loginView` | Only `loginBackground` and `faviconInjector` are read. |

### Runtime vs build-time settings

| Setting | Type | Requires restart? |
|---------|------|-------------------|
| Theme, branding, dashboard | Runtime (settings global) | No |
| List Views auto-detect | Build-time (plugin config) | Yes |
| Field Enhance aggressive | Build-time (plugin config) | Yes |
| Activity collections | Build-time (plugin config) | Yes |

## API Endpoints

Registered on Payload's REST route (`/api` by default). Every endpoint requires a session **on the
collection named by `admin.user`** — an account authenticated on another auth collection (a
front-office `customers`, `members`…) gets a `403`, not a `200`. All ten are rate limited per user,
per the quotas below.

| Method | Path | Access | Rate limit | Purpose |
|--------|------|--------|------------|---------|
| `GET` | `/api/admin-ui-pro/collections` | Admin collection | 300/min | Lists non-internal collections and globals for the palette and the widgets. |
| `GET` | `/api/admin-ui-pro/dashboard` | Admin collection, runs as the caller | 60/min | The caller's saved widget layout. |
| `PATCH` | `/api/admin-ui-pro/dashboard` | Admin collection, runs as the caller | 30/min | Saves the layout after strict size and structure validation. |
| `DELETE` | `/api/admin-ui-pro/dashboard` | Admin collection, runs as the caller | 10/min | Resets the layout to the default. |
| `GET` | `/api/admin-ui-pro/search` | Admin collection, runs as the caller | 30/min | `like` search on `title`/`name` across up to 5 collections, 15 results max. |
| `GET` | `/api/admin-ui-pro/activity` | Administrators (see below) | 60/min | Paginated audit trail. Answers `403` to everyone else. |
| `DELETE` | `/api/admin-ui-pro/activity/cleanup` | Admin collection **and** an explicit administrator role | 5/min | Deletes entries older than `retentionDays`. |
| `GET` | `/api/admin-ui-pro/presence` | Admin collection | 120/min | Who is currently editing a given key. The key must match `presence:<collection>:<id>`. |
| `POST` | `/api/admin-ui-pro/presence` | Admin collection | 30/min | Presence heartbeat; entries expire after 60 s. |
| `DELETE` | `/api/admin-ui-pro/presence` | Admin collection | 30/min | Leaves the presence list. |

Presence is kept in memory, per server instance — it does not survive a restart and is not shared
across replicas.

> `activity/cleanup` remains stricter than the audit trail's read rule on one axis: it demands an
> explicit administrator role, so a host that declares no role field at all is denied rather than
> failing open. It now applies the `admin.user` collection check as well, closing the asymmetry
> where an account in another auth collection carrying an `admin` role was refused on read yet
> could still purge the log.

## Collections and Globals

| Slug | Role | Read | Write |
|------|------|------|-------|
| `activity-log` | Audit trail entries. Hidden from the nav. | Members of the `admin.user` collection holding an `admin`/`superadmin` role (case-insensitive, plain strings or `{ value }` entries). Hosts that declare no role field at all keep access. | Create and update are refused for everyone — entries are written by internal hooks and are immutable. Delete follows the same rule as read. |
| `dashboard-preferences` | One widget layout per user. Hidden from the nav. | Own row, and only for members of the `admin.user` collection — ids are per-collection sequences, so an id scope alone does not separate `users#3` from `customers#3`. | Update and delete: same rule. Create: members of the `admin.user` collection — what keeps it to one row each is the `unique` constraint on `user`, not the access rule. |
| `aup-settings` (global) | All admin-panel settings. Appears under **Settings**. | Public — the login page reads its branding before anyone signs in — **except** the `activityConfig` group, restricted to the `admin.user` collection because it carries webhook URLs, which are bearer credentials. | Members of the `admin.user` collection, then `access.settings` or the RBAC `settings: edit` permission. |

Both collection slugs are fixed. The `user` relationship on each points at the collection resolved
from `userCollectionSlug`.

## Package Exports

| Subpath | Exposes | Environment |
|---------|---------|-------------|
| `.` | `adminUiProPlugin`, `createAdminUiProSettingsGlobal`, `createActivityLogCollection`, `createActivityEndpoints`, `createDashboardPreferencesCollection`, `createDashboardEndpoints`, the RBAC helpers, the security validators, `SENSITIVE_FIELDS`, `VALIDATION_LIMITS` and every config type | Server — imported from `payload.config.ts` |
| `./client` | The `'use client'` components (views, widgets, fields, palette, activity UI) plus `registerWidget` / `getRegisteredWidgets` and the settings/collections caches | Browser — resolved through the Payload import map |
| `./views` | `DashboardView`, `BrandingConfigBridge`, `ListViewsConfigBridge`, `SettingsNavLink` | React Server Components — resolved through the import map |

## Requirements

| Dependency | Version | Peer |
|------------|---------|------|
| Node.js | `^18.20.2 \|\| >=20.9.0` | engines |
| Payload CMS | `^3.0.0` | required |
| `@payloadcms/ui` | `^3.0.0` | required — the field-enhance components import `useField` |
| React | `^18.0.0 \|\| ^19.0.0` | required |

Next.js is not a peer dependency: the package never imports it. The React range you can actually
use is the one your `@payloadcms/ui` version allows — recent releases require React 19.

The package ships **ESM only**. `require()` from a CommonJS file is not supported.

`@dnd-kit/core`, `@dnd-kit/sortable` and `@dnd-kit/utilities` are regular dependencies and are
installed for you.

## Access Control

Permissions are resolved per user and consumed by the dashboard, the settings global and the
branding UI.

```ts
import { resolvePermissions, hasPermission } from '@consilioweb/payload-admin-ui-pro'
```

Resolution order: `user.aupPermissions` on the user document, then `access.permissions` from the
plugin config, then the role table below.

| Role (`user.role` or `user.roles`) | dashboard | listViews | quickActions | fieldEnhance | branding | activity | settings |
|------------------------------------|-----------|-----------|--------------|--------------|----------|----------|----------|
| `admin`, `superadmin` | edit | yes | yes | yes | edit | view | yes |
| `editor`, `author` | view | yes | yes | yes | view | view | no |
| `user`, `viewer` | view | no | no | no | no | no | no |
| No authenticated user | view | no | no | no | no | no | no |
| Unrecognised role, or no role field at all | edit | yes | yes | yes | edit | view | yes |

The last row is the fallback, and it is the admin preset — deliberately generous, so that a project
without RBAC is not locked out of its own admin panel. Only an authenticated user ever reaches it:
with no user at all the resolver returns the `user` preset, hence the row above. Roles are matched
case-insensitively, and a `roles` array may hold plain strings or `{ value }` entries.

An empty-string `role` is ignored in favour of the `roles` array, so `{ role: '', roles: ['editor'] }`
resolves to the editor preset rather than falling through to that fallback.

```ts
adminUiProPlugin({
  access: {
    // The callback receives the USER, not a { user } wrapper.
    permissions: (user) => ({
      dashboard: 'edit',
      settings: user.role === 'admin',
      activity: 'view',
    }),
  },
})
```

> Whatever your resolver returns is merged **on top of the admin preset** — `{ ...ADMIN_PERMISSIONS,
> ...result }`. Keys you omit therefore keep their admin value: the example above never mentions
> `listViews`, `quickActions`, `fieldEnhance` or `branding`, so all four stay fully granted, and
> `permissions: () => ({ settings: false })` restricts nothing but `settings`. To restrict, return
> the complete object. The same merge applies to `aupPermissions` set on a user document.

> The resolver runs inside a `try`. If it throws — for instance when written `({ user }) => …`,
> which reads `user` off a user document that has no such field — the error is logged with
> `[admin-ui-pro]` and resolution falls through to the role table, whose own fallback is the
> **admin** preset. A restriction written the wrong way can therefore grant more than intended, not
> less: check your server logs after changing it.

## Widget SDK

`dashboard.widgets` in the plugin config is not implemented. Register widgets from the client
instead, before the dashboard mounts — an `admin.components.providers` entry is the usual place:

```ts
'use client'
import { registerWidget } from '@consilioweb/payload-admin-ui-pro/client'

registerWidget({
  id: 'my-custom-widget',
  name: 'My Widget',
  icon: '🎯',
  component: MyWidgetComponent,
  defaultSize: { w: 6, h: 2 },
})
```

Registered widgets appear next to the built-in ones in the dashboard's edit mode. Duplicate ids are
ignored — the first registration wins.

## Support

- Issues: <https://github.com/pOwn3d/payload-admin-ui-pro/issues>
- Changelog: <https://github.com/pOwn3d/payload-admin-ui-pro/blob/main/CHANGELOG.md>
- If this plugin saves you time: [buy me a coffee](https://buymeacoffee.com/pown3d)

## License

MIT — [ConsilioWEB](https://consilioweb.fr)
