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

async function fixApiKeys() {
  try {
    console.log('🔧 Correction des clés API...');
    
    // Récupérer l'ID de l'admin
    const adminResult = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    
    if (adminResult.rows.length === 0) {
      console.log('❌ Aucun utilisateur admin trouvé');
      return;
    }
    
    const adminId = adminResult.rows[0].id;
    console.log('👤 Admin trouvé:', adminId);
    
    // Vérifier les clés API avec des valeurs undefined
    const checkResult = await pool.query('SELECT * FROM admin_api_keys WHERE service_name IS NULL OR api_key IS NULL OR created_by IS NULL');
    console.log('🔍 Clés API à corriger:', checkResult.rows.length);
    
    if (checkResult.rows.length > 0) {
      // Supprimer les clés API corrompues
      const deleteResult = await pool.query('DELETE FROM admin_api_keys WHERE service_name IS NULL OR api_key IS NULL OR created_by IS NULL');
      console.log('🗑️ Clés API corrompues supprimées:', deleteResult.rowCount);
    }
    
    // Créer une clé API OpenRouter d'exemple
    const openrouterKey = 'sk-or-v1-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const insertResult = await pool.query(
      'INSERT INTO admin_api_keys (service_name, api_key, description, is_active, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      ['OpenRouter Admin', openrouterKey, 'Clé OpenRouter pour l\'administration', true, adminId]
    );
    
    console.log('✅ Clé API OpenRouter créée:', insertResult.rows[0].id);
    
    // Vérifier le résultat
    const finalResult = await pool.query('SELECT id, service_name, api_key, created_by FROM admin_api_keys ORDER BY created_at DESC');
    console.log('\n📋 Clés API après correction:');
    finalResult.rows.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key.service_name} (User: ${key.created_by})`);
      console.log(`      - ID: ${key.id}`);
      console.log(`      - Key: ${key.api_key.substring(0, 20)}...`);
    });
    
    console.log('\n🎉 Correction terminée !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Détails:', error);
  } finally {
    await pool.end();
  }
}

fixApiKeys();
