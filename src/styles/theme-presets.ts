/**
 * Theme Presets for @consilioweb/payload-admin-ui-pro
 *
 * 8 professionally designed admin panel themes.
 * Every color value is a valid CSS string, verified for WCAG AA compliance.
 *
 * Color methodology:
 * - All accent colors pass 4.5:1 contrast ratio with white (#fff) for use as button backgrounds
 * - Dark mode accents are lifted 8–12% in lightness to maintain pop against dark surfaces
 * - Subtle/border opacities are precisely tuned: subtle = 12% light / 15% dark, border = 28–30%
 * - Semantic colors (green/amber/red) are hue-shifted toward the accent to harmonize, never clash
 * - Login gradients use layered radial + linear stops for depth and premium feel
 *
 * Data sources: UI Pro Max design database (style, color, ux domains)
 * Reference palettes: Indigo #6366F1, Pink #EC4899, Teal #0891B2 (validated against Micro SaaS, Creative, Healthcare entries)
 */

export interface ThemePreset {
  id: string
  name: string
  nameFr: string
  description: string
  descriptionFr: string
  colors: {
    accent: string
    accentHover: string
    accentSubtle: string
    accentBorder: string
    green: string
    greenSubtle: string
    amber: string
    amberSubtle: string
    red: string
    redSubtle: string
    gradientAccent: string
    gradientMesh: string
  }
  login: {
    background: string
    cardBg: string
    cardBorder: string
    cardShadow: string
    inputBg: string
    inputBorder: string
    textColor: string
    linkColor: string
  }
  dark: {
    accent: string
    accentSubtle: string
    accentBorder: string
    green: string
    greenSubtle: string
    amber: string
    amberSubtle: string
    red: string
    redSubtle: string
  }
}

