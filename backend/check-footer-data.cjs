const { Pool } = require('pg');

const pool = new Pool({
  user: 'fethi',
  host: '147.93.58.155',
  database: 'automivy',
  password: 'Fethi@2025!',
  port: 5432
});

async function checkFooterData() {
  try {
    console.log('🔍 Vérification des données footer...');
    const result = await pool.query('SELECT * FROM landing_sections WHERE section = $1', ['footer']);
    
    if (result.rows.length > 0) {
      console.log('📊 Données footer trouvées:');
      console.log(JSON.stringify(result.rows[0], null, 2));
      
      const content = result.rows[0].content;
      console.log('\n🎨 Couleurs et contenu:');
      console.log('Support content:', content.support_content ? 'Présent' : 'Absent');
      console.log('Support bg color:', content.support_bg_color);
      console.log('Support text color:', content.support_text_color);
      console.log('Privacy content:', content.privacy_content ? 'Présent' : 'Absent');
      console.log('Privacy bg color:', content.privacy_bg_color);
      console.log('Privacy text color:', content.privacy_text_color);
      console.log('Terms content:', content.terms_content ? 'Présent' : 'Absent');
      console.log('Terms bg color:', content.terms_bg_color);
      console.log('Terms text color:', content.terms_text_color);
    } else {
      console.log('❌ Aucune donnée footer trouvée');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

checkFooterData();