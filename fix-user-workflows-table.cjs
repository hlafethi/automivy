const db = require('./backend/database');

async function fixUserWorkflowsTable() {
  try {
    console.log('🔧 Modification de la table user_workflows...');
    
    // Modifier la colonne n8n_credential_id pour accepter NULL
    await db.query('ALTER TABLE user_workflows ALTER COLUMN n8n_credential_id DROP NOT NULL');
    console.log('✅ Colonne n8n_credential_id modifiée pour accepter NULL');
    
    // Vérifier la structure de la table
    const result = await db.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_workflows' 
      AND column_name = 'n8n_credential_id'
    `);
    
    console.log('📋 Structure de la colonne n8n_credential_id:');
    console.log(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.end();
  }
}

fixUserWorkflowsTable();
