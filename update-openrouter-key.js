/**
 * Script pour mettre à jour la clé OpenRouter avec la vraie clé
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

async function updateOpenRouterKey() {
  try {
    console.log('🔧 Mise à jour de la clé OpenRouter...');
    
    // Vérifier les clés existantes
    const existingKeys = await pool.query('SELECT * FROM admin_api_keys ORDER BY created_at DESC');
    console.log('📊 Clés existantes:', existingKeys.rows.length);
    
    existingKeys.rows.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key.service_name} (ID: ${key.id})`);
      console.log(`      - Clé: ${key.api_key ? key.api_key.substring(0, 10) + '...' : 'NULL'}`);
      console.log(`      - Active: ${key.is_active}`);
    });
    
    // Mettre à jour la première clé avec la vraie clé OpenRouter
    if (existingKeys.rows.length > 0) {
      const realOpenRouterKey = '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';
      
      const updateResult = await pool.query(
        'UPDATE admin_api_keys SET api_key = $1, service_name = $2, description = $3 WHERE id = $4 RETURNING *',
        [realOpenRouterKey, 'OpenRouter Admin', 'Clé OpenRouter réelle pour l\'administration', existingKeys.rows[0].id]
      );
      
      console.log('✅ Clé OpenRouter mise à jour:', updateResult.rows[0].id);
      console.log('🔑 Nouvelle clé:', updateResult.rows[0].api_key.substring(0, 10) + '...');
      console.log('📝 Service:', updateResult.rows[0].service_name);
    } else {
      console.log('❌ Aucune clé API trouvée pour mise à jour');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
  } finally {
    await pool.end();
  }
}

updateOpenRouterKey();
