/**
 * Script pour corriger le credential de génération d'images dans n8n
 * 
 * Problème: Le nœud "Récupération & Téléchargement Médias" utilise le credential
 * "Header Auth account 2" qui contient une clé OpenRouter (sk-or-...) alors qu'il
 * devrait utiliser une clé OpenAI (sk-proj-...) pour DALL-E.
 * 
 * Solution: Ce script crée un nouveau credential avec la clé OpenAI.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const N8N_URL = process.env.N8N_URL || 'https://n8n.globalsaas.eu';
const N8N_API_KEY = process.env.N8N_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 Correction du credential de génération d\'images');
  console.log('='.repeat(60));
  
  // Vérifier les variables d'environnement
  console.log('\n📋 Vérification des variables d\'environnement:');
  console.log(`  - N8N_URL: ${N8N_URL}`);
  console.log(`  - N8N_API_KEY: ${N8N_API_KEY ? '✅ Définie' : '❌ Manquante'}`);
  console.log(`  - OPENAI_API_KEY: ${OPENAI_API_KEY ? `✅ ${OPENAI_API_KEY.substring(0, 15)}...` : '❌ Manquante'}`);
  
  if (!OPENAI_API_KEY) {
    console.error('\n❌ OPENAI_API_KEY n\'est pas définie dans .env');
    console.error('   Ajoutez: OPENAI_API_KEY=sk-proj-... dans votre fichier .env');
    process.exit(1);
  }
  
  if (!N8N_API_KEY) {
    console.error('\n❌ N8N_API_KEY n\'est pas définie dans .env');
    process.exit(1);
  }
  
  // Vérifier que c'est bien une clé OpenAI (pas OpenRouter)
  if (OPENAI_API_KEY.startsWith('sk-or-')) {
    console.error('\n❌ OPENAI_API_KEY contient une clé OpenRouter (sk-or-...)');
    console.error('   Vous devez utiliser une vraie clé OpenAI (sk-proj-...)');
    console.error('   Obtenez-en une sur https://platform.openai.com/api-keys');
    process.exit(1);
  }
  
  if (!OPENAI_API_KEY.startsWith('sk-proj-') && !OPENAI_API_KEY.startsWith('sk-')) {
    console.warn('\n⚠️  OPENAI_API_KEY ne semble pas être une clé OpenAI standard');
    console.warn(`   Format détecté: ${OPENAI_API_KEY.substring(0, 10)}...`);
  }
  
  console.log('\n✅ Clé OpenAI valide détectée');
  
  try {
    // Créer un nouveau credential pour DALL-E
    console.log('\n📦 Création du credential pour DALL-E...');
    
    const credentialData = {
      name: 'OpenAI DALL-E (Images)',
      type: 'httpHeaderAuth',
      data: {
        name: 'Authorization',
        value: `Bearer ${OPENAI_API_KEY}`
      }
    };
    
    const response = await fetch(`${N8N_URL}/api/v1/credentials`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentialData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur lors de la création du credential: ${response.status}`);
      console.error(errorText);
      
      // Essayer de lister les credentials existants
      console.log('\n📋 Tentative de lister les credentials existants...');
      const listResponse = await fetch(`${N8N_URL}/api/v1/credentials`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY
        }
      });
      
      if (listResponse.ok) {
        const credentials = await listResponse.json();
        console.log('Credentials trouvés:', JSON.stringify(credentials, null, 2));
      }
      
      return;
    }
    
    const createdCredential = await response.json();
    console.log(`\n✅ Credential créé avec succès!`);
    console.log(`   ID: ${createdCredential.id}`);
    console.log(`   Nom: ${createdCredential.name}`);
    
    console.log('\n📝 Instructions pour utiliser ce credential:');
    console.log('   1. Allez dans n8n et ouvrez le workflow de Production Vidéo');
    console.log('   2. Sélectionnez le nœud "Récupération & Téléchargement Médias"');
    console.log('   3. Dans "Authentication", changez "Header Auth account 2" pour "OpenAI DALL-E (Images)"');
    console.log('   4. Sauvegardez le workflow');
    
    console.log('\n💡 Alternative: Redéployez le workflow depuis Automivy');
    console.log('   L\'injecteur utilisera maintenant OPENAI_API_KEY directement');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

main();

