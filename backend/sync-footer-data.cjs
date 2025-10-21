const { Pool } = require('pg');

const pool = new Pool({
  user: 'fethi',
  host: '147.93.58.155',
  database: 'automivy',
  password: 'Fethi@2025!',
  port: 5432,
});

async function syncFooterData() {
  try {
    console.log('🚀 Synchronisation des données du footer...');

    // Mettre à jour les liens dans landing_content
    const updates = [
      { field: 'support_text', content: 'Support' },
      { field: 'support_link', content: '/support' },
      { field: 'privacy_text', content: 'Privacy' },
      { field: 'privacy_link', content: '/privacy' },
      { field: 'terms_text', content: 'Terms' },
      { field: 'terms_link', content: '/terms' }
    ];

    for (const update of updates) {
      const query = `
        UPDATE landing_content 
        SET content = $1 
        WHERE section = 'footer' AND field = $2
      `;
      
      await pool.query(query, [update.content, update.field]);
      console.log(`✅ Mis à jour: ${update.field} = ${update.content}`);
    }

    // Vérifier les nouvelles données
    const verifyQuery = 'SELECT * FROM landing_content WHERE section = $1';
    const verifyResult = await pool.query(verifyQuery, ['footer']);
    
    console.log('🔍 Nouvelles données du footer :');
    verifyResult.rows.forEach(row => {
      console.log(`- ${row.field}: ${row.content}`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation :', error);
  } finally {
    await pool.end();
  }
}

syncFooterData();
