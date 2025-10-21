const { Pool } = require('pg');

const pool = new Pool({
  user: 'fethi',
  host: '147.93.58.155',
  database: 'automivy',
  password: 'Fethi@2025!',
  port: 5432,
});

async function checkLandingContent() {
  try {
    console.log('🔍 Vérification de la table landing_content...');

    const query = 'SELECT * FROM landing_content WHERE section = $1';
    const result = await pool.query(query, ['footer']);
    
    if (result.rows.length > 0) {
      console.log('📋 Données dans landing_content :');
      result.rows.forEach(row => {
        console.log(`- ${row.field}: ${row.content}`);
      });
    } else {
      console.log('❌ Aucune donnée trouvée pour la section footer dans landing_content');
    }

  } catch (error) {
    console.error('❌ Erreur :', error);
  } finally {
    await pool.end();
  }
}

checkLandingContent();
