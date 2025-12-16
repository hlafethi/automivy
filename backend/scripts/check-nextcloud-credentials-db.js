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
    console.log('🔍 Vérification des credentials Nextcloud dans la DB...\n');
    
    // 1. Récupérer les workflows Nextcloud
    const wfResult = await pool.query(`
      SELECT id, name, user_id 
      FROM user_workflows 
      WHERE name ILIKE '%nextcloud%'
      ORDER BY created_at DESC
    `);
    
    console.log('📋 Workflows Nextcloud:');
    for (const wf of wfResult.rows) {
      console.log(`\n   ${wf.name}`);
      console.log(`   ID: ${wf.id}`);
      
      // Récupérer les credentials pour ce workflow
      const credResult = await pool.query(`
        SELECT * FROM nextcloud_credentials 
        WHERE user_workflow_id = $1
      `, [wf.id]);
      
      if (credResult.rows.length > 0) {
        const cred = credResult.rows[0];
        console.log(`   ✅ Credentials trouvés:`);
        console.log(`      URL: ${cred.nextcloud_url}`);
        console.log(`      Username: ${cred.nextcloud_username}`);
        console.log(`      Password: ${cred.nextcloud_password ? '***' + cred.nextcloud_password.slice(-4) : 'VIDE'}`);
      } else {
        console.log(`   ❌ Pas de credentials trouvés!`);
      }
    }
    
    // 2. Vérifier toutes les entrées de nextcloud_credentials
    console.log('\n\n📦 Toutes les entrées nextcloud_credentials:');
    const allCreds = await pool.query('SELECT * FROM nextcloud_credentials');
    console.log(`   Total: ${allCreds.rows.length} entrée(s)`);
    
    allCreds.rows.forEach((cred, i) => {
      console.log(`\n   ${i + 1}. workflow_id: ${cred.user_workflow_id}`);
      console.log(`      URL: ${cred.nextcloud_url}`);
      console.log(`      Username: ${cred.nextcloud_username}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
})();

