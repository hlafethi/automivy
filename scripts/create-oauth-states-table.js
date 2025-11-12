import { Pool } from 'pg';
import config from '../backend/config.js';

const pool = new Pool(config.database);

async function createOAuthStatesTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS oauth_states (
        state text PRIMARY KEY,
        user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        provider text NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT now()
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at)
    `);
    
    console.log('✅ Table oauth_states créée avec succès');
  } catch (error) {
    console.error('❌ Erreur création table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createOAuthStatesTable()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Script échoué:', error);
    process.exit(1);
  });

