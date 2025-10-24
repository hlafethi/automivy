// Test des sessions utilisateur
const { Pool } = require('pg');
const config = require('./backend/config');

const pool = new Pool(config.database);

async function testSessions() {
  try {
    console.log('🔍 Test des sessions utilisateur...');
    
    // 1. Vérifier la structure de la table
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Structure de la table user_sessions:');
    tableInfo.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // 2. Vérifier les données existantes
    const existingData = await pool.query('SELECT * FROM user_sessions LIMIT 5');
    console.log('\n📊 Sessions existantes:');
    if (existingData.rows.length > 0) {
      existingData.rows.forEach(session => {
        console.log(`  - ID: ${session.id}, User: ${session.user_id}, Active: ${session.is_active}, IP: ${session.ip_address}`);
      });
    } else {
      console.log('  Aucune session trouvée');
    }
    
    // 3. Créer une session de test
    const testUserId = 'e8c4030-7d0a-48ee-97d2-b74564b1efef';
    
    // Supprimer les sessions existantes pour ce test
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [testUserId]);
    
    // Insérer une session de test
    const insertResult = await pool.query(`
      INSERT INTO user_sessions (
        user_id, ip_address, user_agent, is_active, expires_at
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      testUserId, 
      '192.168.1.100', 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 
      true, 
      new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    ]);
    
    console.log('\n✅ Session de test créée:');
    console.log(JSON.stringify(insertResult.rows[0], null, 2));
    
    // 4. Tester la requête utilisée par l'API
    const apiResult = await pool.query(
      'SELECT id, ip_address, user_agent, is_active, expires_at, created_at, last_activity FROM user_sessions WHERE user_id = $1 ORDER BY created_at DESC',
      [testUserId]
    );
    
    console.log('\n🔍 Résultat de la requête API:');
    console.log(JSON.stringify(apiResult.rows, null, 2));
    
    console.log('\n✅ Test des sessions terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  } finally {
    await pool.end();
  }
}

testSessions();
