# Changelog

## [0.4.0] - 2026-09-07 — Access control on the audit trail, and an install contract that matches reality

### Breaking

- **The package is ESM only.** `dist/index.cjs` and `dist/index.d.cts` are no longer built or
  published, and the `require` condition is gone from `exports["."]`; `main` now points at
  `dist/index.js`. `require('@consilioweb/payload-admin-ui-pro')` from a CommonJS file fails with
  `ERR_PACKAGE_PATH_NOT_EXPORTED`. That path was already broken — the CJS bundle emitted
  `require('payload/shared')` and `payload` is ESM-only — but it happened to work on Node ≥ 20.19 /
  22.12 through `require(esm)`, so those consumers are the ones this changes. Import the plugin from
  an ESM file; a Payload config is loaded as ESM anyway.

- **`@payloadcms/ui` is now a required peer dependency.** It sat in `peerDependenciesMeta` as
  `optional` while five field-enhance components import `useField` from it. Installs that did not
  already declare it — strict pnpm in particular — will now report a missing peer. Add
  `@payloadcms/ui@^3.0.0` to your own dependencies.

- **`optionalDependencies` removed.** `@consilioweb/payload-admin-nav` and
  `@consilioweb/payload-admin-theme` are no longer pulled in with this package. Neither was ever
  imported (the Plugins Hub detects them from the DOM at runtime), and the pinned `^0.12.0` /
  `^0.2.0` ranges could no longer reach their current releases. If you were relying on them arriving
  transitively, install them yourself.

- **`next`, `react-dom`, `@payloadcms/next` and `@payloadcms/translations` are no longer declared as
  peer dependencies.** None of them is imported by this package. Nothing breaks at install time —
  this only removes constraints — but the announced compatibility matrix changes: the hard
  `next: ^14 || ^15 || ^16` requirement is gone, and `react-dom` is no longer constrained by this
  package. `react` itself is untouched: still declared `^18.0.0 || ^19.0.0`, exactly as in 0.3.0.
  The version you can run in practice is the one your `@payloadcms/ui` release allows — recent ones
  require React 19 — but that is a property of `@payloadcms/ui`, not a constraint this version
  relaxes.

- **`engines.node` narrowed** from `>=18` to `^18.20.2 || >=20.9.0`, aligned with `payload`'s own
  engines. Node 18.0–18.20.1, the entire 19.x line and 20.0–20.8 now produce an install warning,
  and an error under `engine-strict`.

- **The audit trail now enforces access control** (see Security below).
  `GET /api/admin-ui-pro/activity` answers 403 to accounts that are not administrators, and the four
  components that read it — the notification bell, the activity feed, the Activity Analytics widget
  and the Document Timeline — render empty for them instead of failing. The same rule is now the
  `access.read` **and** the `access.delete` of the `activity-log` collection itself, so a direct
  `DELETE /api/activity-log/:id` over the REST API is refused where it used to pass — on a host with
  no role field, any authenticated account could previously delete log rows that way.
  For an account to keep reading or deleting the log it must (1) belong to the collection declared in
  `admin.user` of your Payload config — members of any other auth collection are now refused — and
  (2) hold an administrator role in `user.role` or `user.roles`: `admin` or `superadmin`,
  case-insensitive, as plain strings or as `{ value: 'admin' }` entries. Hosts that declare no role
  field at all are unaffected and keep full access.

- **`DELETE /api/admin-ui-pro/activity/cleanup` now requires an explicit administrator role.** It
  deletes rows, so the fail-open branch is closed on that endpoint: a host declaring no role field at
  all is denied there, while the read path still passes. That role check is the only axis on which
  the cleanup endpoint is stricter than the collection rule. It does **not** apply the `admin.user`
  collection check, and it still deletes with `overrideAccess: true`, so an account belonging to
  another auth collection but carrying an `admin` role is refused when reading the log yet can still
  purge it. That asymmetry is a known gap in 0.4.0; if such accounts exist on your host, keep the
  endpoint behind your own edge rule.

- **An empty-string `role` no longer falls back to administrator permissions.** `getPrimaryRole`
  used to return `''` for an account shaped `{ role: '', roles: ['editor'] }`; `''` is falsy, so
  `resolvePermissions` skipped the role table entirely and applied its no-recognised-role fallback,
  which is `ADMIN_PERMISSIONS`. The empty string is now ignored in favour of `roles`, and that same
  account resolves to `EDITOR_PERMISSIONS`. This narrows permissions everywhere the plugin reads them
  — dashboard, settings, branding, list views — not only on the audit trail. Accounts with an empty
  `role` **and** no `roles` array still fall back to admin, as before.

