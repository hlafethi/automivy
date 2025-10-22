-- Script pour ajouter les colonnes manquantes à la table tickets
-- Exécuter ce script dans votre base de données PostgreSQL

-- Ajouter les colonnes manquantes
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Vérifier la structure de la table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'tickets' 
ORDER BY ordinal_position;

-- Afficher un message de confirmation
SELECT 'Colonnes ajoutées avec succès' as status;
