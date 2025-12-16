require('dotenv').config();
const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password
});

(async () => {
  try {
    console.log('🔍 Vérification des workflows Nextcloud dans la DB...\n');
    
    // Vérifier user_workflows
    const result = await pool.query(`
      SELECT 
        uw.id, 
        uw.name, 
        uw.n8n_workflow_id, 
        uw.webhook_path,
        uw.is_active,
        u.email
      FROM user_workflows uw
      JOIN users u ON uw.user_id = u.id
      WHERE uw.name ILIKE '%nextcloud%' OR uw.name ILIKE '%sort%' OR uw.name ILIKE '%tri%'
    `);
    
    console.log('📋 Workflows dans la DB:');
    result.rows.forEach(row => {
      console.log(`\n   Nom: ${row.name}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   n8n_workflow_id: ${row.n8n_workflow_id}`);
      console.log(`   webhook_path: ${row.webhook_path}`);
      console.log(`   is_active: ${row.is_active}`);
      console.log(`   user: ${row.email}`);
    });
    
    if (result.rows.length === 0) {
      console.log('   Aucun workflow trouvé!');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
})();