- **The command palette (⌘K) now returns only documents the caller may read.** A restricted editor
  will see fewer results than before; collections the account cannot read are skipped rather than
  failing the search.

- **`activityConfig` is no longer part of an unauthenticated `GET /api/globals/aup-settings`.** The
  global stays publicly readable — the login page reads its branding before anyone is signed in —
  but that group is now gated on `req.user`. Code of yours reading `activityConfig.retentionDays`,
  `activityConfig.trackFields` or `activityConfig.notificationRules` from an unauthenticated fetch
  now gets `undefined`; send the request with a session.

### Security

- **Notification webhook URLs were readable without an account.** The `aup-settings` global is
  declared `read: () => true`, so an unauthenticated `GET /api/globals/aup-settings` returned
  `activityConfig.notificationRules[].webhookUrl` — a Slack or Discord webhook URL is a bearer
  credential — together with the tracked collection slugs and event rules, to anyone able to reach
  the API. The `activityConfig` group now requires an authenticated session; the rest of the global
  (branding, theme) stays public because the login screen needs it.

- **The audit trail was readable by any authenticated account.** `GET /api/admin-ui-pro/activity`
  only checked that a session existed, then read with `overrideAccess: true` behind a comment
  claiming an admin check had happened above — there was none. Any signed-in user, including one
  belonging to an unrelated auth collection such as a front-office customer or an API client, could
  page through the whole log: administrator e-mail addresses, collection names, document ids and
  changed field names. The handler now forwards `req` with `overrideAccess: false`, so the
  collection's own `access.read` decides, and that rule now also refuses users outside the admin
  user collection.

- **The command-palette search ran fully elevated.** `GET /api/admin-ui-pro/search` called
  `payload.find()` without `req`, and the Local API defaults to `overrideAccess: true`, so the
  result list could surface documents the caller has no right to read. It now searches as the
  caller.

### Added

- **`userCollectionSlug` option in `AdminUiProConfig`.** The activity log and the dashboard
  preferences each build a relationship on the admin user collection, and both hardcoded
  `relationTo: 'users'`. On a host whose auth collection is named `admins`, `staff` or `members`,
  config sanitization threw `InvalidFieldRelationship` and the app would not boot with the plugin at
  all — the only workaround being to disable both the `activity` and `dashboard` modules. Worse and
  silent: a host keeping a non-auth `users` collection next to an `admins` one booted fine, then
  wrote `admins` ids into a relation pointing at `users`. The slug is now resolved as: this option >
  `admin.user` of your config > the first collection with `auth` > `'users'`. Set it only when
  auto-detection picks the wrong one. Sites whose auth collection is already called `users` see no
  schema change and have nothing to migrate.

- **`createActivityLogCollection(slug, userCollectionSlug)`.** The exported factory takes a second
  parameter (default `'users'`) so callers wiring the collection by hand can point its `user`
  relationship at their own auth collection; the plugin now passes the resolved slug.
  `createDashboardPreferencesCollection` already had that parameter — it was simply never passed.
  Existing one-argument calls are unaffected.

- **Unit test suite** — 124 tests in `src/__tests__/` (up from 30) covering the endpoint handlers,
  RBAC resolution, audit-trail access, locale key parity, the six module config transforms and the
  dashboard widget fetches.

### Changed

- **A throwing `access.permissions` resolver is now reported instead of swallowed.** The `catch` was
  empty and the fallback is `ADMIN_PERMISSIONS`, so a resolver that crashed granted *more* access
  than intended, without a single line of log. It now writes
  `[admin-ui-pro] access.permissions resolver threw (…)`. Resolved permissions are unchanged — only
  the console output is new, which matters if your CI fails on warnings. The usual cause was the
  README's own example, written `permissions: ({ user }) => …`: the callback receives the user
  document itself, not a `{ user }` wrapper. The example is corrected; check your server logs after
  editing yours.

- **`"sideEffects": false`** is declared in `package.json`, so bundlers can drop the unused part of
  the `./client` barrel, which re-exports about 50 modules — `@dnd-kit/core` was being kept on every
  admin page for the dashboard's drag and drop alone. No module in this package has a load-time side
  effect; if you imported one purely for its evaluation, it may now be tree-shaken away.

