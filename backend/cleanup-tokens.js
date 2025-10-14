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

async function cleanupTokens() {
  try {
    console.log('🧹 Nettoyage des tokens de réinitialisation...');
    
    // Supprimer tous les tokens existants
    const result = await pool.query('DELETE FROM forgot_password_tokens');
    console.log(`✅ ${result.rowCount} tokens supprimés`);
    
    console.log('🎉 Base de données nettoyée !');
    
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
  } finally {
    await pool.end();
  }
}

cleanupTokens();
