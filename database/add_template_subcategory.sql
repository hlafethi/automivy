-- Ajouter le champ subcategory (sous-catégorie) à la table templates
ALTER TABLE templates ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT NULL;

-- Ajouter un commentaire pour expliquer le champ
COMMENT ON COLUMN templates.subcategory IS 'Sous-catégorie métier du template, dépendante de la catégorie principale';

-- Créer un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_templates_subcategory ON templates(subcategory);

