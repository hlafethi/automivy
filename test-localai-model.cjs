// Script de test pour vérifier les modèles LocalAI
const fetch = require('node-fetch');

async function testModel(modelName) {
  const baseUrl = 'http://147.93.58.155:19080';
  
  console.log(`\n🧪 Test du modèle: ${modelName}`);
  console.log(`📍 URL: ${baseUrl}/v1/chat/completions`);
  
  const requestBody = {
    model: modelName,
    messages: [
      { role: 'user', content: 'Bonjour, réponds simplement "OK" pour tester.' }
    ],
    stream: false,
    temperature: 0.7,
    max_tokens: 50
  };
  
  try {
    console.log(`📤 Envoi de la requête...`);
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`📥 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Erreur: ${errorText}`);
      return false;
    }
    
    const data = await response.json();
    console.log(`✅ Succès!`);
    console.log(`📊 Réponse:`, JSON.stringify(data, null, 2).substring(0, 500));
    return true;
  } catch (error) {
    console.error(`❌ Exception: ${error.message}`);
    return false;
  }
}

async function testAllModels() {
  console.log('🔍 Récupération de la liste des modèles...');
  
  try {
    const response = await fetch('http://147.93.58.155:19080/v1/models');
    const data = await response.json();
    const models = data.data || [];
    
    console.log(`📋 Modèles disponibles: ${models.length}`);
    models.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.id || m.name}`);
    });
    
    console.log(`\n🧪 Test de chaque modèle:\n`);
    
    for (const model of models) {
      const modelId = model.id || model.name;
      const success = await testModel(modelId);
      if (success) {
        console.log(`✅ Modèle ${modelId} fonctionne!`);
        break; // Arrêter au premier modèle qui fonctionne
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde entre les tests
    }
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
  }
}

testAllModels();

