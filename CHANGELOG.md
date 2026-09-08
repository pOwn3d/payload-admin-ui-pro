# Changelog

## [0.5.0] - 2026-09-08 — Security release

Security release: every version up to and including 0.4.0 carries the flaws below, so this is not
an optional upgrade. The recurring root cause is `!!req.user` used as an admin check — on a host
running a second auth collection next to `admin.user` (a front-office `customers`, `members`,
`subscribers`…), an ordinary signup was enough to reach the plugin's settings, endpoints and
preferences. If your Payload config declares more than one auth collection, audit the settings
global (branding, theme colours, notification rules) and your access logs on
`/api/globals/aup-settings` and `/api/admin-ui-pro/*` before upgrading.

### Security

- **The `aup-settings` global was writable by an account authenticated on any auth collection.**
  `defaultUpdateAccess` checked `req.user`, then called `resolvePermissions(req.user)` — whose
  documented fallback grants full permissions to an authenticated principal carrying no recognised
  role. `/api/globals/aup-settings` is a normal REST route, not an admin-panel-only one, so a
  front-office customer who signed up through your public form could rewrite the login page
  branding (credential phishing served from your own domain), inject custom theme CSS on every
  admin page, and register notification webhooks pointed at their own server. Update now requires
  membership of the collection named by `admin.user` before RBAC is consulted at all. The generous
  fallback for an admin-collection account with an unrecognised role is unchanged.
- **A host-provided `access.permissions` resolver was never called on the settings global.**
  `defaultUpdateAccess` called `resolvePermissions(req.user)` without the plugin config, so the
  README's promise that the resolver feeds the settings global was false: a host who wrote
  `access: { permissions: (user) => ({ settings: user.role === 'owner' }) }` believed writes were
  restricted while the resolver was skipped and the built-in role table decided. The resolver is
  now consulted. **This can remove access that appeared to work** — see Changed.
- **The notification webhook URL was readable by any authenticated account, on any auth
  collection.** The `aup-settings` global is `read: () => true` by design (the login page reads its
  branding before anyone signs in) and the `activityConfig` subtree was gated by `!!req.user`
  alone. A Slack, Discord, Mattermost or n8n incoming-webhook URL *is* the credential: whoever
  reads it can post into the channel it targets. The `conditionField` / `conditionEquals` values,
  which name business fields, and the retention policy leaked with it. Reading that subtree now
  requires the same rule as the audit trail itself (`canAccessActivityLog`: admin collection plus
  an `admin`/`superadmin` role, with the documented fail-open for hosts declaring no role field),
  or the `settings: edit` permission on an admin-collection account.
- **SSRF through the notification webhook (`activity` module).** The only check on `webhookUrl` was
  `startsWith('https://')`, and the send used a bare `fetch` that follows redirects by default. A
  rule pointing at `https://127.0.0.1:8080/…`, `https://169.254.169.254/latest/meta-data/`, or at
  a public URL answering `302` toward one of those, made the Node process issue a POST from inside
  your private network — on every document change, with every error swallowed. Any account able to
  write the settings global (before this release, per the first item, a front-office one) could arm
  it. Webhook targets are now resolved and judged at request time by `assertSafeWebhookUrl`:
  https only, no embedded credentials, loopback / RFC1918 / CGNAT / link-local / IPv4-mapped-IPv6
  literals refused, DNS answers refused when any of them lands in private space, `redirect:
  'manual'` with every hop revalidated, three redirects maximum. Deliberate internal targets are
  declared in code via the new `activity.webhookAllowedHosts`. Stated rather than hidden: DNS
  rebinding between the check and the connection remains possible — closing it needs a pinned-IP
  connect that `fetch` does not expose.
- **The presence endpoints exposed administrators' e-mail addresses and their live editing
  activity to any authenticated account.** `GET`, `POST` and `DELETE
  /api/admin-ui-pro/presence` checked `!!req.user` only, the key space is fully predictable
  (`presence:<collection>:<docId>`), and the `GET` carried no rate limit at all — an enumerable
  read of `userName`, which is the administrator's e-mail, plus who was editing which document in
  real time. The `POST` let the same account register *itself* as an editor on any document, so its
  e-mail appeared in the "X is editing" banner shown to administrators. All three now require the
  admin collection, validate the key against `presence:<collection>:<id>`, and are rate limited
  (GET 120/min, POST 30/min, DELETE 30/min).
