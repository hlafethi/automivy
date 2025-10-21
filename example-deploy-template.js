// Exemple d'utilisation de l'API de déploiement de templates

import fetch from 'node-fetch';

async function deployTemplate() {
  try {
    console.log('🚀 Déploiement d\'un template...');
    
    // Données de l'utilisateur
    const userData = {
      userId: 'user-123',
      templateId: 'template-assurance-pdf',
      userEmail: 'client@exemple.com'
    };
    
    // Appel à l'API de déploiement
    const response = await fetch('http://localhost:3004/api/deploy-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Template déployé avec succès !');
    console.log('📧 Email envoyé à:', result.userEmail);
    console.log('🔗 Lien du formulaire:', result.formUrl);
    console.log('🔑 Token généré:', result.token);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur lors du déploiement:', error.message);
  }
}

// Test du déploiement
deployTemplate();
