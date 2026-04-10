/**
 * Design tokens CSS — injected once via a <style> tag.
 * Layers on top of Payload's --theme-* variables.
 */
export const DESIGN_TOKENS_CSS = `
:root,
[data-theme="light"],
[data-theme="dark"] {
  --aup-accent: hsl(250, 84%, 60%);
  --aup-accent-hover: hsl(250, 84%, 55%);
  --aup-accent-subtle: hsl(250, 84%, 60% / 0.12);
  --aup-accent-border: hsl(250, 84%, 60% / 0.30);
  --aup-green: hsl(158, 64%, 42%);
  --aup-green-subtle: hsl(158, 64%, 42% / 0.12);
  --aup-amber: hsl(38, 92%, 50%);
  --aup-amber-subtle: hsl(38, 92%, 50% / 0.12);
  --aup-red: hsl(0, 72%, 51%);
  --aup-red-subtle: hsl(0, 72%, 51% / 0.12);
  --aup-gradient-accent: linear-gradient(135deg, hsl(250,84%,60%) 0%, hsl(280,72%,58%) 100%);
  --aup-gradient-mesh: radial-gradient(ellipse at 20% 50%, hsl(250,84%,60%/0.06) 0%, transparent 60%),
                       radial-gradient(ellipse at 80% 20%, hsl(280,72%,58%/0.04) 0%, transparent 50%);
  --aup-shadow-1: 0 1px 2px hsl(220 40% 10% / 0.08), 0 0 0 1px hsl(220 40% 10% / 0.04);
  --aup-shadow-2: 0 4px 8px hsl(220 40% 10% / 0.10), 0 1px 3px hsl(220 40% 10% / 0.06);
  --aup-shadow-3: 0 12px 24px hsl(220 40% 10% / 0.12), 0 4px 8px hsl(220 40% 10% / 0.08);
  --aup-shadow-4: 0 24px 48px hsl(220 40% 10% / 0.18), 0 8px 16px hsl(220 40% 10% / 0.10);
  --aup-shadow-accent: 0 0 0 3px hsl(250, 84%, 60% / 0.25);
  --aup-radius-sm: 6px;
  --aup-radius-md: 10px;
  --aup-radius-lg: 16px;
  --aup-radius-xl: 24px;
  --aup-radius-pill: 9999px;
  --aup-font-numeric: 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
  --aup-duration-fast: 120ms;
  --aup-duration-base: 200ms;
  --aup-easing: cubic-bezier(0.16, 1, 0.3, 1);
  --aup-card-bg: var(--theme-elevation-50);
  --aup-card-bg-hover: var(--theme-elevation-100);
  --aup-border-subtle: 1px solid hsl(220 20% 50% / 0.10);
  --aup-border-default: 1px solid hsl(220 20% 50% / 0.18);
}

[data-theme="dark"] {
  --aup-accent: hsl(250, 84%, 68%);
  --aup-accent-subtle: hsl(250, 84%, 68% / 0.15);
  --aup-accent-border: hsl(250, 84%, 68% / 0.35);
  --aup-green: hsl(158, 64%, 52%);
  --aup-green-subtle: hsl(158, 64%, 52% / 0.15);
  --aup-amber: hsl(38, 92%, 60%);
  --aup-amber-subtle: hsl(38, 92%, 60% / 0.15);
  --aup-red: hsl(0, 72%, 60%);
  --aup-red-subtle: hsl(0, 72%, 60% / 0.15);
  --aup-shadow-1: 0 1px 2px hsl(220 60% 4% / 0.40), 0 0 0 1px hsl(220 60% 4% / 0.20);
  --aup-shadow-2: 0 4px 8px hsl(220 60% 4% / 0.50), 0 1px 3px hsl(220 60% 4% / 0.30);
  --aup-shadow-3: 0 12px 24px hsl(220 60% 4% / 0.60), 0 4px 8px hsl(220 60% 4% / 0.40);
  --aup-shadow-4: 0 24px 48px hsl(220 60% 4% / 0.70), 0 8px 16px hsl(220 60% 4% / 0.50);
  --aup-card-bg: var(--theme-elevation-100);
  --aup-card-bg-hover: var(--theme-elevation-150);
  --aup-border-subtle: 1px solid hsl(220 20% 80% / 0.07);
  --aup-border-default: 1px solid hsl(220 20% 80% / 0.12);
  --aup-gradient-mesh: radial-gradient(ellipse at 20% 50%, hsl(250,84%,60%/0.08) 0%, transparent 60%),
                       radial-gradient(ellipse at 80% 20%, hsl(280,72%,58%/0.06) 0%, transparent 50%);
}

/* ── Widget Cards ─────────────────────────────── */
.aup-widget-card {
  background: var(--aup-card-bg);
  border: var(--aup-border-subtle);
  border-radius: var(--aup-radius-lg);
  box-shadow: var(--aup-shadow-1);
  overflow: hidden;
  transition: box-shadow var(--aup-duration-base) var(--aup-easing),
              border-color var(--aup-duration-base) var(--aup-easing),
              transform var(--aup-duration-base) var(--aup-easing);
  display: flex;
  flex-direction: column;
  animation: aup-fadein 0.3s ease forwards;
}
.aup-widget-card:hover {
  box-shadow: var(--aup-shadow-3);
  transform: translateY(-1px);
}
.aup-widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 0;
  gap: 10px;
}
.aup-widget-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.aup-widget-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--aup-accent-subtle);
  border: 1px solid var(--aup-accent-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}
.aup-widget-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--theme-text);
  opacity: 0.50;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0;
}
.aup-widget-content { padding: 16px 20px 20px; flex: 1; }

/* ── Stats Cards ──────────────────────────────── */
.aup-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}
.aup-stat-card {
  position: relative;
  border-radius: var(--aup-radius-md);
  padding: 14px;
  border: 1px solid;
  transition: transform var(--aup-duration-fast) var(--aup-easing), box-shadow var(--aup-duration-fast) var(--aup-easing);
  overflow: hidden;
  cursor: pointer;
  text-decoration: none;
  display: block;
}
.aup-stat-card::before {
  content: '';
  position: absolute;
  top: -20px; right: -20px;
  width: 80px; height: 80px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.06;
  pointer-events: none;
}
.aup-stat-card:hover { transform: translateY(-2px); box-shadow: var(--aup-shadow-2); }
.aup-stat-number {
  font-family: var(--aup-font-numeric);
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  margin: 0 0 4px;
  color: var(--theme-text);
}
.aup-stat-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--theme-text);
  opacity: 0.55;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  margin: 0;
}

/* ── Activity Feed ────────────────────────────── */
.aup-activity-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px;
  border-radius: var(--aup-radius-sm);
  transition: background var(--aup-duration-fast) var(--aup-easing);
  text-decoration: none;
  color: inherit;
}
.aup-activity-item:hover { background: var(--theme-elevation-100); }
.aup-activity-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 21px;
  top: 38px;
  bottom: -8px;
  width: 1px;
  background: var(--theme-elevation-200);
}
.aup-activity-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  position: relative;
  z-index: 1;
}
.aup-activity-avatar--created { background: var(--aup-green-subtle); color: var(--aup-green); border: 1px solid hsl(158,64%,42%/0.30); }
.aup-activity-avatar--updated { background: var(--aup-accent-subtle); color: var(--aup-accent); border: 1px solid var(--aup-accent-border); }
.aup-activity-avatar--deleted { background: var(--aup-red-subtle); color: var(--aup-red); border: 1px solid hsl(0,72%,51%/0.30); }
.aup-activity-badge {
  font-size: 10px; font-weight: 600; letter-spacing: 0.05em;
  text-transform: uppercase; padding: 2px 6px; border-radius: var(--aup-radius-pill);
}
.aup-activity-badge--created { background: var(--aup-green-subtle); color: var(--aup-green); }
.aup-activity-badge--updated { background: var(--aup-accent-subtle); color: var(--aup-accent); }
.aup-activity-badge--deleted { background: var(--aup-red-subtle); color: var(--aup-red); }

/* ── Quick Actions ────────────────────────────── */
.aup-actions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.aup-action-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-radius: var(--aup-radius-md);
  border: var(--aup-border-subtle); background: var(--theme-elevation-50);
  color: var(--theme-text); font-size: 13px; font-weight: 500;
  cursor: pointer; text-decoration: none;
  transition: all var(--aup-duration-base) var(--aup-easing);
  position: relative; overflow: hidden;
}
.aup-action-btn::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--aup-gradient-accent); border-radius: 0 2px 2px 0;
  transform: scaleY(0); transform-origin: center;
  transition: transform var(--aup-duration-fast) var(--aup-easing);
}
.aup-action-btn:hover::before { transform: scaleY(1); }
.aup-action-btn:hover {
  background: var(--aup-card-bg-hover); box-shadow: var(--aup-shadow-1); transform: translateX(2px);
}
.aup-action-icon {
  width: 32px; height: 32px; border-radius: var(--aup-radius-sm);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; flex-shrink: 0;
  transition: transform var(--aup-duration-fast) var(--aup-easing);
}
.aup-action-btn:hover .aup-action-icon { transform: scale(1.1); }
.aup-action-arrow {
  font-size: 14px; opacity: 0; transform: translateX(-4px);
  transition: opacity var(--aup-duration-fast) var(--aup-easing), transform var(--aup-duration-fast) var(--aup-easing);
}
.aup-action-btn:hover .aup-action-arrow { opacity: 0.40; transform: translateX(0); }

/* ── Command Palette ──────────────────────────── */
.aup-palette-overlay {
  position: fixed; inset: 0;
  background: hsl(220 40% 10% / 0.50);
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  z-index: 9998;
  animation: aup-fade-in var(--aup-duration-fast) var(--aup-easing);
}
@keyframes aup-fade-in { from { opacity: 0; } to { opacity: 1; } }
.aup-palette-dialog {
  position: fixed; top: 20vh; left: 50%; transform: translateX(-50%);
  width: min(560px, calc(100vw - 32px));
  background: var(--theme-elevation-50);
  border: var(--aup-border-default);
  border-radius: var(--aup-radius-xl);
  box-shadow: var(--aup-shadow-4);
  z-index: 9999; overflow: hidden;
  animation: aup-slide-in var(--aup-duration-base) var(--aup-easing);
}
@keyframes aup-slide-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.97); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
.aup-palette-item {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 20px; cursor: pointer;
  transition: background var(--aup-duration-fast); position: relative;
  text-decoration: none; color: inherit;
}
.aup-palette-item:hover, .aup-palette-item[aria-selected="true"] {
  background: var(--aup-accent-subtle);
}
.aup-palette-item[aria-selected="true"]::before {
  content: ''; position: absolute; left: 0; top: 6px; bottom: 6px; width: 3px;
  background: var(--aup-gradient-accent); border-radius: 0 2px 2px 0;
}
.aup-palette-item-icon {
  width: 30px; height: 30px; border-radius: var(--aup-radius-sm);
  background: var(--theme-elevation-100); border: var(--aup-border-subtle);
  display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;
}
.aup-kbd {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 5px; border-radius: 5px;
  background: var(--theme-elevation-150); border: var(--aup-border-default);
  border-bottom-width: 2px; font-size: 11px; font-weight: 600;
  font-family: var(--aup-font-numeric); color: var(--theme-text); opacity: 0.65;
}

/* ── Responsive Grid ──────────────────────────── */
/* 12 columns x auto-rows of 90px allows widgets to span both axes (w*h).
 * grid-auto-flow:dense fills holes so a tall card on the left and two short
 * cards on the right line up automatically. */
.aup-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-rows: 90px;
  grid-auto-flow: dense;
  gap: 16px;
}
@media (max-width: 1024px) {
  .aup-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .aup-grid > * { grid-column: span 6 !important; }
}
@media (max-width: 640px) {
  .aup-grid { grid-template-columns: minmax(0, 1fr); }
  .aup-grid > * { grid-column: span 1 !important; grid-row: auto !important; }
  .aup-actions-grid { grid-template-columns: 1fr; }
}

@keyframes aup-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes aup-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* ── Loading skeleton ─────────────────────────── */
.aup-skeleton {
  background: linear-gradient(90deg, var(--theme-elevation-100) 0%, var(--theme-elevation-200) 50%, var(--theme-elevation-100) 100%);
  background-size: 200% 100%;
  animation: aup-shimmer 1.6s ease-in-out infinite;
  border-radius: var(--aup-radius-sm);
}
@keyframes aup-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ═══════════════════════════════════════════════
   Sidebar / Nav Enhancements
   Overrides for Payload default nav + admin-nav plugin
   ═══════════════════════════════════════════════ */

/* Override admin-nav tokens — use our CSS vars so themes can override */
:root {
  --admin-nav-active-border: var(--aup-accent) !important;
  --admin-nav-active-bg: var(--aup-accent-subtle) !important;
  --admin-nav-active-text: var(--aup-accent) !important;
}

/* ── Admin-nav overrides — high specificity with [data-admin-nav] ── */

[data-admin-nav] .admin-nav__dashboard-link--active {
  border-left-color: var(--aup-accent) !important;
  background-color: var(--aup-accent-subtle) !important;
  color: var(--aup-accent) !important;
}

[data-admin-nav] .admin-nav__item-link:hover,
[data-admin-nav] .admin-nav__child-link:hover {
  background-color: var(--aup-accent-subtle) !important;
  color: var(--aup-accent) !important;
  transform: translateX(2px);
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1) !important;
}

[data-admin-nav] .admin-nav__item-link--active,
[data-admin-nav] .admin-nav__item-link--has-active-child {
  border-left-color: var(--aup-accent) !important;
  color: var(--aup-accent) !important;
}

[data-admin-nav] .admin-nav__item-link--active {
  background-color: var(--aup-accent-subtle) !important;
}

[data-admin-nav] .admin-nav__child-link--active {
  border-left-color: var(--aup-accent) !important;
  background-color: var(--aup-accent-subtle) !important;
  color: var(--aup-accent) !important;
}

[data-admin-nav] .admin-nav__group-title {
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  font-size: 10px !important;
  opacity: 0.50;
  padding-top: 14px !important;
  padding-bottom: 4px !important;
  transition: opacity 200ms;
}
[data-admin-nav] .admin-nav__group-title:hover { opacity: 0.80; }

[data-admin-nav] .admin-nav__svg-icon {
  opacity: 0.55;
  transition: opacity 120ms;
}
[data-admin-nav] .admin-nav__item-link:hover .admin-nav__svg-icon,
[data-admin-nav] .admin-nav__item-link--active .admin-nav__svg-icon {
  opacity: 1;
}

[data-admin-nav] .admin-nav__customize-link:hover {
  color: var(--aup-accent) !important;
  background: var(--aup-accent-subtle);
  border-radius: 6px;
}

/* Subtle separator between nav and main content */
[data-admin-nav] .admin-nav {
  border-bottom-color: hsl(220 20% 50% / 0.10) !important;
}

/* ── Payload default nav overrides (when admin-nav is NOT used) ── */
.nav-group .nav-group__toggle:hover { color: var(--aup-accent); }
a[class*="nav__link"][class*="active"] {
  background: var(--aup-accent-subtle) !important;
  color: var(--aup-accent) !important;
}
a[class*="nav__link"]:hover {
  background: var(--aup-accent-subtle);
  color: var(--aup-accent);
}

/* ── Scrollbar polish ── */
nav::-webkit-scrollbar { width: 4px; }
nav::-webkit-scrollbar-track { background: transparent; }
nav::-webkit-scrollbar-thumb { background: var(--theme-elevation-200); border-radius: 4px; }
nav::-webkit-scrollbar-thumb:hover { background: var(--theme-elevation-300); }

/* ═══════════════════════════════════════════════
   Global Payload Admin Overrides
   Polish the default Payload UI with our design tokens
   ═══════════════════════════════════════════════ */

/* ── Header bar ───────────────────────────────── */
header.app-header,
[class*="app-header"] {
  border-bottom: var(--aup-border-subtle) !important;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* ── Buttons — accent color ──────────────────── */
button[class*="btn--style-primary"],
.btn--style-primary,
button[type="submit"][class*="btn"],
a[class*="btn--style-primary"] {
  background: var(--aup-gradient-accent) !important;
  border: none !important;
  border-radius: var(--aup-radius-md) !important;
  font-weight: 600 !important;
  color: #ffffff !important;
  transition: all var(--aup-duration-base) var(--aup-easing) !important;
  box-shadow: 0 2px 8px var(--aup-accent-border) !important;
}
button[class*="btn--style-primary"]:hover,
.btn--style-primary:hover,
button[type="submit"][class*="btn"]:hover,
a[class*="btn--style-primary"]:hover {
  box-shadow: 0 4px 12px var(--aup-accent-border) !important;
  transform: translateY(-1px);
  color: #ffffff !important;
}
/* Ensure all primary-style links/buttons have white text */
[class*="btn"][class*="primary"] a,
[class*="btn"][class*="primary"] span,
a[class*="btn"][class*="primary"],
.collection-list a[class*="btn"] {
  color: #ffffff !important;
}

/* Secondary buttons */
button[class*="btn--style-secondary"],
.btn--style-secondary {
  border-radius: var(--aup-radius-md) !important;
  transition: all var(--aup-duration-base) var(--aup-easing) !important;
}
button[class*="btn--style-secondary"]:hover,
.btn--style-secondary:hover {
  border-color: var(--aup-accent-border) !important;
  color: var(--aup-accent) !important;
}

/* ── Focus states — accent ring ──────────────── */
input:focus,
textarea:focus,
select:focus,
[class*="input"]:focus,
[class*="field__input"]:focus,
[class*="text-input"]:focus {
  border-color: var(--aup-accent) !important;
  box-shadow: 0 0 0 2px var(--aup-accent-subtle) !important;
  outline: none !important;
  transition: border-color var(--aup-duration-fast), box-shadow var(--aup-duration-fast) !important;
}

/* ── Table / List view polish ────────────────── */
/* Row hover */
table tbody tr:hover,
[class*="table"] tbody tr:hover,
.row-1:hover {
  background: var(--aup-accent-subtle) !important;
  transition: background var(--aup-duration-fast) !important;
}

/* Table header */
table thead th,
[class*="table"] thead th {
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  color: var(--theme-text) !important;
  opacity: 0.50;
  border-bottom: 2px solid var(--theme-elevation-200) !important;
}

/* Cell links */
table tbody td a,
[class*="table"] td a {
  transition: color var(--aup-duration-fast) !important;
}
table tbody td a:hover,
[class*="table"] td a:hover {
  color: var(--aup-accent) !important;
}

/* ── Breadcrumbs ─────────────────────────────── */
[class*="step-nav"],
nav[aria-label*="breadcrumb"],
.step-nav {
  font-size: 13px !important;
  font-weight: 500 !important;
}
[class*="step-nav"] a:hover,
.step-nav a:hover {
  color: var(--aup-accent) !important;
}

/* ── Pagination ──────────────────────────────── */
[class*="paginator"] button,
.paginator button,
[class*="page-range"] button {
  border-radius: var(--aup-radius-sm) !important;
  min-width: 32px !important;
  height: 32px !important;
  transition: all var(--aup-duration-fast) !important;
}
[class*="paginator"] button:hover,
.paginator button:hover {
  background: var(--aup-accent-subtle) !important;
  color: var(--aup-accent) !important;
}
[class*="paginator"] button[class*="active"],
[class*="paginator"] button[aria-current="page"] {
  background: var(--aup-accent) !important;
  color: #fff !important;
  border-color: transparent !important;
}

/* ── Empty states ────────────────────────────── */
[class*="no-results"],
.collection-list--no-results {
  padding: 4rem 2rem !important;
  text-align: center !important;
  font-size: 15px !important;
  color: var(--theme-text) !important;
  opacity: 0.50;
}

/* ── Document header (edit view) ─────────────── */
[class*="doc-header"],
.doc-header {
  padding-bottom: 1rem !important;
  margin-bottom: 1.5rem !important;
  border-bottom: var(--aup-border-subtle) !important;
}

/* Status badge in doc header */
[class*="doc-header"] [class*="status"],
[class*="publish-status"] {
  border-radius: var(--aup-radius-pill) !important;
  font-weight: 600 !important;
  font-size: 11px !important;
  letter-spacing: 0.03em !important;
}

/* ── Cards/pills (tags, categories) ──────────── */
[class*="pill"],
[class*="tag"] {
  border-radius: var(--aup-radius-pill) !important;
  transition: all var(--aup-duration-fast) !important;
}
[class*="pill"]:hover,
[class*="tag"]:hover {
  border-color: var(--aup-accent-border) !important;
}

/* ── Drawer / Modal polish ───────────────────── */
[class*="drawer__content"],
[class*="modal__content"] {
  border-radius: var(--aup-radius-xl) !important;
  box-shadow: var(--aup-shadow-4) !important;
}
[class*="drawer__overlay"],
[class*="modal__overlay"] {
  backdrop-filter: blur(4px) !important;
  -webkit-backdrop-filter: blur(4px) !important;
}

/* ── Collapsible sections (in edit view, not settings page) ─────── */
[class*="collapsible__toggle"]:hover {
  color: var(--aup-accent) !important;
}
[class*="collapsible"]:not(.collapsible-field) [class*="collapsible__content"] {
  border-left: 2px solid var(--theme-elevation-100);
  margin-left: 8px;
  padding-left: 16px;
}

/* ── Tabs (Content, Meta, SEO) ───────────────── */
[class*="tabs-field"] button[class*="active"],
[class*="tabs-field__tab-button--active"],
[role="tablist"] button[aria-selected="true"] {
  border-bottom-color: var(--aup-accent) !important;
  color: var(--aup-accent) !important;
  font-weight: 600 !important;
}
[class*="tabs-field"] button:hover,
[role="tablist"] button:hover {
  color: var(--aup-accent) !important;
}

/* ── Relationship field — better select ─────── */
[class*="relationship-add-new"]:hover {
  color: var(--aup-accent) !important;
  border-color: var(--aup-accent-border) !important;
}

/* ── Upload field — thumbnail border ────────── */
[class*="upload__thumbnail"] {
  border-radius: var(--aup-radius-md) !important;
  border: var(--aup-border-subtle) !important;
  overflow: hidden !important;
}

/* ── Toggle switches (role="switch") — accent color ── */
button[role="switch"] {
  transition: background-color var(--aup-duration-base) var(--aup-easing) !important;
  position: relative !important;
  border: none !important;
  box-shadow: none !important;
  min-width: 44px !important;
  min-height: 26px !important;
  border-radius: 13px !important;
  padding: 0 !important;
}
button[role="switch"][aria-checked="true"] {
  background-color: var(--aup-accent) !important;
}
button[role="switch"][aria-checked="false"],
button[role="switch"]:not([aria-checked="true"]) {
  background-color: var(--theme-elevation-300) !important;
}
button[role="switch"]:hover {
  filter: brightness(1.08);
}
/* Thumb — fit inside the track, override Payload's positioning */
button[role="switch"] > * {
  width: 20px !important;
  height: 20px !important;
  border-radius: 50% !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.18) !important;
  top: 3px !important;
  left: 3px !important;
  transition: transform var(--aup-duration-base) var(--aup-easing) !important;
}
button[role="switch"][aria-checked="true"] > * {
  transform: translateX(18px) !important;
}
button[role="switch"][aria-checked="false"] > *,
button[role="switch"]:not([aria-checked="true"]) > * {
  transform: translateX(0px) !important;
}

/* Hide "Toggle block" / "Bloc bascule" text — Payload's toggle button is
   position:absolute + color:transparent by default. We just ensure that
   no custom rule accidentally overrides those defaults. The visible label
   lives in .collapsible__header-wrap, not in the toggle button. */
.collapsible__toggle-wrap .collapsible__toggle {
  color: transparent !important;
  position: absolute !important;
  overflow: hidden !important;
  font-size: 0 !important;
}
.collapsible__toggle-wrap .collapsible__toggle span {
  display: none !important;
}

/* ── Select dropdowns — accent on focus ── */
.rs__control--is-focused,
[class*="react-select"] [class*="control--is-focused"] {
  border-color: var(--aup-accent) !important;
  box-shadow: 0 0 0 2px var(--aup-accent-subtle) !important;
}
[class*="react-select"] [class*="option--is-selected"],
.rs__option--is-selected {
  background-color: var(--aup-accent) !important;
}
[class*="react-select"] [class*="option--is-focused"],
.rs__option--is-focused {
  background-color: var(--aup-accent-subtle) !important;
}

/* ── Collapsible sections in settings — compact card style ── */
.collapsible-field {
  border: var(--aup-border-subtle) !important;
  border-radius: var(--aup-radius-md) !important;
  margin-bottom: 10px !important;
  background: var(--theme-elevation-0) !important;
  box-shadow: var(--aup-shadow-1) !important;
  overflow: hidden !important;
}
.collapsible-field .collapsible__toggle-wrap {
  padding: 10px 16px !important;
  transition: background var(--aup-duration-fast) !important;
  border-bottom: 1px solid transparent !important;
}
.collapsible-field .collapsible__toggle-wrap:hover {
  background: var(--aup-accent-subtle) !important;
}
.collapsible-field[open] .collapsible__toggle-wrap {
  border-bottom-color: var(--theme-elevation-100) !important;
}
.collapsible-field .collapsible__content {
  padding: 12px 16px 16px !important;
}

/* ── Settings global page — wider and spacier ── */
.global-edit .global-edit__fields {
  max-width: 960px !important;
}

/* ── Module toggles row — card style ── */
.group-field__wrap > .row .row__fields {
  gap: 16px !important;
}

/* ── Checkbox fields in settings — larger touch targets ── */
.field-type.checkbox label {
  padding: 8px 0 !important;
}
.field-type.checkbox .field-description {
  margin-top: 2px !important;
  font-size: 12px !important;
  opacity: 0.65 !important;
}

/* ── Group field headers — cleaner look ── */
.group-field__wrap > .group-field__label {
  font-size: 15px !important;
  font-weight: 700 !important;
  letter-spacing: -0.01em !important;
  margin-bottom: 16px !important;
  padding-bottom: 8px !important;
  border-bottom: 1px solid var(--theme-elevation-100) !important;
}
/* Hide empty group labels (label: '') */
.group-field__wrap > .group-field__label:empty {
  display: none !important;
}

/* ── Row field — better alignment ── */
.field-type.row .row__fields {
  gap: 16px !important;
}

/* ── Select fields — consistent min-width ── */
.field-type.select {
  min-width: 200px !important;
}

/* ── Description text — softer appearance ── */
.field-description {
  font-size: 12.5px !important;
  line-height: 1.5 !important;
  color: var(--theme-elevation-500) !important;
}

/* ── Number fields — consistent width ── */
.field-type.number input {
  max-width: 180px !important;
}

/* ── Smooth transitions on all interactive elements ── */
a, button, input, select, textarea,
[class*="btn"], [class*="link"], [class*="tab"] {
  transition: color var(--aup-duration-fast),
              background-color var(--aup-duration-fast),
              border-color var(--aup-duration-fast),
              box-shadow var(--aup-duration-fast),
              transform var(--aup-duration-fast) !important;
}

/* ═══════════════════════════════════════════════════
   RESPONSIVE — Tablet medium (≤768px)
   ═══════════════════════════════════════════════════ */
@media (max-width: 768px) {
  /* Kanban: vertical stacked columns */
  .aup-kanban-board {
    flex-direction: column !important;
    overflow-x: visible !important;
  }
  .aup-kanban-column {
    flex: 1 1 auto !important;
    width: 100% !important;
    min-width: 0 !important;
  }
  /* Calendar: hide empty cells, compact cells */
  .aup-calendar-empty {
    display: none !important;
  }
  .aup-calendar-grid {
    grid-template-columns: repeat(7, 1fr) !important;
  }
  .aup-calendar-cell {
    min-height: 60px !important;
    font-size: 11px !important;
  }
  .aup-calendar-dayheader {
    font-size: 10px !important;
    padding: 4px !important;
  }
}

/* ═══════════════════════════════════════════════════
   RESPONSIVE — Tablet (≤1024px)
   ═══════════════════════════════════════════════════ */
@media (max-width: 1024px) {
  .aup-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
  }
  .aup-widget-card {
    grid-column: span 12 !important;
  }
  .aup-palette-dialog {
    width: min(500px, calc(100vw - 24px)) !important;
    top: 15vh !important;
  }
  .global-edit .global-edit__fields {
    max-width: 100% !important;
    padding: 0 1rem !important;
  }
}

/* ═══════════════════════════════════════════════════
   RESPONSIVE — Mobile (≤640px)
   ═══════════════════════════════════════════════════ */
@media (max-width: 640px) {
  .aup-grid {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
  .aup-widget-card {
    grid-column: span 1 !important;
  }
  .aup-widget-header {
    padding: 12px 14px 0 !important;
  }
  .aup-widget-content {
    padding: 12px 14px !important;
  }
  /* Command palette: fullscreen on mobile */
  .aup-palette-dialog {
    width: 100vw !important;
    top: 0 !important;
    left: 0 !important;
    transform: none !important;
    border-radius: 0 !important;
    height: 100vh !important;
    max-height: 100vh !important;
    display: flex !important;
    flex-direction: column !important;
  }
  .aup-palette-overlay {
    backdrop-filter: blur(8px) !important;
  }
  /* Notification bell dropdown: fullwidth bottom */
  .aup-notif-dropdown {
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    top: auto !important;
    width: 100vw !important;
    max-width: 100vw !important;
    border-radius: 16px 16px 0 0 !important;
    max-height: 60vh !important;
    box-shadow: var(--aup-shadow-4) !important;
  }
  /* Stats grid: 2 columns instead of auto */
  .aup-stat-item {
    min-width: calc(50% - 8px) !important;
  }
  /* Quick actions: vertical stack */
  .aup-action-btn {
    min-width: 100% !important;
  }
  /* Collapsible sections tighter */
  .collapsible-field .collapsible__toggle-wrap {
    padding: 8px 12px !important;
  }
  .collapsible-field .collapsible__content {
    padding: 10px 12px 14px !important;
  }
  /* Row fields stack vertically */
  .field-type.row .row__fields {
    flex-direction: column !important;
    gap: 12px !important;
  }
  .field-type.row .row__fields > * {
    width: 100% !important;
    max-width: 100% !important;
  }
  /* Module toggles: full width each */
  .group-field__wrap > .row .row__fields {
    flex-direction: column !important;
  }
  /* KBD badges smaller */
  .aup-kbd {
    font-size: 9px !important;
    padding: 1px 5px !important;
  }
}
`
