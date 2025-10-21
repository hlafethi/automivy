/**
 * Script pour ajouter une clé API OpenRouter
 */

const { Pool } = require('pg');
const config = require('./backend/config');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl
});

async function addOpenRouterKey() {
  try {
    console.log('🔧 Ajout de la clé API OpenRouter...');
    
    // Récupérer l'ID de l'admin
    const adminResult = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    
    if (adminResult.rows.length === 0) {
      console.log('❌ Aucun utilisateur admin trouvé');
      return;
    }
    
    const adminId = adminResult.rows[0].id;
    console.log('👤 Admin trouvé:', adminId);
    
    // Vérifier si une clé OpenRouter existe déjà
    const existingKey = await pool.query('SELECT * FROM admin_api_keys WHERE service_name = $1', ['OpenRouter Admin']);
    
    if (existingKey.rows.length > 0) {
      console.log('✅ Clé OpenRouter existe déjà:', existingKey.rows[0].id);
      console.log('🔑 Clé API:', existingKey.rows[0].api_key.substring(0, 10) + '...');
      return;
    }
    
    // Créer une clé API OpenRouter
    const openrouterKey = 'sk-or-v1-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const insertResult = await pool.query(
      'INSERT INTO admin_api_keys (service_name, api_key, description, is_active, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      ['OpenRouter Admin', openrouterKey, 'Clé OpenRouter pour l\'administration', true, adminId]
    );
    
    console.log('✅ Clé API OpenRouter créée:', insertResult.rows[0].id);
    console.log('🔑 Clé API:', insertResult.rows[0].api_key.substring(0, 10) + '...');
    
    // Vérifier le résultat
    const finalResult = await pool.query('SELECT * FROM admin_api_keys WHERE service_name = $1', ['OpenRouter Admin']);
    console.log('📊 Clé OpenRouter active:', finalResult.rows[0].is_active);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de la clé OpenRouter:', error);
  } finally {
    await pool.end();
  }
}

addOpenRouterKey();
