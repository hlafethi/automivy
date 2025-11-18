-- Script pour corriger les problèmes de RLS sur landing_sections
-- et s'assurer que la table est accessible publiquement pour la lecture

-- Désactiver RLS sur landing_sections (table publique pour la landing page)
ALTER TABLE IF EXISTS landing_sections DISABLE ROW LEVEL SECURITY;

-- Si RLS doit être activé, créer des politiques permissives
-- ALTER TABLE landing_sections ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique (GET)
-- CREATE POLICY landing_sections_select_policy ON landing_sections
--   FOR SELECT
--   USING (true);

-- Politique pour permettre l'écriture aux admins uniquement (PUT/DELETE)
-- CREATE POLICY landing_sections_admin_policy ON landing_sections
--   FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM users 
--       WHERE users.id::text = current_setting('app.current_user_id', true)
--       AND users.role = 'admin'
--     )
--   );

-- Vérifier que la table existe et est accessible
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'landing_sections';

