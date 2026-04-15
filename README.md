<!-- Header Banner -->
<div align="center">

  <a href="https://git.io/typing-svg">
    <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=32&duration=3000&pause=1000&color=6366F1&center=true&vCenter=true&width=700&lines=%40consilioweb%2Fpayload-admin-ui-pro;Professional+Admin+UI+for+Payload;8+Themes+%7C+Dashboard+Builder;Kanban+%7C+Calendar+%7C+Gallery;Command+Palette+%7C+Notifications" alt="Typing SVG" />
  </a>

  <br><br>

  <!-- Badges -->
  <a href="https://www.npmjs.com/package/@consilioweb/payload-admin-ui-pro"><img src="https://img.shields.io/npm/v/@consilioweb/payload-admin-ui-pro?style=for-the-badge&logo=npm&logoColor=white&color=CB3837" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@consilioweb/payload-admin-ui-pro"><img src="https://img.shields.io/npm/dw/@consilioweb/payload-admin-ui-pro?style=for-the-badge&logo=npm&logoColor=white&color=CB3837" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/Payload%20CMS-3.x-0F172A?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDdWMTdMMTIgMjJMMjAgMTdWN0wxMiAyWiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=&logoColor=white" alt="Payload CMS 3">
  <img src="https://img.shields.io/badge/Themes-8+Presets-6366F1?style=for-the-badge" alt="8 Themes">
  <img src="https://img.shields.io/badge/Views-5+Modes-10B981?style=for-the-badge" alt="5 View Modes">
  <img src="https://img.shields.io/badge/i18n-7%20Languages-F59E0B?style=for-the-badge&logo=translate&logoColor=white" alt="i18n 7 Languages">
  <a href="https://github.com/pOwn3d/payload-admin-ui-pro/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-7C3AED?style=for-the-badge" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">

</div>

<p align="center">
  <a href="https://buymeacoffee.com/pown3d">
    <img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-☕-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy me a coffee" />
  </a>
</p>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="line">

## About

> **@consilioweb/payload-admin-ui-pro** — A comprehensive admin UI enhancement plugin for Payload CMS 3. Transforms the default admin panel into a professional, modern experience with 8 themes, dashboard builder, 5 list view modes (cards/gallery/kanban/calendar), command palette, field enhancements, activity audit trail, notifications, collaboration presence, and more. Fully configurable from the admin panel — no code changes required.

<table>
  <tr>
    <td align="center" width="25%">
      <img src="https://img.icons8.com/color/96/paint-palette.png" width="50"/><br>
      <b>8 Themes</b><br>
      <sub>Live preview + marketplace</sub>
    </td>
    <td align="center" width="25%">
      <img src="https://img.icons8.com/color/96/dashboard-layout.png" width="50"/><br>
      <b>Dashboard Builder</b><br>
      <sub>Drag & drop widgets</sub>
    </td>
    <td align="center" width="25%">
      <img src="https://img.icons8.com/color/96/kanban.png" width="50"/><br>
      <b>5 List Views</b><br>
      <sub>Cards, Gallery, Kanban, Calendar</sub>
    </td>
    <td align="center" width="25%">
      <img src="https://img.icons8.com/color/96/search--v1.png" width="50"/><br>
      <b>Command Palette</b><br>
      <sub>Cmd+K fuzzy search</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="25%">
      <img src="https://img.icons8.com/color/96/toggle-on.png" width="50"/><br>
      <b>Field Enhance</b><br>
      <sub>Toggles, badges, ratings</sub>
    </td>
    <td align="center" width="25%">
      <img src="https://img.icons8.com/color/96/activity-history.png" width="50"/><br>
      <b>Activity Trail</b><br>
      <sub>Audit log + notifications</sub>
    </td>
    <td align="center" width="25%">
      <img src="https://img.icons8.com/color/96/lock-2.png" width="50"/><br>
      <b>Branding</b><br>
      <sub>Login, logo, favicon</sub>
    </td>
    <td align="center" width="25%">
      <img src="https://img.icons8.com/color/96/language.png" width="50"/><br>
      <b>i18n Ready</b><br>
      <sub>FR & EN out of the box</sub>
    </td>
  </tr>
