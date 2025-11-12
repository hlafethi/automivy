// Script pour vérifier les modèles installés sur Ollama (localai)
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function checkOllamaModels() {
  // Essayer plusieurs URLs possibles
  const urls = [
    process.env.OLLAMA_URL,
    process.env.VITE_OLLAMA_URL,
    'http://147.93.58.155:19080', // Port mappé sur l'hôte (backend hors Docker)
    'http://localai:8080', // Port interne du conteneur (backend dans Docker)
    'http://localhost:19080',
    'http://127.0.0.1:19080'
  ].filter(Boolean); // Filtrer les valeurs nulles/undefined

  console.log('🔍 Vérification des modèles Ollama installés...\n');
  console.log('📋 URLs à tester:');
  urls.forEach((url, index) => {
    console.log(`   ${index + 1}. ${url}`);
  });
  console.log('');

  for (const baseUrl of urls) {
    try {
      console.log(`🌐 Test de connexion à: ${baseUrl}`);
      
      const tagsUrl = `${baseUrl}/api/tags`;
      console.log(`   URL complète: ${tagsUrl}`);
      
      const response = await fetch(tagsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (!response.ok) {
        console.log(`   ❌ Erreur HTTP ${response.status}: ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      
      console.log(`   ✅ Connexion réussie!`);
      console.log(`   📦 Nombre de modèles trouvés: ${data.models?.length || 0}\n`);

      if (data.models && data.models.length > 0) {
        console.log('📋 Modèles installés:');
        console.log('─'.repeat(60));
        data.models.forEach((model, index) => {
          console.log(`\n${index + 1}. Modèle: ${model.name}`);
          console.log(`   - Taille: ${(model.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
          console.log(`   - Digest: ${model.digest?.substring(0, 12) || 'N/A'}...`);
          console.log(`   - Modifié: ${model.modified_at || 'N/A'}`);
        });
        console.log('\n' + '─'.repeat(60));
        
        // Modèles compatibles avec l'AI Generator
        const compatibleModels = data.models.map(m => m.name).filter(name => {
          return name.includes('phi3') || 
                 name.includes('llama') || 
                 name.includes('mistral') || 
                 name.includes('codellama');
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
  console.log('3. Si backend hors Docker, utiliser l\'IP VPS: OLLAMA_URL=http://147.93.58.155:19080');
  console.log('4. Si backend dans Docker, vérifier le réseau: docker network inspect <network_name>');
}

checkOllamaModels().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

