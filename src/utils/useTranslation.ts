'use client'

/**
 * Lightweight i18n for client components.
 * Translations are inlined to avoid cross-bundle import issues.
 * Detects language from <html lang="...">.
 */

const EN: Record<string, string> = {
  dashboard: 'Dashboard',
  customize: 'Customize',
  done: 'Done',
  reset: 'Reset',
  addWidget: 'Add a widget',
  emptyDashboard: 'Your dashboard is empty',
  greetingMorning: 'Good morning',
  greetingAfternoon: 'Good afternoon',
  greetingEvening: 'Good evening',
  collections: 'Collections',
  quickActions: 'Quick Actions',
  recentActivity: 'Recent Activity',
  posts: 'Posts',
  loading: 'Loading...',
  noDocuments: 'No documents',
  noRecentActivity: 'No recent activity',
  viewAll: 'View all',
  newItem: 'New {{label}}',
  uploadMedia: 'Upload Media',
  activityNew: 'new',
  activityEdit: 'edit',
  noActivityYet: 'No activity recorded yet',
  justNow: 'just now',
  searchPlaceholder: 'Search collections, docs, actions...',
  noResults: 'No results for "{{query}}"',
  navigate: 'Navigate',
  open: 'Open',
  close: 'Close',
  categoryCollections: 'Collections',
  categoryCreate: 'Create',
  categoryGlobals: 'Globals',
  categoryPages: 'Pages',
  categoryActions: 'Actions',
  categoryRecent: 'Recent',
  account: 'Account',
  documentsCount: '{{count}} document(s)',
  noDocumentsFound: 'No documents found',
  prev: 'Prev',
  next: 'Next',
  noMedia: 'No media found',
  noItems: 'No items',
  published: 'published',
  draft: 'draft',
}

const FR: Record<string, string> = {
  dashboard: 'Tableau de bord',
  customize: 'Personnaliser',
  done: 'Termine',
  reset: 'Reinitialiser',
  addWidget: 'Ajouter un widget',
  emptyDashboard: 'Votre tableau de bord est vide',
  greetingMorning: 'Bonjour',
  greetingAfternoon: 'Bon apres-midi',
  greetingEvening: 'Bonsoir',
  collections: 'Collections',
  quickActions: 'Actions rapides',
  recentActivity: 'Activite recente',
  posts: 'Articles',
  loading: 'Chargement...',
  noDocuments: 'Aucun document',
  noRecentActivity: 'Aucune activite recente',
  viewAll: 'Voir tout',
  newItem: 'Nouveau {{label}}',
  uploadMedia: 'Ajouter un media',
  activityNew: 'nouveau',
  activityEdit: 'modifie',
  noActivityYet: 'Aucune activite enregistree',
  justNow: 'a l\'instant',
  searchPlaceholder: 'Rechercher collections, documents, actions...',
  noResults: 'Aucun resultat pour "{{query}}"',
  navigate: 'Naviguer',
  open: 'Ouvrir',
  close: 'Fermer',
  categoryCollections: 'Collections',
  categoryCreate: 'Creer',
  categoryGlobals: 'Globales',
  categoryPages: 'Pages',
  categoryActions: 'Actions',
  categoryRecent: 'Recents',
  account: 'Compte',
  documentsCount: '{{count}} document(s)',
  noDocumentsFound: 'Aucun document trouve',
  prev: 'Precedent',
  next: 'Suivant',
  noMedia: 'Aucun media trouve',
  noItems: 'Aucun element',
  published: 'publie',
  draft: 'brouillon',
}

const TRANSLATIONS: Record<string, Record<string, string>> = { en: EN, fr: FR }

let _lang: string | null = null

function detectLang(): string {
  if (typeof document === 'undefined') return 'en'
  const lang = document.documentElement.lang?.toLowerCase() || 'en'
  return lang.startsWith('fr') ? 'fr' : 'en'
}

export function useAupT(): (key: string, vars?: Record<string, string | number>) => string {
  if (!_lang) _lang = detectLang()
  const strings = TRANSLATIONS[_lang] || EN

  return (key: string, vars?: Record<string, string | number>) => {
    let value = strings[key] || EN[key] || key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(`{{${k}}}`, String(v))
      }
    }
    return value
  }
}
