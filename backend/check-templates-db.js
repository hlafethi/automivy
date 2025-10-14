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

async function checkTemplatesDB() {
  try {
    console.log('🔍 Vérification des templates en base de données...');
    
    // Vérifier la structure de la table templates
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'templates' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 Structure de la table templates:');
    structureResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Vérifier les données existantes
    const dataResult = await pool.query('SELECT * FROM templates ORDER BY created_at DESC LIMIT 10');
    console.log('\n📋 Templates existants:');
    console.log('Nombre de templates:', dataResult.rows.length);
    
    if (dataResult.rows.length > 0) {
      dataResult.rows.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name} (ID: ${template.id})`);
        console.log(`      - User ID: ${template.user_id}`);
        console.log(`      - Visible: ${template.visible}`);
        console.log(`      - Created: ${template.created_at}`);
      });
    } else {
      console.log('   Aucun template trouvé');
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

checkTemplatesDB();