- **Stored CSS injection on every admin page through the custom theme colours.**
  `theme.customAccent` was validated on its prefix only (`/^hsl\(\s*\d+/`), which judged the first
  characters and accepted everything after them; `theme.customGreen`, `customAmber` and `customRed`
  had no validation whatsoever. The favicon injector mounts on every admin page and
  `generateCustomCSS` interpolated those values into a `<style>` tag, so a value able to terminate
  its declaration could append arbitrary rules to the whole panel. Colours are now checked at input
  (`validateCssColor`, anchored at both ends) *and* again before injection (`isSafeCssValue` in
  `generateCustomCSS` and `generateThemeCSS`), because a value stored before this release, or
  written through a path that skips Payload validation, never meets a field validator.
- **CSS injection on the unauthenticated login page through `branding.loginBackground`.**
  `validateUrl` accepted anything that merely *started* with `data:image/`, `validateBackground`
  returned early on that branch without ever running `containsDangerousCSS`, and the three
  `background-image: url(…)` interpolations were unquoted. The result is rendered in a `<style>` on
  `/admin` **before authentication**, inside a `position: fixed; inset: 0` pseudo-element: a
  crafted value could close the url token, end the declaration and add its own, giving a full-page
  overlay over the login form (clickjacking, fake re-authentication prompt) and an outbound beacon
  fired by every anonymous visitor of the page. Data URIs are now matched against a complete
  anchored shape (`isSafeDataImageUri`, the single source of truth shared by the validator and by
  `sanitizeCSS`), the dangerous-pattern check runs on **every** branch instead of the gradient one
  only, `image-set()` joins the banned list next to `url()` (same remote-fetch capability, and it
  was reachable from the gradient branch), url tokens are emitted double-quoted with `"` and `\`
  escaped, and `sanitizeCSS` strips `;` from anything that is not a complete image data URI.
- **IDOR on `dashboard-preferences`.** Access control was an id scope
  (`{ user: { equals: req.user.id } }`) with `!!req.user` on create. Ids are per-collection
  sequences on SQLite and Postgres, so `customers#3` and `users#3` are the same `3`: a front-office
  account read, overwrote and deleted an administrator's saved layout, and the `unique` constraint
  on `user` then stopped the victim from recreating it. The dashboard endpoints compounded it by
  running their Local API calls without `req`, i.e. at the elevated `overrideAccess: true` default,
  so the collection's rules never executed. All four operations now require the admin collection,
  and the endpoints forward `req` with `overrideAccess: false`.
- **CSV formula injection in the list-view export.** Cells were quoted on `,`, `"` and `\n` only —
  none of which a formula contains. A value stored by an anonymous visitor through a public
  collection (a contact form, a signup, a support ticket) reached the file bare, and Excel or
  LibreOffice evaluated it in the exporting administrator's session; a `HYPERLINK` payload
  exfiltrates neighbouring cells, that is the personal data of every other exported row. Cells
  beginning with `=`, `+`, `-`, `@`, a tab or a carriage return are now prefixed with an apostrophe
  (plain numbers exempted), and `\r` also forces quoting.
- **`GET /api/admin-ui-pro/collections` disclosed the application schema to any authenticated
  account.** Collections were filtered against the internal slugs but globals were returned whole,
  hidden ones included — the usual opening move of an IDOR sweep on the generated `/api/<slug>`
  routes. Globals now go through the same hidden/skip filter, and the endpoint requires the admin
  collection.
- **`DELETE /api/admin-ui-pro/activity/cleanup` now applies the `admin.user` collection check**,
  closing the asymmetry documented as a known gap in 0.4.0: an account belonging to another auth
  collection but carrying an `admin` role was refused when reading the audit trail yet could still
  purge it. The explicit-administrator-role requirement is unchanged; the handler still deletes
  with `overrideAccess: true`.

### Fixed

- **The audit trail no longer stores a foreign-collection id in its `user` relationship.** That
  relationship points at the admin user collection, but `req.user.id` was written unconditionally:
  a document changed by an account from another auth collection stored, say, a `customers` id in
  it — a dangling foreign key on Postgres, and a row that renders as a completely different person
  in the audit trail. The field is now left empty in that case; `userName` still records who acted,
  so nothing is lost from the trail.
