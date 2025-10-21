/**
 * Script pour vérifier la clé OpenRouter dans la base de données
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

async function checkOpenRouterKey() {
  try {
    console.log('🔍 Vérification de la clé OpenRouter...');
    
    // Vérifier toutes les clés API
    const allKeys = await pool.query('SELECT * FROM admin_api_keys ORDER BY created_at DESC');
    console.log('📊 Nombre total de clés API:', allKeys.rows.length);
    
    if (allKeys.rows.length > 0) {
      console.log('\n📋 Clés API existantes:');
      allKeys.rows.forEach((key, index) => {
        console.log(`   ${index + 1}. ${key.service_name} (ID: ${key.id})`);
        console.log(`      - Description: ${key.description}`);
        console.log(`      - Active: ${key.is_active}`);
        console.log(`      - Created: ${key.created_at}`);
        console.log(`      - API Key: ${key.api_key ? key.api_key.substring(0, 10) + '...' : 'NULL'}`);
        console.log('');
      });
    } else {
      console.log('❌ Aucune clé API trouvée');
    }
    
    // Vérifier spécifiquement OpenRouter
    const openrouterKeys = await pool.query('SELECT * FROM admin_api_keys WHERE service_name ILIKE $1', ['%openrouter%']);
    console.log('🔑 Clés OpenRouter trouvées:', openrouterKeys.rows.length);
    
    if (openrouterKeys.rows.length > 0) {
      openrouterKeys.rows.forEach((key, index) => {
        console.log(`   ${index + 1}. ${key.service_name}`);
        console.log(`      - Active: ${key.is_active}`);
        console.log(`      - API Key: ${key.api_key ? key.api_key.substring(0, 10) + '...' : 'NULL'}`);
      });
    } else {
      console.log('❌ Aucune clé OpenRouter trouvée');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  } finally {
    await pool.end();
  }
}

checkOpenRouterKey();
