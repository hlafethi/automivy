const { Pool } = require('pg');

const pool = new Pool({
  user: 'fethi',
  host: '147.93.58.155',
  database: 'automivy',
  password: 'Fethi@2025!',
  port: 5432,
});

async function updateFooterLinks() {
  try {
    console.log('🚀 Mise à jour des liens du footer...');

    // Récupérer les données actuelles
    const getQuery = 'SELECT content FROM landing_sections WHERE section = $1';
    const getResult = await pool.query(getQuery, ['footer']);
    
    if (getResult.rows.length === 0) {
      console.log('❌ Section footer non trouvée');
      return;
    }

    const currentContent = getResult.rows[0].content;
    console.log('📋 Contenu actuel :', JSON.stringify(currentContent, null, 2));

    // Mettre à jour les liens
    const updatedContent = {
      ...currentContent,
      support_text: 'Support',
      support_link: '/support',
      privacy_text: 'Privacy', 
      privacy_link: '/privacy',
      terms_text: 'Terms',
      terms_link: '/terms'
    };

    // Sauvegarder les modifications
    const updateQuery = `
      UPDATE landing_sections 
      SET content = $1, updated_at = NOW()
      WHERE section = 'footer'
    `;

    await pool.query(updateQuery, [JSON.stringify(updatedContent)]);
    console.log('✅ Liens du footer mis à jour avec succès');

    // Vérifier les nouvelles données
    const verifyQuery = 'SELECT content FROM landing_sections WHERE section = $1';
    const verifyResult = await pool.query(verifyQuery, ['footer']);
    
    if (verifyResult.rows.length > 0) {
      console.log('🔍 Nouvelles données du footer :');
      console.log(JSON.stringify(verifyResult.rows[0].content, null, 2));
    }

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour :', error);
  } finally {
    await pool.end();
  }
}

updateFooterLinks();