- **README corrections that change what a working configuration looks like**: the eight themes are
  now listed with their real `theme.preset` ids (`indigo-pro`, `emerald-nature`, `slate-corporate`,
  `amber-warm`, `rose-soft`, `ocean-deep`, `crimson-bold`, `midnight-dark`) instead of display names
  that `getThemeById()` resolves to `null` with no warning and no theme CSS; the command-palette
  example uses the real `quickActions.actions: [{ id, label, action: { type: 'url', url } }]` shape
  rather than the `customActions: [{ href }]` form, which does not typecheck; `theme.preset` and
  `theme.accent` are documented in the options reference, with the rule that `accent` is read only
  when `preset === 'custom'`; and the install section now states the mandatory
  `pnpm payload generate:importmap` step, without which none of the components injected by string
  path resolve — no error, just nothing rendered. Re-run it after every upgrade of this package.

### Fixed

- **Document Timeline, Presence Indicator and Version Diff now actually render.** They were injected
  into `admin.components.afterDocument`, which is not a slot Payload knows about; unknown keys are
  dropped in silence, so three features listed in the README have never appeared in the edit view.
  They now mount in `admin.components.edit.beforeDocumentControls`, preserving any component your
  own config already placed there. Version Diff is still added only to collections with `versions`
  enabled.

- **The Stats widget no longer downloads whole collections in order to count them.** It fetched
  `/api/<slug>?limit=0&depth=0`, and in Payload `limit=0` means "disable pagination": the adapter
  returned every row, ran access control and `afterRead` hooks on each, then serialised the lot —
  for up to 8 collections on every visit to `/admin`, since `stats-1` is in the default layout. It
  now calls `/api/<slug>/count`, which applies the same access control, and falls back to
  `?limit=1&depth=0` on 404/405 for builds without that route. If you filter or instrument admin API
  traffic, expect these paths instead of the old one.

- **The dashboard and the command palette no longer fetch complete documents to display a title.**
  `select[...]` is now applied to the Recent Activity widget, the Collection Overview widget and the
  command palette's recent-documents query, each of which pulled full documents — a Lexical body
  weighs 40–50 KB — to render a single line of text.

- **Administrator roles are recognised consistently everywhere.** Three divergent inline checks
  existed (`user.role === 'admin'`, `user.roles?.includes('admin')`, and the normalising
  `getPrimaryRole`), so an account whose role is spelled `superadmin` or `Admin`, or whose `roles`
  array holds `{ value: 'admin' }`, was granted full permissions everywhere but got a 403 on the
  audit trail — an empty notification bell and activity feed for a genuine administrator. All call
  sites now share a single `isAdminRole` implementation. An empty-string `role` also no longer
  shadows a populated `roles` array — which tightens the permissions of accounts shaped that way, see
  Breaking above.

- **Six interface strings were missing from five locales.** `welcomeThemeDesc`,
  `welcomeBrandingDesc`, `welcomeDashboardDesc`, `pluginsActive`, `pluginsAvailable` and
  `pluginsConfigure` fell back to English on the welcome widget and the Plugins Hub in `de`, `es`,
  `it`, `pt` and `ja`.

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

## [0.3.0] - 2026-08-08 — Le code peut enfin déclarer sa charte

### Added
- **`theme.preset` et `theme.accent`** dans la configuration du plugin. Jusqu'ici la seule
  source de vérité était le global stocké en base, imposé en `!important` : un consommateur
  n'avait aucun moyen de fixer sa charte depuis son code, il fallait la ressaisir à la main
  dans l'interface sur chaque environnement, sans que rien ne le documente. Ces valeurs sont
  posées en `defaultValue` sur les champs du global : elles s'appliquent tant que personne
  n'a rien choisi, et cèdent dès qu'un choix explicite est enregistré. Ordre de priorité :
  choix de l'utilisateur en base → configuration du code → `indigo-pro`.

### Fixed
- **`branding.loginBackground` n'est plus écrasé par le préréglage en base.** L'ordre de
  résolution était `themeLoginBg || b.loginBackground` : une valeur posée explicitement par
  le consommateur était systématiquement ignorée, et l'option semblait simplement ne rien
  faire. Un préréglage est une valeur *par défaut* — il doit reculer devant un choix explicite.

### Documentation
- **`dashboard.widgets` et `dashboard.defaultLayout` sont signalés comme NON IMPLÉMENTÉS.**
  Les deux champs sont typés, documentés et exportés, et aucune partie du plugin ne les lit :
  `widgets` n'est jamais enregistré dans `widgetRegistry`, `defaultLayout` n'est jamais semé à
  la création d'une préférence. Les déclarer n'a aucun effet, et rien ne le signalait — le
  consommateur ne pouvait le constater qu'en cherchant pourquoi son widget n'apparaissait pas.
  Ils restent en place pour ne pas casser les configurations existantes, avec l'avertissement
  et la voie qui fonctionne réellement (`admin.components.providers`). À implémenter ou à
  retirer en version majeure.