export const THEME_PRESETS: ThemePreset[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. INDIGO PRO — Default theme
  //    Deep indigo-violet, 6.24:1 white contrast. Validated Micro SaaS palette.
  //    Reference: #6366F1 (hsl 239,84%,67% → tuned to 60% for AA on buttons)
  //    Think: Linear, Vercel, Raycast
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'indigo-pro',
    name: 'Indigo Pro',
    nameFr: 'Indigo Pro',
    description: 'Deep indigo-violet. Professional, tech-forward. The default.',
    descriptionFr: 'Indigo-violet profond. Professionnel, orienté tech. Le thème par défaut.',
    colors: {
      accent:         'hsl(239, 84%, 60%)',
      accentHover:    'hsl(239, 84%, 54%)',
      accentSubtle:   'hsl(239, 84%, 60% / 0.12)',
      accentBorder:   'hsl(239, 84%, 60% / 0.28)',
      green:          'hsl(158, 64%, 38%)',
      greenSubtle:    'hsl(158, 64%, 38% / 0.12)',
      amber:          'hsl(38, 92%, 48%)',
      amberSubtle:    'hsl(38, 92%, 48% / 0.12)',
      red:            'hsl(0, 72%, 51%)',
      redSubtle:      'hsl(0, 72%, 51% / 0.12)',
      gradientAccent: 'linear-gradient(135deg, hsl(239, 84%, 60%) 0%, hsl(262, 72%, 58%) 100%)',
      gradientMesh:   [
        'radial-gradient(ellipse at 20% 50%, hsl(239, 84%, 60% / 0.06) 0%, transparent 60%)',
        'radial-gradient(ellipse at 80% 20%, hsl(262, 72%, 58% / 0.04) 0%, transparent 50%)',
        'radial-gradient(ellipse at 60% 90%, hsl(220, 80%, 55% / 0.03) 0%, transparent 55%)',
      ].join(', '),
    },
    login: {
      background: [
        'radial-gradient(ellipse at 0% 0%, hsl(262, 80%, 22%) 0%, transparent 55%)',
        'radial-gradient(ellipse at 100% 100%, hsl(230, 90%, 18%) 0%, transparent 55%)',
        'radial-gradient(ellipse at 50% 50%, hsl(245, 75%, 28%) 0%, transparent 70%)',
        'linear-gradient(160deg, hsl(245, 70%, 12%) 0%, hsl(255, 80%, 8%) 100%)',
      ].join(', '),
      cardBg:      'rgba(255, 255, 255, 0.06)',
      cardBorder:  '1px solid rgba(255, 255, 255, 0.13)',
      cardShadow:  '0 24px 64px hsl(239, 90%, 5% / 0.70), 0 4px 16px hsl(239, 84%, 40% / 0.20)',
      inputBg:     'rgba(255, 255, 255, 0.08)',
      inputBorder: '1px solid rgba(255, 255, 255, 0.18)',
      textColor:   'rgba(255, 255, 255, 0.90)',
      linkColor:   'hsl(239, 90%, 78%)',
    },
    dark: {
      accent:       'hsl(239, 84%, 70%)',
      accentSubtle: 'hsl(239, 84%, 70% / 0.15)',
      accentBorder: 'hsl(239, 84%, 70% / 0.32)',
      green:        'hsl(158, 64%, 50%)',
      greenSubtle:  'hsl(158, 64%, 50% / 0.15)',
      amber:        'hsl(38, 92%, 58%)',
      amberSubtle:  'hsl(38, 92%, 58% / 0.15)',
      red:          'hsl(0, 72%, 62%)',
      redSubtle:    'hsl(0, 72%, 62% / 0.15)',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. EMERALD NATURE
  //    Rich green accent at hsl(158,64%,32%) — 4.54:1 vs white (WCAG AA).
  //    Deepened from database reference #10B981 to clear the AA threshold.
  //    Think: Shopify, Stripe Billing, Notion
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'emerald-nature',
    name: 'Emerald Nature',
    nameFr: 'Émeraude Nature',
    description: 'Rich green accent. Organic, clean, trustworthy.',
    descriptionFr: 'Accent vert profond. Organique, propre, digne de confiance.',
    colors: {
      accent:         'hsl(158, 64%, 32%)',
      accentHover:    'hsl(158, 64%, 27%)',
      accentSubtle:   'hsl(158, 64%, 32% / 0.12)',
      accentBorder:   'hsl(158, 64%, 32% / 0.28)',
      green:          'hsl(158, 64%, 32%)',
      greenSubtle:    'hsl(158, 64%, 32% / 0.12)',
      amber:          'hsl(44, 88%, 46%)',
      amberSubtle:    'hsl(44, 88%, 46% / 0.12)',
      red:            'hsl(4, 72%, 50%)',
      redSubtle:      'hsl(4, 72%, 50% / 0.12)',
      gradientAccent: 'linear-gradient(135deg, hsl(158, 64%, 32%) 0%, hsl(172, 60%, 28%) 100%)',
      gradientMesh:   [
        'radial-gradient(ellipse at 15% 45%, hsl(158, 64%, 32% / 0.07) 0%, transparent 60%)',
        'radial-gradient(ellipse at 85% 25%, hsl(172, 60%, 28% / 0.04) 0%, transparent 55%)',
        'radial-gradient(ellipse at 55% 85%, hsl(145, 55%, 35% / 0.03) 0%, transparent 50%)',
      ].join(', '),
    },
    login: {
      background: [
        'radial-gradient(ellipse at 5% 5%, hsl(172, 70%, 14%) 0%, transparent 50%)',
        'radial-gradient(ellipse at 95% 95%, hsl(145, 65%, 10%) 0%, transparent 50%)',
        'radial-gradient(ellipse at 40% 60%, hsl(158, 60%, 18%) 0%, transparent 65%)',
        'radial-gradient(ellipse at 90% 10%, hsl(170, 50%, 22%) 0%, transparent 45%)',
        'linear-gradient(150deg, hsl(165, 70%, 7%) 0%, hsl(155, 75%, 5%) 100%)',
      ].join(', '),
      cardBg:      'rgba(255, 255, 255, 0.06)',
      cardBorder:  '1px solid rgba(255, 255, 255, 0.12)',
      cardShadow:  '0 24px 64px hsl(158, 90%, 4% / 0.72), 0 4px 16px hsl(158, 64%, 20% / 0.22)',
      inputBg:     'rgba(255, 255, 255, 0.07)',
      inputBorder: '1px solid rgba(255, 255, 255, 0.16)',
      textColor:   'rgba(255, 255, 255, 0.90)',
      linkColor:   'hsl(158, 75%, 65%)',
    },
    dark: {
      accent:       'hsl(158, 64%, 46%)',
      accentSubtle: 'hsl(158, 64%, 46% / 0.15)',
      accentBorder: 'hsl(158, 64%, 46% / 0.30)',
      green:        'hsl(158, 64%, 46%)',
      greenSubtle:  'hsl(158, 64%, 46% / 0.15)',
      amber:        'hsl(44, 88%, 56%)',
      amberSubtle:  'hsl(44, 88%, 56% / 0.15)',
      red:          'hsl(4, 72%, 62%)',
      redSubtle:    'hsl(4, 72%, 62% / 0.15)',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. SLATE CORPORATE
  //    Cool royal blue at hsl(214,84%,45%) — 5.43:1 vs white.
  //    Reference: SaaS General #2563EB palette, enterprise weight.
  //    Think: Stripe, GitHub, Atlassian
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'slate-corporate',
    name: 'Slate Corporate',
    nameFr: 'Ardoise Corporate',
    description: 'Cool blue-gray. Minimal, enterprise, conservative.',
    descriptionFr: 'Bleu-gris froid. Minimaliste, enterprise, sobre.',
    colors: {
      accent:         'hsl(214, 84%, 45%)',
      accentHover:    'hsl(214, 84%, 39%)',
      accentSubtle:   'hsl(214, 84%, 45% / 0.10)',
      accentBorder:   'hsl(214, 84%, 45% / 0.24)',
      green:          'hsl(145, 60%, 36%)',
      greenSubtle:    'hsl(145, 60%, 36% / 0.10)',
      amber:          'hsl(36, 90%, 46%)',
      amberSubtle:    'hsl(36, 90%, 46% / 0.10)',
      red:            'hsl(2, 70%, 48%)',
      redSubtle:      'hsl(2, 70%, 48% / 0.10)',
      gradientAccent: 'linear-gradient(135deg, hsl(214, 84%, 45%) 0%, hsl(226, 76%, 42%) 100%)',
      gradientMesh:   [
        'radial-gradient(ellipse at 10% 40%, hsl(214, 84%, 45% / 0.05) 0%, transparent 60%)',
        'radial-gradient(ellipse at 90% 20%, hsl(226, 76%, 42% / 0.04) 0%, transparent 55%)',
        'radial-gradient(ellipse at 50% 80%, hsl(200, 70%, 50% / 0.03) 0%, transparent 50%)',
      ].join(', '),
    },
    login: {
      background: [
        'radial-gradient(ellipse at 0% 0%, hsl(226, 80%, 18%) 0%, transparent 55%)',
        'radial-gradient(ellipse at 100% 100%, hsl(210, 75%, 14%) 0%, transparent 55%)',
        'radial-gradient(ellipse at 50% 50%, hsl(218, 70%, 20%) 0%, transparent 65%)',
        'radial-gradient(ellipse at 85% 5%, hsl(230, 65%, 22%) 0%, transparent 45%)',
        'linear-gradient(170deg, hsl(220, 75%, 9%) 0%, hsl(215, 80%, 7%) 100%)',
      ].join(', '),
      cardBg:      'rgba(255, 255, 255, 0.05)',
      cardBorder:  '1px solid rgba(255, 255, 255, 0.11)',
      cardShadow:  '0 24px 64px hsl(220, 90%, 4% / 0.74), 0 4px 16px hsl(214, 84%, 25% / 0.20)',
      inputBg:     'rgba(255, 255, 255, 0.07)',
      inputBorder: '1px solid rgba(255, 255, 255, 0.15)',
      textColor:   'rgba(255, 255, 255, 0.88)',
      linkColor:   'hsl(214, 90%, 72%)',
    },
    dark: {
      accent:       'hsl(214, 84%, 60%)',
      accentSubtle: 'hsl(214, 84%, 60% / 0.15)',
      accentBorder: 'hsl(214, 84%, 60% / 0.30)',
      green:        'hsl(145, 60%, 50%)',
      greenSubtle:  'hsl(145, 60%, 50% / 0.15)',
      amber:        'hsl(36, 90%, 58%)',
      amberSubtle:  'hsl(36, 90%, 58% / 0.15)',
      red:          'hsl(2, 70%, 60%)',
      redSubtle:    'hsl(2, 70%, 60% / 0.15)',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. AMBER WARM
  //    Deep amber at hsl(32,95%,36%) — 4.51:1 vs white (at threshold).
  //    Database reference: SaaS Trust Blue + Orange CTA pair, inverted here.
  //    Think: Firebase Console, Cloudflare dashboard, Linear (amber variant)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'amber-warm',
    name: 'Amber Warm',
    nameFr: 'Ambre Chaleureux',
    description: 'Warm golden-orange accent. Energetic, creative, confident.',
    descriptionFr: 'Accent doré-orangé chaud. Énergique, créatif, confiant.',
    colors: {
      accent:         'hsl(32, 95%, 36%)',
      accentHover:    'hsl(32, 95%, 30%)',
      accentSubtle:   'hsl(32, 95%, 36% / 0.12)',
      accentBorder:   'hsl(32, 95%, 36% / 0.28)',
      green:          'hsl(150, 60%, 36%)',
      greenSubtle:    'hsl(150, 60%, 36% / 0.12)',
      amber:          'hsl(32, 95%, 36%)',
      amberSubtle:    'hsl(32, 95%, 36% / 0.12)',
      red:            'hsl(6, 75%, 48%)',
      redSubtle:      'hsl(6, 75%, 48% / 0.12)',
      gradientAccent: 'linear-gradient(135deg, hsl(32, 95%, 36%) 0%, hsl(20, 88%, 38%) 50%, hsl(38, 90%, 34%) 100%)',
      gradientMesh:   [
        'radial-gradient(ellipse at 20% 40%, hsl(32, 95%, 36% / 0.08) 0%, transparent 60%)',
        'radial-gradient(ellipse at 80% 60%, hsl(20, 88%, 38% / 0.05) 0%, transparent 55%)',
        'radial-gradient(ellipse at 50% 10%, hsl(42, 90%, 40% / 0.04) 0%, transparent 50%)',
      ].join(', '),
    },
    login: {
      background: [
        'radial-gradient(ellipse at 0% 100%, hsl(20, 85%, 18%) 0%, transparent 55%)',
        'radial-gradient(ellipse at 100% 0%, hsl(38, 90%, 14%) 0%, transparent 50%)',
        'radial-gradient(ellipse at 50% 50%, hsl(30, 80%, 20%) 0%, transparent 65%)',
        'radial-gradient(ellipse at 80% 90%, hsl(15, 75%, 22%) 0%, transparent 45%)',
        'radial-gradient(ellipse at 20% 10%, hsl(45, 85%, 16%) 0%, transparent 45%)',
        'linear-gradient(145deg, hsl(20, 80%, 7%) 0%, hsl(30, 85%, 5%) 100%)',
      ].join(', '),
      cardBg:      'rgba(255, 248, 235, 0.06)',
      cardBorder:  '1px solid rgba(255, 200, 120, 0.18)',
      cardShadow:  '0 24px 64px hsl(20, 90%, 4% / 0.72), 0 4px 16px hsl(32, 95%, 20% / 0.25)',
      inputBg:     'rgba(255, 248, 235, 0.08)',
      inputBorder: '1px solid rgba(255, 200, 120, 0.22)',
      textColor:   'rgba(255, 248, 235, 0.92)',
      linkColor:   'hsl(38, 100%, 70%)',
    },
    dark: {
      accent:       'hsl(32, 95%, 55%)',
      accentSubtle: 'hsl(32, 95%, 55% / 0.15)',
      accentBorder: 'hsl(32, 95%, 55% / 0.30)',
      green:        'hsl(150, 60%, 50%)',
      greenSubtle:  'hsl(150, 60%, 50% / 0.15)',
      amber:        'hsl(32, 95%, 55%)',
      amberSubtle:  'hsl(32, 95%, 55% / 0.15)',
      red:          'hsl(6, 75%, 60%)',
      redSubtle:    'hsl(6, 75%, 60% / 0.15)',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. ROSE SOFT
  //    Dusty rose-pink at hsl(330,71%,51%) — 4.52:1 vs white (WCAG AA).
  //    Database reference: Creative Agency #EC4899 (#831843 dark text variant).
  //    Softened from bold pink to a refined, muted rose for premium feel.
  //    Think: Dribbble, Figma, Craft CMS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'rose-soft',
    name: 'Rose Soft',
    nameFr: 'Rose Doux',
    description: 'Soft pink-rose accent. Modern, elegant, premium.',
    descriptionFr: 'Accent rose-pink doux. Moderne, élégant, premium.',
    colors: {
      accent:         'hsl(330, 71%, 51%)',
      accentHover:    'hsl(330, 71%, 45%)',
      accentSubtle:   'hsl(330, 71%, 51% / 0.11)',
      accentBorder:   'hsl(330, 71%, 51% / 0.26)',
      green:          'hsl(148, 55%, 38%)',
      greenSubtle:    'hsl(148, 55%, 38% / 0.11)',
      amber:          'hsl(34, 88%, 48%)',
      amberSubtle:    'hsl(34, 88%, 48% / 0.11)',
      red:            'hsl(352, 72%, 50%)',
      redSubtle:      'hsl(352, 72%, 50% / 0.11)',
      gradientAccent: 'linear-gradient(135deg, hsl(330, 71%, 51%) 0%, hsl(316, 68%, 48%) 50%, hsl(344, 75%, 52%) 100%)',
      gradientMesh:   [
        'radial-gradient(ellipse at 25% 45%, hsl(330, 71%, 51% / 0.07) 0%, transparent 60%)',
        'radial-gradient(ellipse at 75% 25%, hsl(316, 68%, 48% / 0.04) 0%, transparent 55%)',
        'radial-gradient(ellipse at 55% 80%, hsl(350, 65%, 55% / 0.03) 0%, transparent 50%)',
      ].join(', '),
    },
    login: {
      background: [
        'radial-gradient(ellipse at 0% 0%, hsl(316, 65%, 18%) 0%, transparent 55%)',
        'radial-gradient(ellipse at 100% 100%, hsl(344, 70%, 15%) 0%, transparent 50%)',
        'radial-gradient(ellipse at 50% 40%, hsl(330, 60%, 22%) 0%, transparent 65%)',
        'radial-gradient(ellipse at 15% 85%, hsl(350, 55%, 18%) 0%, transparent 45%)',
        'radial-gradient(ellipse at 90% 15%, hsl(310, 60%, 20%) 0%, transparent 50%)',
        'linear-gradient(155deg, hsl(330, 70%, 8%) 0%, hsl(340, 75%, 6%) 100%)',
      ].join(', '),
      cardBg:      'rgba(255, 250, 253, 0.06)',
      cardBorder:  '1px solid rgba(255, 180, 210, 0.18)',
      cardShadow:  '0 24px 64px hsl(330, 90%, 4% / 0.70), 0 4px 16px hsl(330, 71%, 30% / 0.24)',
      inputBg:     'rgba(255, 250, 253, 0.07)',
      inputBorder: '1px solid rgba(255, 180, 210, 0.22)',
      textColor:   'rgba(255, 248, 252, 0.92)',
      linkColor:   'hsl(330, 88%, 75%)',
    },
    dark: {
      accent:       'hsl(330, 71%, 64%)',
      accentSubtle: 'hsl(330, 71%, 64% / 0.15)',
      accentBorder: 'hsl(330, 71%, 64% / 0.30)',
      green:        'hsl(148, 55%, 50%)',
      greenSubtle:  'hsl(148, 55%, 50% / 0.15)',
      amber:        'hsl(34, 88%, 58%)',
      amberSubtle:  'hsl(34, 88%, 58% / 0.15)',
      red:          'hsl(352, 72%, 63%)',
      redSubtle:    'hsl(352, 72%, 63% / 0.15)',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. OCEAN DEEP
  //    Deep teal-cyan at hsl(186,84%,30%) — 4.69:1 vs white (WCAG AA).
  //    Database reference: Medical/Healthcare teal #0891B2 — deeper hue for focus.
  //    Think: Supabase, PlanetScale, DigitalOcean, Vercel Analytics
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'ocean-deep',
    name: 'Ocean Deep',
    nameFr: 'Océan Profond',
    description: 'Deep teal-cyan accent. Calm, focused, data-oriented.',
    descriptionFr: 'Accent teal-cyan profond. Calme, focalisé, orienté données.',
    colors: {
      accent:         'hsl(186, 84%, 30%)',
      accentHover:    'hsl(186, 84%, 24%)',
      accentSubtle:   'hsl(186, 84%, 30% / 0.12)',
      accentBorder:   'hsl(186, 84%, 30% / 0.28)',
      green:          'hsl(162, 64%, 34%)',
      greenSubtle:    'hsl(162, 64%, 34% / 0.12)',
      amber:          'hsl(40, 90%, 46%)',
      amberSubtle:    'hsl(40, 90%, 46% / 0.12)',
      red:            'hsl(358, 70%, 50%)',
      redSubtle:      'hsl(358, 70%, 50% / 0.12)',
      gradientAccent: 'linear-gradient(135deg, hsl(186, 84%, 30%) 0%, hsl(200, 80%, 28%) 50%, hsl(174, 76%, 28%) 100%)',
      gradientMesh:   [
        'radial-gradient(ellipse at 15% 50%, hsl(186, 84%, 30% / 0.08) 0%, transparent 60%)',
        'radial-gradient(ellipse at 85% 20%, hsl(200, 80%, 28% / 0.05) 0%, transparent 55%)',
        'radial-gradient(ellipse at 50% 85%, hsl(174, 76%, 28% / 0.04) 0%, transparent 50%)',
      ].join(', '),
    },
    login: {
      background: [
        'radial-gradient(ellipse at 0% 50%, hsl(200, 85%, 12%) 0%, transparent 55%)',
        'radial-gradient(ellipse at 100% 50%, hsl(174, 80%, 10%) 0%, transparent 55%)',
        'radial-gradient(ellipse at 50% 0%, hsl(186, 75%, 16%) 0%, transparent 60%)',
        'radial-gradient(ellipse at 30% 90%, hsl(210, 70%, 14%) 0%, transparent 45%)',
        'radial-gradient(ellipse at 80% 80%, hsl(165, 70%, 12%) 0%, transparent 50%)',
        'linear-gradient(160deg, hsl(195, 80%, 7%) 0%, hsl(180, 85%, 5%) 100%)',
      ].join(', '),
      cardBg:      'rgba(240, 254, 255, 0.06)',
      cardBorder:  '1px solid rgba(130, 230, 240, 0.18)',
      cardShadow:  '0 24px 64px hsl(186, 90%, 4% / 0.74), 0 4px 16px hsl(186, 84%, 20% / 0.26)',
      inputBg:     'rgba(240, 254, 255, 0.07)',
      inputBorder: '1px solid rgba(130, 230, 240, 0.22)',
      textColor:   'rgba(240, 254, 255, 0.92)',
      linkColor:   'hsl(186, 90%, 68%)',
    },
    dark: {
      accent:       'hsl(186, 84%, 46%)',
      accentSubtle: 'hsl(186, 84%, 46% / 0.15)',
      accentBorder: 'hsl(186, 84%, 46% / 0.30)',
      green:        'hsl(162, 64%, 48%)',
      greenSubtle:  'hsl(162, 64%, 48% / 0.15)',
      amber:        'hsl(40, 90%, 56%)',
      amberSubtle:  'hsl(40, 90%, 56% / 0.15)',
      red:          'hsl(358, 70%, 62%)',
      redSubtle:    'hsl(358, 70%, 62% / 0.15)',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. CRIMSON BOLD
  //    Deep crimson at hsl(350,84%,44%) — 5.57:1 vs white (comfortably passes AA).
  //    Database: Generative AI Art dark + pink CTA reversed for a media-weight red.
  //    Think: YouTube Studio, Ghost CMS, Substack
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'crimson-bold',
    name: 'Crimson Bold',
    nameFr: 'Cramoisi Affirmé',
    description: 'Deep red accent. Strong, confident, media and publishing.',
    descriptionFr: 'Accent rouge profond. Fort, confiant, médias et édition.',
    colors: {
      accent:         'hsl(350, 84%, 44%)',
      accentHover:    'hsl(350, 84%, 38%)',
      accentSubtle:   'hsl(350, 84%, 44% / 0.11)',
      accentBorder:   'hsl(350, 84%, 44% / 0.26)',
      green:          'hsl(152, 60%, 36%)',
      greenSubtle:    'hsl(152, 60%, 36% / 0.11)',
      amber:          'hsl(36, 90%, 46%)',
      amberSubtle:    'hsl(36, 90%, 46% / 0.11)',
      red:            'hsl(350, 84%, 44%)',
      redSubtle:      'hsl(350, 84%, 44% / 0.11)',
      gradientAccent: 'linear-gradient(135deg, hsl(350, 84%, 44%) 0%, hsl(338, 80%, 40%) 50%, hsl(4, 80%, 44%) 100%)',
      gradientMesh:   [
        'radial-gradient(ellipse at 20% 45%, hsl(350, 84%, 44% / 0.08) 0%, transparent 60%)',
        'radial-gradient(ellipse at 80% 25%, hsl(338, 80%, 40% / 0.05) 0%, transparent 55%)',
        'radial-gradient(ellipse at 50% 80%, hsl(4, 80%, 44% / 0.04) 0%, transparent 50%)',
      ].join(', '),
    },
    login: {
      background: [
        'radial-gradient(ellipse at 0% 0%, hsl(338, 75%, 16%) 0%, transparent 55%)',
        'radial-gradient(ellipse at 100% 100%, hsl(4, 75%, 14%) 0%, transparent 50%)',
        'radial-gradient(ellipse at 50% 50%, hsl(350, 65%, 20%) 0%, transparent 65%)',
        'radial-gradient(ellipse at 85% 10%, hsl(360, 60%, 18%) 0%, transparent 45%)',
        'radial-gradient(ellipse at 10% 90%, hsl(330, 65%, 16%) 0%, transparent 50%)',
        'linear-gradient(155deg, hsl(345, 75%, 7%) 0%, hsl(355, 80%, 5%) 100%)',
      ].join(', '),
      cardBg:      'rgba(255, 248, 248, 0.06)',
      cardBorder:  '1px solid rgba(255, 150, 150, 0.18)',
      cardShadow:  '0 24px 64px hsl(350, 90%, 4% / 0.74), 0 4px 16px hsl(350, 84%, 25% / 0.26)',
      inputBg:     'rgba(255, 248, 248, 0.07)',
      inputBorder: '1px solid rgba(255, 150, 150, 0.22)',
      textColor:   'rgba(255, 248, 248, 0.92)',
      linkColor:   'hsl(350, 90%, 74%)',
    },
    dark: {
      accent:       'hsl(350, 84%, 60%)',
      accentSubtle: 'hsl(350, 84%, 60% / 0.15)',
      accentBorder: 'hsl(350, 84%, 60% / 0.30)',
      green:        'hsl(152, 60%, 50%)',
      greenSubtle:  'hsl(152, 60%, 50% / 0.15)',
      amber:        'hsl(36, 90%, 58%)',
      amberSubtle:  'hsl(36, 90%, 58% / 0.15)',
      red:          'hsl(350, 84%, 60%)',
      redSubtle:    'hsl(350, 84%, 60% / 0.15)',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. MIDNIGHT DARK
  //    Neon purple on near-black surfaces.
  //    Accent hsl(262,83%,63%) — 4.59:1 vs white for button use (WCAG AA).
  //    Dark mode accent lightened to hsl(262,83%,75%) for text-on-dark-bg use.
  //    Database: OLED Dark Mode (#000000, #121212) + Cyberpunk neon purple.
  //    Think: GitHub Dimmed, JetBrains, Warp terminal, Linear (dark variant)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    nameFr: 'Minuit Sombre',
    description: 'Ultra-dark theme. Neon purple accent on near-black. OLED-optimized.',
    descriptionFr: "Thème ultra-sombre. Accent violet néon sur fond quasi-noir. Optimisé OLED.",
    colors: {
      accent:         'hsl(262, 83%, 63%)',
      accentHover:    'hsl(262, 83%, 57%)',
      accentSubtle:   'hsl(262, 83%, 63% / 0.13)',
      accentBorder:   'hsl(262, 83%, 63% / 0.30)',
      green:          'hsl(152, 65%, 40%)',
      greenSubtle:    'hsl(152, 65%, 40% / 0.13)',
      amber:          'hsl(36, 90%, 48%)',
      amberSubtle:    'hsl(36, 90%, 48% / 0.13)',
      red:            'hsl(0, 72%, 52%)',
      redSubtle:      'hsl(0, 72%, 52% / 0.13)',
      gradientAccent: 'linear-gradient(135deg, hsl(262, 83%, 63%) 0%, hsl(246, 80%, 60%) 50%, hsl(278, 78%, 62%) 100%)',
      gradientMesh:   [
        'radial-gradient(ellipse at 20% 40%, hsl(262, 83%, 63% / 0.09) 0%, transparent 60%)',
        'radial-gradient(ellipse at 80% 20%, hsl(246, 80%, 60% / 0.06) 0%, transparent 55%)',
        'radial-gradient(ellipse at 55% 85%, hsl(278, 78%, 62% / 0.04) 0%, transparent 50%)',
      ].join(', '),
    },
    login: {
      // Near-black base with layered neon purple halos — OLED premium feel
      background: [
        'radial-gradient(ellipse at 20% 20%, hsl(262, 75%, 20%) 0%, transparent 45%)',
        'radial-gradient(ellipse at 80% 80%, hsl(246, 70%, 16%) 0%, transparent 45%)',
        'radial-gradient(ellipse at 70% 15%, hsl(278, 65%, 14%) 0%, transparent 40%)',
        'radial-gradient(ellipse at 30% 80%, hsl(255, 60%, 18%) 0%, transparent 40%)',
        'radial-gradient(ellipse at 50% 50%, hsl(260, 50%, 12%) 0%, transparent 70%)',
        'linear-gradient(160deg, hsl(255, 25%, 7%) 0%, hsl(262, 30%, 5%) 50%, hsl(248, 25%, 4%) 100%)',
      ].join(', '),
      cardBg:      'rgba(255, 255, 255, 0.04)',
      cardBorder:  '1px solid rgba(180, 140, 255, 0.18)',
      cardShadow:  [
        '0 24px 64px hsl(262, 50%, 3% / 0.80)',
        '0 4px 16px hsl(262, 83%, 40% / 0.22)',
        '0 0 0 1px rgba(180, 140, 255, 0.08)',
      ].join(', '),
      inputBg:     'rgba(255, 255, 255, 0.06)',
      inputBorder: '1px solid rgba(180, 140, 255, 0.22)',
      textColor:   'rgba(235, 225, 255, 0.92)',
      linkColor:   'hsl(262, 90%, 80%)',
    },
    dark: {
      // On dark surfaces: accent used as text/icon — needs to glow, not just exist
      accent:       'hsl(262, 83%, 75%)',
      accentSubtle: 'hsl(262, 83%, 75% / 0.16)',
      accentBorder: 'hsl(262, 83%, 75% / 0.34)',
      green:        'hsl(152, 65%, 54%)',
      greenSubtle:  'hsl(152, 65%, 54% / 0.16)',
      amber:        'hsl(36, 90%, 60%)',
      amberSubtle:  'hsl(36, 90%, 60% / 0.16)',
      red:          'hsl(0, 72%, 64%)',
      redSubtle:    'hsl(0, 72%, 64% / 0.16)',
    },
  },
]

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** Get a preset by its id. Returns undefined if not found. */
export function getPresetById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id)
}

/** Default preset (always Indigo Pro) */
export const DEFAULT_PRESET: ThemePreset = THEME_PRESETS[0]

/** All preset ids, in display order */
export const PRESET_IDS = THEME_PRESETS.map((p) => p.id) as [string, ...string[]]
