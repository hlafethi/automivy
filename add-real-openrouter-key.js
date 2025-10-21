/**
 * Script pour ajouter une vraie clé OpenRouter de test
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

async function addRealOpenRouterKey() {
  try {
    console.log('🔧 Ajout d\'une vraie clé OpenRouter...');
    
    // Récupérer l'ID de l'admin
    const adminResult = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    
    if (adminResult.rows.length === 0) {
      console.log('❌ Aucun utilisateur admin trouvé');
      return;
    }
    
    const adminId = adminResult.rows[0].id;
    console.log('👤 Admin trouvé:', adminId);
    
    // Supprimer les clés d'exemple existantes
    await pool.query('DELETE FROM admin_api_keys WHERE api_key LIKE $1', ['sk-or-v1-1234567890%']);
    console.log('🗑️ Clés d\'exemple supprimées');
    
    // Ajouter une vraie clé OpenRouter
    const realOpenRouterKey = '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';
    const insertResult = await pool.query(
      'INSERT INTO admin_api_keys (service_name, api_key, description, is_active, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      ['OpenRouter Admin', realOpenRouterKey, 'Clé OpenRouter réelle pour l\'administration', true, adminId]
    );
    
    console.log('✅ Clé API OpenRouter réelle ajoutée:', insertResult.rows[0].id);
    console.log('🔑 Clé API:', insertResult.rows[0].api_key.substring(0, 10) + '...');
    console.log('⚠️ REMPLACE sk-or-v1-REMPLACE_PAR_TA_VRAIE_CLE_OPENROUTER par ta vraie clé OpenRouter !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de la clé OpenRouter:', error);
  } finally {
    await pool.end();
  }
}

addRealOpenRouterKey();
