-- Ajouter le champ category (métier) à la table templates
ALTER TABLE templates ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;

-- Ajouter un commentaire pour expliquer le champ
COMMENT ON COLUMN templates.category IS 'Catégorie métier du template (Gestion quotidienne, Marketing / Ventes, Support / Service client, Comptabilité / Finance, RH, Logistique / Production)';

-- Créer un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);

