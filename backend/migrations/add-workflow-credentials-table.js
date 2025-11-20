// Migration pour créer la table workflow_credentials
// Cette table stocke les credential IDs associés à chaque workflow utilisateur
// pour permettre leur suppression même si le workflow n'existe plus dans n8n

const { Pool } = require('pg');
const config = require('../config');

async function runMigration() {
  const pool = new Pool(config.database);
  
  try {
    console.log('🔧 [Migration] Création de la table workflow_credentials...');
    
    // Créer la table workflow_credentials
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflow_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_workflow_id UUID NOT NULL REFERENCES user_workflows(id) ON DELETE CASCADE,
        credential_id TEXT NOT NULL,
        credential_name TEXT,
        credential_type TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_workflow_id, credential_id)
      );
    `);
    
    console.log('✅ [Migration] Table workflow_credentials créée');
    
    // Créer un index pour améliorer les performances
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_credentials_user_workflow_id 
      ON workflow_credentials(user_workflow_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_credentials_credential_id 
      ON workflow_credentials(credential_id);
    `);
    
    console.log('✅ [Migration] Index créés');
    
    console.log('✅ [Migration] Migration terminée avec succès');
    
  } catch (error) {
    console.error('❌ [Migration] Erreur:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Exécuter la migration si le script est appelé directement
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✅ Migration complétée');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur migration:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };

