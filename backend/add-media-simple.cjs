const { Pool } = require('pg');

const pool = new Pool({
  host: '147.93.58.155',
  port: 5432,
  database: 'automivy',
  user: 'fethi',
  password: 'Fethi@2025!',
});

async function addMediaFields() {
  try {
    console.log('🚀 [Media Fields] Ajout des champs média...');
    
    const mediaFields = [
      // Hero Section
      ['hero', 'background_image', ''],
      ['hero', 'hero_video', ''],
      ['hero', 'logo_image', ''],
      
      // Features Section
      ['features', 'feature_1_image', ''],
      ['features', 'feature_2_image', ''],
      ['features', 'feature_3_image', ''],
      ['features', 'feature_4_image', ''],
      ['features', 'feature_5_image', ''],
      ['features', 'feature_6_image', ''],
      ['features', 'section_background', ''],
      
      // Pricing Section
      ['pricing', 'section_background', ''],
      ['pricing', 'plan_1_image', ''],
      ['pricing', 'plan_2_image', ''],
      ['pricing', 'plan_3_image', ''],
      
      // About Section
      ['about', 'section_background', ''],
      ['about', 'about_image', ''],
      ['about', 'about_video', ''],
      ['about', 'team_image', ''],
      
      // Contact Section
      ['contact', 'section_background', ''],
      ['contact', 'contact_image', ''],
      
      // Footer Section
      ['footer', 'logo_image', ''],
      ['footer', 'background_image', '']
    ];
    
    let addedCount = 0;
    
    for (const [section, field, content] of mediaFields) {
      try {
        // Vérifier si le champ existe déjà
        const exists = await pool.query(
          'SELECT 1 FROM landing_content WHERE section = $1 AND field = $2',
          [section, field]
        );
        
        if (exists.rows.length === 0) {
          await pool.query(
            'INSERT INTO landing_content (section, field, content) VALUES ($1, $2, $3)',
            [section, field, content]
          );
          addedCount++;
          console.log(`✅ Ajouté: ${section}.${field}`);
        } else {
          console.log(`⏭️  Existe déjà: ${section}.${field}`);
        }
      } catch (error) {
        console.error(`❌ Erreur pour ${section}.${field}:`, error.message);
      }
    }
    
    console.log(`🎉 [Media Fields] Terminé! ${addedCount} nouveaux champs ajoutés.`);
    
    // Vérifier le total
    const result = await pool.query('SELECT COUNT(*) as total FROM landing_content');
    console.log(`📊 Total des champs dans la base: ${result.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ [Media Fields] Erreur générale:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  addMediaFields()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Échec:', error);
      process.exit(1);
    });
}

module.exports = { addMediaFields };
