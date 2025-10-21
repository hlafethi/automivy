const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
  host: '147.93.58.155',
  port: 5432,
  database: 'automivy',
  user: 'fethi',
  password: 'Fethi@2025!',
});

async function addMediaFields() {
  try {
    console.log('🚀 [Media Fields] Ajout des champs média à la base de données...');
    
    // Hero Section - Images et vidéos
    const heroFields = [
      ['hero', 'background_image', ''],
      ['hero', 'hero_video', ''],
      ['hero', 'logo_image', '']
    ];
    
    for (const [section, field, content] of heroFields) {
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
      }
    }
    console.log('✅ [Media Fields] Hero section - champs média ajoutés');

    // Features Section - Icônes et images
    const featuresFields = [
      ['features', 'feature_1_image', ''],
      ['features', 'feature_2_image', ''],
      ['features', 'feature_3_image', ''],
      ['features', 'feature_4_image', ''],
      ['features', 'feature_5_image', ''],
      ['features', 'feature_6_image', ''],
      ['features', 'section_background', '']
    ];
    
    for (const [section, field, content] of featuresFields) {
      const exists = await pool.query(
        'SELECT 1 FROM landing_content WHERE section = $1 AND field = $2',
        [section, field]
      );
      
      if (exists.rows.length === 0) {
        await pool.query(
          'INSERT INTO landing_content (section, field, content) VALUES ($1, $2, $3)',
          [section, field, content]
        );
      }
    }
    console.log('✅ [Media Fields] Features section - champs média ajoutés');

    // Pricing Section - Images
    const pricingFields = [
      ['pricing', 'section_background', ''],
      ['pricing', 'plan_1_image', ''],
      ['pricing', 'plan_2_image', ''],
      ['pricing', 'plan_3_image', '']
    ];
    
    for (const [section, field, content] of pricingFields) {
      await pool.query(`
        INSERT INTO landing_content (section, field, content) 
        VALUES ($1, $2, $3)
        WHERE NOT EXISTS (
          SELECT 1 FROM landing_content 
          WHERE section = $1 AND field = $2
        )
      `, [section, field, content]);
    }
    console.log('✅ [Media Fields] Pricing section - champs média ajoutés');

    // About Section - Images et vidéos
    const aboutFields = [
      ['about', 'section_background', ''],
      ['about', 'about_image', ''],
      ['about', 'about_video', ''],
      ['about', 'team_image', '']
    ];
    
    for (const [section, field, content] of aboutFields) {
      await pool.query(`
        INSERT INTO landing_content (section, field, content) 
        VALUES ($1, $2, $3)
        WHERE NOT EXISTS (
          SELECT 1 FROM landing_content 
          WHERE section = $1 AND field = $2
        )
      `, [section, field, content]);
    }
    console.log('✅ [Media Fields] About section - champs média ajoutés');

    // Contact Section - Images
    const contactFields = [
      ['contact', 'section_background', ''],
      ['contact', 'contact_image', '']
    ];
    
    for (const [section, field, content] of contactFields) {
      await pool.query(`
        INSERT INTO landing_content (section, field, content) 
        VALUES ($1, $2, $3)
        WHERE NOT EXISTS (
          SELECT 1 FROM landing_content 
          WHERE section = $1 AND field = $2
        )
      `, [section, field, content]);
    }
    console.log('✅ [Media Fields] Contact section - champs média ajoutés');

    // Footer Section - Images
    const footerFields = [
      ['footer', 'logo_image', ''],
      ['footer', 'background_image', '']
    ];
    
    for (const [section, field, content] of footerFields) {
      await pool.query(`
        INSERT INTO landing_content (section, field, content) 
        VALUES ($1, $2, $3)
        WHERE NOT EXISTS (
          SELECT 1 FROM landing_content 
          WHERE section = $1 AND field = $2
        )
      `, [section, field, content]);
    }
    console.log('✅ [Media Fields] Footer section - champs média ajoutés');

    // Vérifier le nombre total de champs
    const result = await pool.query('SELECT COUNT(*) as total FROM landing_content');
    console.log('📊 [Media Fields] Total des champs dans la base:', result.rows[0].total);

    console.log('🎉 [Media Fields] Tous les champs média ont été ajoutés avec succès !');
    
  } catch (error) {
    console.error('❌ [Media Fields] Erreur lors de l\'ajout des champs:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Exécuter le script
if (require.main === module) {
  addMediaFields()
    .then(() => {
      console.log('🎉 [Media Fields] Script terminé avec succès !');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 [Media Fields] Échec du script:', error);
      process.exit(1);
    });
}

module.exports = { addMediaFields };
