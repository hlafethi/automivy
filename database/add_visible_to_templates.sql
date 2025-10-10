-- Ajouter le champ 'visible' à la table templates
ALTER TABLE templates ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT true;

-- Mettre à jour tous les templates existants pour qu'ils soient visibles par défaut
UPDATE templates SET visible = true WHERE visible IS NULL;

-- Ajouter un commentaire pour expliquer le champ
COMMENT ON COLUMN templates.visible IS 'Whether this template is visible in the user catalog';
