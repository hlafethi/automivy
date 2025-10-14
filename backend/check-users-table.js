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

async function checkUsersTable() {
  try {
    console.log('🔍 Vérification de la structure de la table users...');
    
    // Vérifier la structure de la table
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 Structure de la table users:');
    structureResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Vérifier les données existantes
    const dataResult = await pool.query('SELECT * FROM users LIMIT 5');
    console.log('\n📋 Données existantes:');
    console.log('Nombre d\'utilisateurs:', dataResult.rows.length);
    if (dataResult.rows.length > 0) {
      console.log('Premier utilisateur:', dataResult.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Détails:', error);
  } finally {
    await pool.end();
  }
}

checkUsersTable();
