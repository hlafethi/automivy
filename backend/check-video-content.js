const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkVideoContent() {
  try {
    const result = await pool.query('SELECT * FROM landing_content WHERE section = $1', ['video_demo']);
    
    if (result.rows.length === 0) {
      console.log('❌ Aucune donnée trouvée pour video_demo');
      return;
    }
    
    const content = result.rows[0];
    console.log('📊 Contenu video_demo:');
    console.log(JSON.stringify(content, null, 2));
    
    // Vérifier les vidéos spécifiquement
    console.log('\n🎬 État des vidéos:');
    for (let i = 1; i <= 5; i++) {
      const enabled = content[`video_${i}_enabled`];
      const video = content[`video_${i}_video`];
      const title = content[`video_${i}_title`];
      
      console.log(`Vidéo ${i}:`);
      console.log(`  - Activée: ${enabled}`);
      console.log(`  - Fichier: ${video || 'Aucun'}`);
      console.log(`  - Titre: ${title || 'Aucun'}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
  }
}

checkVideoContent();
