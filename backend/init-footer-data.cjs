const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: 'fethi',
  host: '147.93.58.155',
  database: 'automivy',
  password: 'Fethi@2025!',
  port: 5432,
});

async function initFooterData() {
  try {
    console.log('🚀 Initialisation des données du footer...');

    // Vérifier si la section footer existe déjà
    const checkQuery = 'SELECT * FROM landing_sections WHERE section = $1';
    const checkResult = await pool.query(checkQuery, ['footer']);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Section footer existe déjà, mise à jour des données...');
      
      // Mettre à jour les données existantes
      const updateQuery = `
        UPDATE landing_sections 
        SET content = $1, updated_at = NOW()
        WHERE section = 'footer'
      `;
      
      const footerContent = {
        enabled: 'true',
        company_name: 'AUTOMIVY',
        tagline: 'Automatisez votre business',
        description: 'La plateforme d\'automatisation qui transforme vos processus métier',
        support_text: 'Support',
        support_link: '/support',
        privacy_text: 'Privacy',
        privacy_link: '/privacy',
        terms_text: 'Terms',
        terms_link: '/terms',
        copyright: '© 2024 AUTOMIVY. Tous droits réservés.'
      };
      
      await pool.query(updateQuery, [JSON.stringify(footerContent)]);
      console.log('✅ Données du footer mises à jour avec succès');
      
    } else {
      console.log('📝 Création de la section footer...');
      
      // Créer la section footer
      const insertQuery = `
        INSERT INTO landing_sections (section, content, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
      `;
      
      const footerContent = {
        enabled: 'true',
        company_name: 'AUTOMIVY',
        tagline: 'Automatisez votre business',
        description: 'La plateforme d\'automatisation qui transforme vos processus métier',
        support_text: 'Support',
        support_link: '/support',
        privacy_text: 'Privacy',
        privacy_link: '/privacy',
        terms_text: 'Terms',
        terms_link: '/terms',
        copyright: '© 2024 AUTOMIVY. Tous droits réservés.'
      };
      
      await pool.query(insertQuery, ['footer', JSON.stringify(footerContent)]);
      console.log('✅ Section footer créée avec succès');
    }

    // Vérifier les données
    const verifyQuery = 'SELECT * FROM landing_sections WHERE section = $1';
    const verifyResult = await pool.query(verifyQuery, ['footer']);
    
    if (verifyResult.rows.length > 0) {
      console.log('🔍 Données du footer dans la base :');
      console.log(JSON.stringify(verifyResult.rows[0].content, null, 2));
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation du footer :', error);
  } finally {
    await pool.end();
  }
}

initFooterData();
