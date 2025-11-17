const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool(config.database);

async function applyMigration() {
  try {
    console.log('🔄 Application de la migration pour ajouter setup_time et execution_time...');
    
    // Vérifier si les colonnes existent déjà
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'templates' 
      AND column_name IN ('setup_time', 'execution_time')
    `);
    
    const existingColumns = checkResult.rows.map(row => row.column_name);
    console.log('📊 Colonnes existantes:', existingColumns);
    
    // Ajouter setup_time si elle n'existe pas
    if (!existingColumns.includes('setup_time')) {
      await pool.query(`
        ALTER TABLE templates 
        ADD COLUMN IF NOT EXISTS setup_time INTEGER DEFAULT NULL
      `);
      console.log('✅ Colonne setup_time ajoutée');
    } else {
      console.log('ℹ️ Colonne setup_time existe déjà');
    }
    
    // Ajouter execution_time si elle n'existe pas
    if (!existingColumns.includes('execution_time')) {
      await pool.query(`
        ALTER TABLE templates 
        ADD COLUMN IF NOT EXISTS execution_time INTEGER DEFAULT NULL
      `);
      console.log('✅ Colonne execution_time ajoutée');
    } else {
      console.log('ℹ️ Colonne execution_time existe déjà');
    }
    
    // Ajouter les commentaires
    await pool.query(`
      COMMENT ON COLUMN templates.setup_time IS 'Temps de paramétrage en minutes'
    `).catch(() => {}); // Ignorer si le commentaire existe déjà
    
    await pool.query(`
      COMMENT ON COLUMN templates.execution_time IS 'Temps d''exécution en minutes'
    `).catch(() => {}); // Ignorer si le commentaire existe déjà
    
    console.log('✅ Migration appliquée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Exécuter la migration
if (require.main === module) {
  applyMigration()
    .then(() => {
      console.log('🎉 Migration terminée');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Échec de la migration:', error);
      process.exit(1);
    });
}

module.exports = { applyMigration };

