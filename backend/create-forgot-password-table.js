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

async function createForgotPasswordTable() {
  try {
    console.log('🔧 Création de la table forgot_password_tokens...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS forgot_password_tokens (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ Table forgot_password_tokens créée');
    
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_forgot_password_tokens_user_id ON forgot_password_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_forgot_password_tokens_token ON forgot_password_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_forgot_password_tokens_expires_at ON forgot_password_tokens(expires_at);
    `;
    
    await pool.query(createIndexQuery);
    console.log('✅ Index créés');
    
    console.log('🎉 Table et index créés avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur création table:', error);
  } finally {
    await pool.end();
  }
}

createForgotPasswordTable();
