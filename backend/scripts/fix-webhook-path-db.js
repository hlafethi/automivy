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

const NEW_WEBHOOK_PATH = 'ncsort';

(async () => {
  try {
    console.log('🔧 Mise à jour du webhook_path dans la base de données...');
    console.log('   Nouveau path:', NEW_WEBHOOK_PATH);
    
    // Mettre à jour tous les workflows Nextcloud
    const result = await pool.query(
      `UPDATE user_workflows 
       SET webhook_path = $1 
       WHERE name ILIKE '%nextcloud%' 
       RETURNING id, name, webhook_path`,
      [NEW_WEBHOOK_PATH]
    );
    
    console.log('\n✅ Workflows mis à jour:');
    result.rows.forEach(row => {
      console.log(`   - ${row.name} (${row.id})`);
      console.log(`     webhook_path: ${row.webhook_path}`);
    });
    
    console.log('\n📡 Nouvelle URL webhook:');
    console.log(`   https://n8n.globalsaas.eu/webhook/${NEW_WEBHOOK_PATH}`);
    
    console.log('\n🎉 Reteste maintenant le tri!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
})();

