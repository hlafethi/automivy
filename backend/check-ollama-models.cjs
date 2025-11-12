// Script pour vérifier les modèles installés sur Ollama (localai)
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function checkOllamaModels() {
  // Essayer plusieurs URLs possibles
  // Port mappé Docker: 19080 (hôte) -> 8080 (conteneur)
  const urls = [
    process.env.OLLAMA_URL,
    process.env.VITE_OLLAMA_URL,
    'http://147.93.58.155:19080', // Port mappé sur l'hôte (dev local)
    'http://localai:8080', // Port interne du conteneur (production Docker)
    'http://147.93.58.155:8080', // Essai avec port interne
    'http://localhost:19080',
    'http://127.0.0.1:19080'
  ].filter(Boolean); // Filtrer les valeurs nulles/undefined

  console.log('🔍 Vérification des modèles LocalAI installés sur localai...\n');
  console.log('📋 URLs à tester:');
  urls.forEach((url, index) => {
    console.log(`   ${index + 1}. ${url}`);
  });
  console.log('');

  for (const baseUrl of urls) {
    try {
      console.log(`🌐 Test de connexion à: ${baseUrl}`);
      
      // LocalAI utilise /v1/models (format OpenAI)
      const modelsUrl = `${baseUrl}/v1/models`;
      console.log(`   URL complète: ${modelsUrl}`);
      
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (!response.ok) {
        const text = await response.text();
        console.log(`   ❌ Erreur HTTP ${response.status}: ${response.statusText}`);
        console.log(`   Réponse: ${text.substring(0, 200)}`);
        continue;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.log(`   ⚠️  Réponse non-JSON: ${contentType}`);
        console.log(`   Réponse: ${text.substring(0, 200)}`);
        continue;
      }

      const data = await response.json();
      
      console.log(`   ✅ Connexion réussie!`);
      // Format OpenAI: { data: [{ id: "...", ... }] }
      const models = data.data || data.models || [];
      console.log(`   📦 Nombre de modèles trouvés: ${models.length}\n`);

      if (models.length > 0) {
        console.log('📋 Modèles installés:');
        console.log('─'.repeat(60));
        models.forEach((model, index) => {
          const modelId = model.id || model.name || 'N/A';
          console.log(`\n${index + 1}. Modèle: ${modelId}`);
          if (model.size) {
            console.log(`   - Taille: ${(model.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
          }
          if (model.digest) {
            console.log(`   - Digest: ${model.digest.substring(0, 12)}...`);
          }
          if (model.created) {
            console.log(`   - Créé: ${model.created}`);
          }
          if (model.object) {
            console.log(`   - Type: ${model.object}`);
          }
        });
        console.log('\n' + '─'.repeat(60));
        
        // Modèles compatibles avec l'AI Generator
        const compatibleModels = models.map(m => m.id || m.name).filter(name => {
          return name && (name.includes('phi3') || 
                 name.includes('llama') || 
                 name.includes('mistral') || 
                 name.includes('codellama') ||
                 name.includes('gpt') ||
                 name.includes('claude'));
        });

        if (compatibleModels.length > 0) {
          console.log('\n✅ Modèles compatibles avec l\'AI Generator:');
          compatibleModels.forEach(model => console.log(`   - ${model}`));
        } else {
          console.log('\n⚠️  Aucun modèle compatible trouvé.');
          console.log('   Modèles recommandés:');
          console.log('   - phi3:mini');
          console.log('   - phi3:3.8b');
          console.log('   - llama3.1:8b');
          console.log('   - mistral:7b');
          console.log('   - codellama:latest');
        }

        console.log(`\n✅ URL fonctionnelle: ${baseUrl}`);
        console.log(`\n🔧 Configuration recommandée dans backend/.env:`);
        console.log(`   OLLAMA_URL=${baseUrl}`);
        
        return; // Arrêter après le premier succès
      } else {
        console.log(`   ⚠️  Aucun modèle trouvé sur ${baseUrl}`);
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}`);
      if (error.code === 'ENOTFOUND') {
        console.log(`      → Le nom d'hôte "${baseUrl.split('://')[1].split(':')[0]}" ne peut pas être résolu`);
        console.log(`      → Utiliser l'IP VPS (147.93.58.155) si le backend n'est pas dans Docker`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`      → Connexion refusée - vérifier que Ollama est démarré`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`      → Timeout - vérifier la connectivité réseau`);
      }
      console.log('');
    }
  }

  console.log('\n❌ Aucune connexion réussie.');
  console.log('\n🔍 Dépannage:');
  console.log('1. Vérifier que le conteneur localai est démarré: docker ps | grep localai');
  console.log('2. Vérifier le port mappé: docker ps | grep localai (colonne PORTS)');
  console.log('   → Port mappé attendu: 19080:8080 (hôte:conteneur)');
  console.log('3. Si backend en dev (PC local), utiliser: OLLAMA_URL=http://147.93.58.155:19080');
  console.log('4. Si backend dans Docker, utiliser: OLLAMA_URL=http://localai:8080');
}

checkOllamaModels().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

