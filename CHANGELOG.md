# Changelog

## 0.2.1 (2026-04-10)

### New Features

#### Dashboard — Bento layout & 2D resize
- **2D grid layout**: widgets can now span both columns AND rows (`w` × `h`).
  Grid uses `grid-auto-rows: 90px` + `grid-auto-flow: dense` so a tall card on
  the left lines up automatically with two short cards stacked on the right.
- **Mouse-driven resize handle**: drag from the bottom-right corner of any
  widget in edit mode to resize on both axes. Snaps to grid units, bounded
  to `w∈[2,12]` and `h∈[1,8]`.
- `addWidget()` now honors the `defaultSize` from `registerWidget()` instead
  of always creating new widgets at 6×2.
- `resizeWidget(id, w, h?)` accepts an optional height parameter.

### Fixes

- `.aup-grid` columns now use `minmax(0, 1fr)` instead of `1fr` so widgets
  with long content can no longer push columns past their share of the
  container width.

### New Features

#### Dashboard
- Dashboard builder with drag & drop (@dnd-kit)
- 10 widgets: Stats, Quick Actions, Recent Activity, Collection Overview, Welcome, Bookmarks, Notes, Chart (SVG), Activity Feed, Activity Analytics
- Widget resizing (1/4, 1/3, 1/2, 2/3, full)
- Widget SDK: `registerWidget()` for custom widgets
- Customizable title and subtitle

#### List Views
- 5 view modes: Table, Cards, Gallery, Kanban, Calendar
- Auto-detection based on collection field types
- Inline editing (double-click on titles/status in cards and kanban)
- Bulk edit modal (mass editing of arbitrary fields)
- CSV export from list views
- Saved Views persisted server-side (Payload preferences)
- Calendar drag & drop for scheduling documents
- ViewSwitcher with localStorage persistence

#### Command Palette
- Cmd+K / Ctrl+K with fuzzy search
- Full-text server-side search (300ms debounce, rate limited)
- Keyboard shortcuts: Cmd+/ (help), Cmd+E (sidebar), Cmd+S (save)
- Custom actions with JS callback support

#### Activity & Notifications
- Audit trail (who did what, when — never logs values)
- Notification bell with dropdown feed and unread count
- Collaboration: presence indicators (heartbeat + colored avatars)
- Document Timeline: per-document modification history
- Version Diff: field-by-field comparison with word-level diff + restore
- Activity Analytics: stats, top collections, top contributors
- Notification rules: webhook fire-and-forget on events

#### Branding & Login
- 8 professional themes with live preview
- Theme marketplace: import/export JSON
- Dark mode toggle (auto/light/dark)
- Login page: gradient, glassmorphism, welcome message, footer
- Design applied on login, forgot password, reset password, create-first-user
- Customizable logo and brand name (replaces "Payload")
- Customizable favicon and title suffix

#### Field Enhance
- Checkbox → Toggle switch
- Select → Colored status badge
- Number → Star rating
- Upload → Inline image preview
- Relationship → Card preview

#### Security & RBAC
- Granular permissions per module/role (admin/editor/user)
- Rate limiting on all endpoints
- SENSITIVE_FIELDS: 20 fields excluded + pattern detection
- CSS sanitization (anti-XSS)

#### Infrastructure
- i18n: 7 languages (en, fr, de, es, it, pt, ja) — client + server
- Plugins Hub: automatic detection of installed ConsilioWEB plugins
- Mobile responsive: tablet (1024px) + mobile (640px)
- 5 Playwright E2E test files
- Complete README with configuration examples

### Bug Fixes

- Fix hydration mismatch (greeting + title deferred to client)
- Fix race condition dashboard prefs vs settings
- Fix ListViewsInitializer timing (MutationObserver fallback)
- Fix "Toggle block" text in collapsibles
- Fix validateLayout prototype pollution check
- Fix duplicate key media/create in QuickActionsWidget
- Fix CollectionOverviewWidget slug detection
- Fix login CSS white labels (selectors scoped to .template-minimal)
- Fix dbName for PostgreSQL enum > 63 chars

## 0.1.0 (2026-04-09)

- Initial release with 6 base modules
