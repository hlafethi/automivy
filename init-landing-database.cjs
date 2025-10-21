const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration de la base de données
const pool = new Pool({
  host: '147.93.58.155',
  port: 5432,
  database: 'automivy',
  user: 'fethi',
  password: 'Fethi@2025!',
});

async function initLandingDatabase() {
  try {
    console.log('🚀 [Landing DB] Initialisation de la base de données pour la landing page...');
    
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, 'database', 'landing_content.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Exécuter le script SQL
    console.log('📝 [Landing DB] Exécution du script SQL...');
    await pool.query(sqlContent);
    
    console.log('✅ [Landing DB] Base de données initialisée avec succès !');
    console.log('📊 [Landing DB] Contenu par défaut de la landing page créé');
    
    // Vérifier le contenu
    const result = await pool.query('SELECT section, COUNT(*) as field_count FROM landing_content GROUP BY section ORDER BY section');
    console.log('📈 [Landing DB] Statistiques:');
    result.rows.forEach(row => {
      console.log(`   - ${row.section}: ${row.field_count} champs`);
    });
    
  } catch (error) {
    console.error('❌ [Landing DB] Erreur lors de l\'initialisation:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Exécuter le script
if (require.main === module) {
  initLandingDatabase()
    .then(() => {
      console.log('🎉 [Landing DB] Initialisation terminée avec succès !');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 [Landing DB] Échec de l\'initialisation:', error);
      process.exit(1);
    });
}

module.exports = { initLandingDatabase };
