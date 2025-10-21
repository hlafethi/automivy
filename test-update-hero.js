const { Pool } = require('pg');
require('dotenv').config();

const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'automivy',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
});

async function updateHeroImage() {
  try {
    console.log('🔍 Mise à jour de l\'image hero...');
    
    await db.query(`
      INSERT INTO landing_content (section, field, content, updated_at)
      VALUES ('hero', 'background_image', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (section, field)
      DO UPDATE SET 
        content = EXCLUDED.content,
        updated_at = CURRENT_TIMESTAMP
    `, ['/uploads/media-1761033957892-998598787.png']);
    
    console.log('✅ Image hero mise à jour avec succès');
    
    // Vérifier la mise à jour
    const result = await db.query(`
      SELECT content FROM landing_content 
      WHERE section = 'hero' AND field = 'background_image'
    `);
    
    console.log('🔍 Image actuelle:', result.rows[0]?.content);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.end();
  }
}

updateHeroImage();
