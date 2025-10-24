// Test des préférences utilisateur
const { Pool } = require('pg');
const config = require('./backend/config');

const pool = new Pool(config.database);

async function testPreferences() {
  try {
    console.log('🔍 Test des préférences utilisateur...');
    
    // 1. Vérifier la structure de la table
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_preferences'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Structure de la table user_preferences:');
    tableInfo.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // 2. Vérifier les données existantes
    const existingData = await pool.query('SELECT * FROM user_preferences LIMIT 1');
    console.log('\n📊 Données existantes:');
    if (existingData.rows.length > 0) {
      console.log(JSON.stringify(existingData.rows[0], null, 2));
    } else {
      console.log('  Aucune donnée trouvée');
    }
    
    // 3. Tester l'insertion de préférences par défaut
    const testUserId = 'e8c4030-7d0a-48ee-97d2-b74564b1efef';
    
    // Supprimer les préférences existantes pour ce test
    await pool.query('DELETE FROM user_preferences WHERE user_id = $1', [testUserId]);
    
    // Insérer des préférences par défaut
    const insertResult = await pool.query(`
      INSERT INTO user_preferences (
        user_id, theme, email_notifications, app_notifications, 
        community_notifications, workflow_notifications, 
        email_frequency, privacy_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [testUserId, 'system', true, true, true, true, 'daily', 'public']);
    
    console.log('\n✅ Préférences par défaut créées:');
    console.log(JSON.stringify(insertResult.rows[0], null, 2));
    
    // 4. Tester la mise à jour
    const updateResult = await pool.query(`
      UPDATE user_preferences SET
        theme = $2,
        email_notifications = $3,
        app_notifications = $4,
        community_notifications = $5,
        workflow_notifications = $6,
        email_frequency = $7,
        privacy_level = $8,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `, [testUserId, 'dark', false, true, false, true, 'weekly', 'private']);
    
    console.log('\n🔄 Préférences mises à jour:');
    console.log(JSON.stringify(updateResult.rows[0], null, 2));
    
    console.log('\n✅ Test des préférences terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  } finally {
    await pool.end();
  }
}

testPreferences();