- **`DELETE /api/admin-ui-pro/presence` had no rate limiter** although the README listed all ten
  routes as rate limited. It is now capped at 30/min, matching the POST it pairs with.
- **A theme pasted into the Theme Marketplace whose colours are refused now reports an error**
  instead of silently blanking the `aup-theme-override` style tag and leaving the preview state
  desynchronised from what is rendered.
- **A theme name containing `*/` no longer escapes the CSS comment it is written into** by
  `generateThemeCSS`. Self-inflicted and limited to the pasting user's own browser, but it handed
  the rest of the string to the CSS parser.

### Changed

- **Every `/api/admin-ui-pro/*` endpoint, the `dashboard-preferences` collection and update access
  on the `aup-settings` global now require a session on the collection named by `admin.user`.** An
  account authenticated on another auth collection receives `403` where it used to receive `200`.
  If you were deliberately serving the dashboard, search or presence features to a second auth
  collection, that stops working.
- **A notification webhook whose target resolves into private address space no longer fires.** The
  rule stays stored and the failure is silent, as webhook failures always were. Self-hosted
  endpoints (an internal n8n, a Mattermost on `10.0.0.5`) must be declared in the plugin config as
  `activity.webhookAllowedHosts: ['n8n.internal']` — an exact, case-insensitive hostname match. The
  allowlist deliberately lives in code, so editing the settings global can never widen it.
- **Back-office accounts with an `editor`, `author`, `user` or `viewer` role lose read access to
  the `activityConfig` subtree** of the settings global — the notification rules, their webhook URLs
  and the retention setting. They previously read it as any authenticated principal did.
- **`access.permissions` now decides `settings: edit` on the global.** A resolver that was written
  but never consulted starts applying: accounts it denies lose the ability to save the settings
  global, which they had until now.
- **Custom theme colours must be complete colour values** (`hsl(...)`, `hsla(...)`, `rgb(...)`,
  `oklch(...)`, `#rrggbb`…). A value already in the database is not re-judged when you save an
  unrelated setting — Payload revalidates the whole merged document, so a strict pass over legacy
  values would turn the global into a permanent `400` — but it is dropped at render time and the
  colour simply does not apply. `theme.customAccent` still requires the HSL family, as before.
- **`branding.loginBackground` is the one field where a dangerous pattern is refused even on a
  value already stored.** If your current value contains `url(`, `image-set(`, `@import`,
  `expression(` or `javascript:`, the settings global will refuse to save until that field is
  fixed. This is deliberate: the value renders on the anonymous login page, and grandfathering it
  would keep the hole open.
- **Presence keys must match `presence:<collection>:<id>`** (collection segment up to 64
  characters, id up to 64, `A-Za-z0-9_.-`). The built-in indicator already produces that shape; a
  custom caller using another key gets `{ editors: [] }` on read and `400` on write.
- **CSV exports change shape.** Cells that used to start with `=`, `+`, `-`, `@`, a tab or a
  carriage return now carry a leading apostrophe. Plain numbers such as `-12.5` are exempt, so
  numeric columns still sum, but any downstream parser reading these files should be checked.
- **GitHub Actions are pinned by commit SHA in every workflow, the publish one included** — that
  workflow is the path the npm artifact travels, so a moved tag on a third-party action was a
  supply-chain hole in the released package.

### Added

- **`activity.webhookAllowedHosts?: string[]`** — hostnames accepted as notification-webhook
  targets even though they resolve into private address space. Honoured by both the field validator
  and the runtime guard, so a legitimate internal endpoint no longer has to choose between being
  refused at input and being blocked at send time.
- **`.github/workflows/security.yml`** — dependency audit (`pnpm audit --audit-level high`),
  gitleaks secret scan over the full history, and CodeQL with `security-extended`, on push, on pull
  request and weekly, so an advisory published after a merge still surfaces before the next
  release.
- **`.github/dependabot.yml`** — weekly npm updates and monthly action updates, with major bumps of
  `payload`, `react`, `react-dom` and `next` excluded: those ranges are the package's public
  contract and widening them is a semver decision, not an automated one.

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

