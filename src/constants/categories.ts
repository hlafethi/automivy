// Structure hiérarchique des catégories et sous-catégories métier

export interface CategoryStructure {
  category: string;
  subcategories: string[];
}

export const CATEGORIES: CategoryStructure[] = [
  {
    category: 'Gestion quotidienne',
    subcategories: [
      'Gestion de tâches',
      'Planification',
      'Suivi de projets',
      'Organisation personnelle',
      'Automatisation administrative',
      'Gestion documentaire'
    ]
  },
  {
    category: 'Marketing / Ventes',
    subcategories: [
      'Email marketing',
      'Génération de leads',
      'Suivi commercial',
      'Analyse de performance',
      'Gestion CRM',
      'Campagnes publicitaires',
      'Réseaux sociaux',
      'Content marketing'
    ]
  },
  {
    category: 'Support / Service client',
    subcategories: [
      'Gestion des tickets',
      'Réponses automatiques',
      'Suivi client',
      'FAQ et documentation',
      'Feedback et avis',
      'Onboarding client',
      'Support technique'
    ]
  },
  {
    category: 'Comptabilité / Finance',
    subcategories: [
      'Facturation',
      'Gestion des paiements',
      'Rapports financiers',
      'Suivi des dépenses',
      'Rapprochement bancaire',
      'Gestion de la paie',
      'Analyse budgétaire'
    ]
  },
  {
    category: 'RH',
    subcategories: [
      'Recrutement',
      'Gestion des candidatures',
      'Onboarding employés',
      'Évaluation de performance',
      'Gestion des congés',
      'Formation et développement',
      'Communication interne'
    ]
  },
  {
    category: 'Logistique / Production',
    subcategories: [
      'Gestion des stocks',
      'Suivi des commandes',
      'Planification de production',
      'Gestion des livraisons',
      'Maintenance préventive',
      'Qualité et contrôle',
      'Optimisation des processus'
    ]
  }
];

// Liste plate des catégories principales
export const MAIN_CATEGORIES = CATEGORIES.map(cat => cat.category);

// Fonction pour obtenir les sous-catégories d'une catégorie
export function getSubcategories(category: string): string[] {
  const categoryData = CATEGORIES.find(cat => cat.category === category);
  return categoryData?.subcategories || [];
}

// Fonction pour obtenir toutes les sous-catégories
export function getAllSubcategories(): string[] {
  return CATEGORIES.flatMap(cat => cat.subcategories);
}