</table>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="line">

## Installation

```bash
pnpm add @consilioweb/payload-admin-ui-pro
# or
npm install @consilioweb/payload-admin-ui-pro
```

## Quick Start

```typescript
// payload.config.ts
import { adminUiProPlugin } from '@consilioweb/payload-admin-ui-pro'

export default buildConfig({
  plugins: [
    adminUiProPlugin({
      branding: {
        loginBackground: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        welcomeMessage: 'Welcome back',
      },
      dashboard: {},
      listViews: { autoDetect: true },
      quickActions: {},
      fieldEnhance: { aggressive: true },
      activity: { retentionDays: 90 },
    }),
  ],
})
```

That's it! All features are configurable from **Settings > Admin UI Pro** in the admin panel.

## Modules

### 🎨 Themes (8 presets)

| Theme | Style |
|-------|-------|
| Indigo Pro | Deep indigo-violet, professional |
| Emerald Suite | Green-teal, nature-inspired |
| Sunset Studio | Orange-coral, warm creative |
| Ocean Depth | Deep blue, nautical |
| Rose Quartz | Soft pink, elegant |
| Slate Minimal | Gray, ultra-minimal |
| Cyber Neon | Electric violet-cyan, futuristic |
| Forest Sage | Earth green, organic |

Switch themes live from settings. Import/export community themes as JSON.

### 📊 Dashboard Builder

Drag & drop widget layout powered by **@dnd-kit**. Built-in widgets:
- **Collection Stats** — Document counts with trends
- **Quick Actions** — One-click create/upload shortcuts
- **Recent Activity** — Latest changes across collections
- **Collection Overview** — Latest documents from any collection
- **Welcome** — Onboarding widget for new users

Users can customize their own dashboard. Layout saved per-user.

### 📋 List Views (5 modes)

| Mode | Description | Auto-detected when |
|------|-------------|-------------------|
| Table | Payload default | Always |
| Cards | Visual cards with images & badges | Collection has title/image fields |
| Gallery | Image grid with lightbox | Upload collection |
| Kanban | Drag & drop by status | Collection has status/select field |
| Calendar | Monthly grid by date | Collection has date field |

View preference persisted in localStorage. Includes **bulk select** and **saved filters**.

### ⌘ Command Palette

`Cmd+K` / `Ctrl+K` — Fuzzy search across collections, globals, recent documents, and custom actions. **Full-text server search** when typing 3+ characters (debounced, rate-limited).

### ✨ Field Enhancements

| Original | Enhanced |
|----------|----------|
| Checkbox | Toggle switch |
| Select (status) | Colored badge pill |
| Number (rating) | Star rating |
| Upload | Inline image preview |
| Relationship | Card preview |

Enable per-field with `admin.custom.enhance` or globally with `aggressive: true`.

### 🔐 Branding

- Custom login page with gradient/image backgrounds
- Glassmorphism card or split layout
- Welcome message & footer text
- Custom logo, favicon, title suffix
- Brand name replaces "Payload" in header

### 📝 Activity & Notifications

- Audit trail: who did what, when (never logs field values)
- 🔔 Notification bell with unread count & dropdown feed
- 👥 Collaboration presence indicators (who is editing what — auto-injected on documents)
- 📜 Document timeline — per-document modification history
- 🔄 Version diff — side-by-side comparison with word-level diff + restore
- 📊 Activity analytics — top collections, top contributors, action breakdown
- 🔗 Notification rules — webhook triggers on create/update/delete events
- Sensitive fields automatically excluded

### 🗂 Menu Editor

Visual drag & drop editor to reorder, rename, and hide admin menu items. Accessible from Settings.

### 🧭 Onboarding Wizard

3-step first-run guide: theme selection, branding setup, dashboard customization. Dismisses permanently.

