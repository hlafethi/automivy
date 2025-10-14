const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl
});

async function fixTemplatesUser() {
  try {
    console.log('🔧 Correction des templates sans utilisateur...');
    
    // Récupérer l'ID de l'admin
    const adminResult = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    
    if (adminResult.rows.length === 0) {
      console.log('❌ Aucun utilisateur admin trouvé');
      return;
    }
    
    const adminId = adminResult.rows[0].id;
    console.log('👤 Admin trouvé:', adminId);
    
    // Mettre à jour les templates sans created_by
    const updateResult = await pool.query(
      'UPDATE templates SET created_by = $1 WHERE created_by IS NULL',
      [adminId]
    );
    
    console.log('✅ Templates mis à jour:', updateResult.rowCount);
    
    // Vérifier le résultat
    const checkResult = await pool.query('SELECT id, name, created_by FROM templates ORDER BY created_at DESC LIMIT 5');
    console.log('\n📋 Templates après correction:');
    checkResult.rows.forEach((template, index) => {
      console.log(`   ${index + 1}. ${template.name} (User: ${template.created_by})`);
    });
    
    console.log('\n🎉 Correction terminée !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Détails:', error);
  } finally {
    await pool.end();
  }
}

fixTemplatesUser();
