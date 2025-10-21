const { Pool } = require('pg');

const pool = new Pool({
  user: 'fethi',
  host: '147.93.58.155',
  database: 'automivy',
  password: 'Fethi@2025!',
  port: 5432
});

async function forceUpdateFooter() {
  try {
    console.log('🔄 Force update des données footer...');
    
    // Récupérer les données actuelles
    const result = await pool.query('SELECT * FROM landing_sections WHERE section = $1', ['footer']);
    
    if (result.rows.length > 0) {
      const currentContent = result.rows[0].content;
      
      // Forcer la mise à jour avec un timestamp
      const updatedContent = {
        ...currentContent,
        last_updated: new Date().toISOString()
      };
      
      // Mettre à jour la base de données
      await pool.query(
        'UPDATE landing_sections SET content = $1, updated_at = NOW() WHERE section = $2',
        [updatedContent, 'footer']
      );
      
      console.log('✅ Footer forcé à jour avec timestamp:', updatedContent.last_updated);
      
    } else {
      console.log('❌ Aucune section footer trouvée');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

forceUpdateFooter();
