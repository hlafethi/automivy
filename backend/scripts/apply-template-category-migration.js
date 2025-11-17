const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool(config.database);

async function applyMigration() {
  try {
    console.log('🔄 Application de la migration pour ajouter category aux templates...');
    
    // Vérifier si la colonne existe déjà
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'templates' 
      AND column_name = 'category'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('ℹ️ Colonne category existe déjà');
    } else {
      // Ajouter la colonne category
      await pool.query(`
        ALTER TABLE templates 
        ADD COLUMN category TEXT DEFAULT NULL
      `);
      console.log('✅ Colonne category ajoutée');
    }
    
    // Ajouter le commentaire
    await pool.query(`
      COMMENT ON COLUMN templates.category IS 'Catégorie métier du template (Gestion quotidienne, Marketing / Ventes, Support / Service client, Comptabilité / Finance, RH, Logistique / Production)'
    `).catch(() => {}); // Ignorer si le commentaire existe déjà
    
    // Créer l'index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category)
    `).catch(() => {}); // Ignorer si l'index existe déjà
    
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

