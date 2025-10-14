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

async function checkApiKeysDB() {
  try {
    console.log('🔍 Vérification des clés API en base de données...');
    
    // Vérifier la structure de la table admin_api_keys
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'admin_api_keys' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 Structure de la table admin_api_keys:');
    structureResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Vérifier les données existantes
    const dataResult = await pool.query('SELECT * FROM admin_api_keys ORDER BY created_at DESC LIMIT 10');
    console.log('\n📋 Clés API existantes:');
    console.log('Nombre de clés API:', dataResult.rows.length);
    
    if (dataResult.rows.length > 0) {
      dataResult.rows.forEach((key, index) => {
        console.log(`   ${index + 1}. ${key.name} (ID: ${key.id})`);
        console.log(`      - Service: ${key.service}`);
        console.log(`      - User ID: ${key.user_id}`);
        console.log(`      - Active: ${key.is_active}`);
        console.log(`      - Created: ${key.created_at}`);
      });
    } else {
      console.log('   Aucune clé API trouvée');
    }
    
    // Vérifier les utilisateurs
    const usersResult = await pool.query('SELECT id, email, role FROM users ORDER BY created_at DESC');
    console.log('\n👥 Utilisateurs existants:');
    usersResult.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (ID: ${user.id}, Role: ${user.role})`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Détails:', error);
  } finally {
    await pool.end();
  }
}

checkApiKeysDB();
