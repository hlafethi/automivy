const db = require('./database');

async function fixUserWorkflowsTable() {
  try {
    console.log('🔧 Modification de la table user_workflows...');
    
    // Modifier la colonne n8n_credential_id pour accepter NULL
    await db.query('ALTER TABLE user_workflows ALTER COLUMN n8n_credential_id DROP NOT NULL');
    console.log('✅ Colonne n8n_credential_id modifiée pour accepter NULL');
    
    // Modifier également la colonne schedule pour accepter NULL
    await db.query('ALTER TABLE user_workflows ALTER COLUMN schedule DROP NOT NULL');
    console.log('✅ Colonne schedule modifiée pour accepter NULL');
    
    // Vérifier la structure de la table
    const result = await db.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_workflows' 
      ORDER BY column_name
    `);
    
    console.log('\n📋 Structure de la table user_workflows:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await db.end();
  }
}

fixUserWorkflowsTable();