### 📥 Export & Import

- **CSV export** from any list view (filtered data)
- **Inline editing** — double-click on titles/status in cards and kanban views
- **Bulk edit modal** — edit any field across multiple selected documents
- **Config export/import** — copy/paste settings as JSON between instances

### 🌙 Dark Mode

Toggle between light, dark, and auto (system preference) from the admin header.

### ⌨ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette |
| `Cmd+/` | Shortcuts help |
| `Cmd+E` | Toggle sidebar |
| `Cmd+S` | Save document |

## Configuration

### Full options

```typescript
adminUiProPlugin({
  // Disable any module by passing false
  branding: {
    loginBackground: 'linear-gradient(...)',
    loginLayout: 'center', // 'center' | 'split'
    welcomeMessage: 'Welcome',
    loginFooter: '© 2026 MyCompany',
    titleSuffix: 'MyApp',
  },
  dashboard: {
    // Configured via admin settings
  },
  listViews: {
    autoDetect: true,
    collections: {
      posts: {
        views: ['table', 'cards', 'kanban', 'calendar'],
        defaultView: 'cards',
        cardConfig: { titleField: 'title', imageField: 'heroImage', statusField: '_status' },
        kanbanConfig: { statusField: '_status' },
      },
    },
  },
  quickActions: {
    customActions: [
      { id: 'analytics', label: 'Analytics', href: '/admin/analytics', icon: '📈' },
    ],
  },
  fieldEnhance: {
    aggressive: true, // Auto-detect all fields
  },
  activity: {
    retentionDays: 90,
    collections: ['pages', 'posts'], // Track specific collections (default: all)
    skipCollections: ['media'], // Exclude collections
  },
  // Custom access control
  access: {
    settings: ({ req }) => req.user?.role === 'admin',
  },
})
```

### Runtime vs Build-time settings

| Setting | Type | Requires restart? |
|---------|------|-------------------|
| Theme, branding, dashboard | Runtime | No |
| List Views auto-detect | Build-time | Yes |
| Field Enhance aggressive | Build-time | Yes |
| Activity collections | Build-time | Yes |

## Works with

- ✅ [**@consilioweb/payload-admin-nav**](https://www.npmjs.com/package/@consilioweb/payload-admin-nav) — Custom sidebar navigation
- ✅ [**@consilioweb/payload-admin-theme**](https://www.npmjs.com/package/@consilioweb/payload-admin-theme) — Admin theme framework
- ✅ **@payloadcms/plugin-seo** — SEO plugin
- ✅ **@payloadcms/plugin-form-builder** — Form builder

## Requirements

| Dependency | Version |
|-----------|---------|
| Payload CMS | ^3.0.0 |
| Next.js | ^14.0.0 \|\| ^15.0.0 \|\| ^16.0.0 |
| React | ^18.0.0 \|\| ^19.0.0 |

## Supported Languages

English, French, German, Spanish, Italian, Portuguese, Japanese — both client-side UI and server-side Payload labels.

## RBAC (Role-Based Access Control)

```typescript
import { resolvePermissions, hasPermission } from '@consilioweb/payload-admin-ui-pro'

// Built-in role mapping: admin = full access, editor = view only, user = dashboard only
// Custom override via pluginConfig:
adminUiProPlugin({
  access: {
    permissions: ({ user }) => ({
      dashboard: 'edit',
      settings: user.role === 'admin',
      activity: 'view',
    }),
  },
})
```

## Widget SDK

```typescript
import { registerWidget } from '@consilioweb/payload-admin-ui-pro/client'

registerWidget({
  id: 'my-custom-widget',
  name: 'My Widget',
  icon: '🎯',
  component: MyWidgetComponent,
  defaultSize: { w: 6, h: 2 },
})
```

## License

MIT - [ConsilioWEB](https://consilioweb.fr)

---

<p align="center">
  Made with 💜 by <a href="https://consilioweb.fr">ConsilioWEB</a>
</p>
