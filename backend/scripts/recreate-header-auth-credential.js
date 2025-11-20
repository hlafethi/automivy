/**
 * Script pour recréer le credential "Header Auth account 2" dans n8n
 * Ce credential est utilisé par tous les workflows pour OpenRouter
 */

require('dotenv').config();
const config = require('../config');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const CREDENTIAL_NAME = 'Header Auth account 2';
const CREDENTIAL_ID = 'o7MztG7VAoDGoDSp'; // ID attendu (mais n8n peut générer un nouvel ID)

async function recreateHeaderAuthCredential() {
  try {
    console.log('🔧 [RecreateCredential] Démarrage de la recréation du credential "Header Auth account 2"...');
    console.log('🔧 [RecreateCredential] URL n8n:', config.n8n.url);
    console.log('🔧 [RecreateCredential] API Key présente:', config.n8n.apiKey ? 'OUI' : 'NON');
    console.log('🔧 [RecreateCredential] OpenRouter API Key présente:', OPENROUTER_API_KEY ? 'OUI' : 'NON');
    
    // Structure du credential httpHeaderAuth pour n8n
    const credentialData = {
      name: CREDENTIAL_NAME,
      type: 'httpHeaderAuth',
      data: {
        name: 'Authorization',
        value: `Bearer ${OPENROUTER_API_KEY}`
      }
    };
    
    console.log('🔧 [RecreateCredential] Données du credential:');
    console.log('  - Name:', credentialData.name);
    console.log('  - Type:', credentialData.type);
    console.log('  - Header Name:', credentialData.data.name);
    console.log('  - Header Value:', credentialData.data.value.substring(0, 20) + '...');
    
    // Vérifier d'abord si le credential existe déjà
    console.log('🔍 [RecreateCredential] Vérification si le credential existe déjà...');
    try {
      const checkResponse = await fetch(`${config.n8n.url}/api/v1/credentials/${CREDENTIAL_ID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': config.n8n.apiKey
        }
      });
      
      if (checkResponse.ok) {
        const existingCred = await checkResponse.json();
        console.log('✅ [RecreateCredential] Le credential existe déjà!');
        console.log('  - ID:', existingCred.id);
        console.log('  - Name:', existingCred.name);
        console.log('  - Type:', existingCred.type);
        
        // Mettre à jour le credential existant
        console.log('🔄 [RecreateCredential] Mise à jour du credential existant...');
        const updateResponse = await fetch(`${config.n8n.url}/api/v1/credentials/${CREDENTIAL_ID}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': config.n8n.apiKey
          },
          body: JSON.stringify(credentialData)
        });
        
        if (updateResponse.ok) {
          const updatedCred = await updateResponse.json();
          console.log('✅ [RecreateCredential] Credential mis à jour avec succès!');
          console.log('  - ID:', updatedCred.id);
          console.log('  - Name:', updatedCred.name);
          return updatedCred;
        } else {
          const errorText = await updateResponse.text();
          console.error('❌ [RecreateCredential] Erreur lors de la mise à jour:', errorText);
          throw new Error(`Erreur mise à jour credential: ${errorText}`);
        }
      } else {
        console.log('ℹ️ [RecreateCredential] Le credential n\'existe pas, création d\'un nouveau...');
      }
    } catch (checkError) {
      console.log('ℹ️ [RecreateCredential] Impossible de vérifier l\'existence (probablement inexistant):', checkError.message);
    }
    
    // Créer le credential
    console.log('🔧 [RecreateCredential] Création du credential dans n8n...');
    const createResponse = await fetch(`${config.n8n.url}/api/v1/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': config.n8n.apiKey
      },
      body: JSON.stringify(credentialData)
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('❌ [RecreateCredential] Erreur lors de la création:', errorText);
      console.error('❌ [RecreateCredential] Status:', createResponse.status);
      throw new Error(`Erreur création credential: ${errorText}`);
    }
    
    const createdCred = await createResponse.json();
    console.log('✅ [RecreateCredential] Credential créé avec succès!');
    console.log('  - ID:', createdCred.id);
    console.log('  - Name:', createdCred.name);
    console.log('  - Type:', createdCred.type);
    
    if (createdCred.id !== CREDENTIAL_ID) {
      console.warn('⚠️ [RecreateCredential] ATTENTION: L\'ID généré par n8n est différent de l\'ID attendu!');
      console.warn('  - ID attendu:', CREDENTIAL_ID);
      console.warn('  - ID généré:', createdCred.id);
      console.warn('  - Vous devrez peut-être mettre à jour les variables d\'environnement OPENROUTER_USER_CREDENTIAL_ID');
    }
    
    console.log('✅ [RecreateCredential] Credential "Header Auth account 2" recréé avec succès!');
    return createdCred;
    
  } catch (error) {
    console.error('❌ [RecreateCredential] Erreur:', error);
    console.error('❌ [RecreateCredential] Stack:', error.stack);
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  recreateHeaderAuthCredential()
    .then(() => {
      console.log('✅ Script terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script terminé avec erreur:', error);
      process.exit(1);
    });
}

module.exports = { recreateHeaderAuthCredential };

