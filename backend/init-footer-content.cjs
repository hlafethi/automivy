const { Pool } = require('pg');

const pool = new Pool({
  user: 'fethi',
  host: '147.93.58.155',
  database: 'automivy',
  password: 'Fethi@2025!',
  port: 5432
});

async function initFooterContent() {
  try {
    console.log('🔍 Initialisation du contenu footer...');
    
    // Récupérer les données actuelles
    const result = await pool.query('SELECT * FROM landing_sections WHERE section = $1', ['footer']);
    
    if (result.rows.length > 0) {
      const currentContent = result.rows[0].content;
      
      // Ajouter les nouveaux champs avec des valeurs par défaut
      const updatedContent = {
        ...currentContent,
        // Contenu des pages
        support_content: '<h2>Centre d\'aide AUTOMIVY</h2><p>Bienvenue dans notre centre d\'aide. Trouvez toutes les réponses à vos questions.</p><h3>Comment nous contacter</h3><ul><li>Email: support@automivy.com</li><li>Téléphone: +33 1 23 45 67 89</li><li>Chat en direct disponible 24/7</li></ul>',
        privacy_content: '<h2>Politique de Confidentialité</h2><p>Votre vie privée est importante pour nous. Cette politique explique comment nous collectons, utilisons et protégeons vos informations.</p><h3>Collecte d\'informations</h3><p>Nous collectons uniquement les informations nécessaires pour fournir nos services.</p>',
        terms_content: '<h2>Conditions d\'Utilisation</h2><p>En utilisant AUTOMIVY, vous acceptez ces conditions d\'utilisation.</p><h3>Utilisation du service</h3><p>Vous vous engagez à utiliser notre plateforme de manière responsable et conforme à la loi.</p>',
        // Couleurs par défaut
        support_bg_color: '#f8fafc',
        support_text_color: '#1e293b',
        privacy_bg_color: '#f8fafc',
        privacy_text_color: '#1e293b',
        terms_bg_color: '#f8fafc',
        terms_text_color: '#1e293b'
      };
      
      // Mettre à jour la base de données
      await pool.query(
        'UPDATE landing_sections SET content = $1, updated_at = NOW() WHERE section = $2',
        [updatedContent, 'footer']
      );
      
      console.log('✅ Contenu footer initialisé avec succès');
      console.log('📝 Champs ajoutés:');
      console.log('- support_content, support_bg_color, support_text_color');
      console.log('- privacy_content, privacy_bg_color, privacy_text_color');
      console.log('- terms_content, terms_bg_color, terms_text_color');
      
    } else {
      console.log('❌ Aucune section footer trouvée');
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

initFooterContent();
