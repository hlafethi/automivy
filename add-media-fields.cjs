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
    await pool.query(`
      INSERT INTO landing_content (section, field, content) VALUES
      ('hero', 'background_image', ''),
      ('hero', 'hero_video', ''),
      ('hero', 'logo_image', '')
      ON CONFLICT (section, field) DO NOTHING
    `);
    console.log('✅ [Media Fields] Hero section - champs média ajoutés');

    // Features Section - Icônes et images
    await pool.query(`
      INSERT INTO landing_content (section, field, content) VALUES
      ('features', 'feature_1_image', ''),
      ('features', 'feature_2_image', ''),
      ('features', 'feature_3_image', ''),
      ('features', 'feature_4_image', ''),
      ('features', 'feature_5_image', ''),
      ('features', 'feature_6_image', ''),
      ('features', 'section_background', '')
      ON CONFLICT (section, field) DO NOTHING
    `);
    console.log('✅ [Media Fields] Features section - champs média ajoutés');

    // Pricing Section - Images
    await pool.query(`
      INSERT INTO landing_content (section, field, content) VALUES
      ('pricing', 'section_background', ''),
      ('pricing', 'plan_1_image', ''),
      ('pricing', 'plan_2_image', ''),
      ('pricing', 'plan_3_image', '')
      ON CONFLICT (section, field) DO NOTHING
    `);
    console.log('✅ [Media Fields] Pricing section - champs média ajoutés');

    // About Section - Images et vidéos
    await pool.query(`
      INSERT INTO landing_content (section, field, content) VALUES
      ('about', 'section_background', ''),
      ('about', 'about_image', ''),
      ('about', 'about_video', ''),
      ('about', 'team_image', '')
      ON CONFLICT (section, field) DO NOTHING
    `);
    console.log('✅ [Media Fields] About section - champs média ajoutés');

    // Contact Section - Images
    await pool.query(`
      INSERT INTO landing_content (section, field, content) VALUES
      ('contact', 'section_background', ''),
      ('contact', 'contact_image', '')
      ON CONFLICT (section, field) DO NOTHING
    `);
    console.log('✅ [Media Fields] Contact section - champs média ajoutés');

    // Footer Section - Images
    await pool.query(`
      INSERT INTO landing_content (section, field, content) VALUES
      ('footer', 'logo_image', ''),
      ('footer', 'background_image', '')
      ON CONFLICT (section, field) DO NOTHING
    `);
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
