-- Ajouter les champs de temps de paramétrage et d'exécution à la table templates
ALTER TABLE templates ADD COLUMN IF NOT EXISTS setup_time INTEGER DEFAULT NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS execution_time INTEGER DEFAULT NULL;

-- Ajouter des commentaires pour expliquer les champs
COMMENT ON COLUMN templates.setup_time IS 'Temps de paramétrage en minutes';
COMMENT ON COLUMN templates.execution_time IS 'Temps d''exécution en minutes';

