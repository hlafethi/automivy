require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    console.log('🔧 Correction du credential Nextcloud...\n');
    
    // 1. Récupérer tous les credentials
    console.log('1. Recherche des credentials Nextcloud...');
    const credsRes = await axios.get(`${N8N_URL}/api/v1/credentials`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const credentials = credsRes.data.data || credsRes.data;
    const ncCreds = credentials.filter(c => 
      c.type === 'nextCloudApi' || 
      c.name.toLowerCase().includes('nextcloud')
    );
    
    console.log(`   Trouvé: ${ncCreds.length} credential(s) Nextcloud`);
    
    for (const cred of ncCreds) {
      console.log(`\n📋 Credential: ${cred.name} (${cred.id})`);
      
      // 2. Récupérer les détails du credential
      try {
        const detailRes = await axios.get(`${N8N_URL}/api/v1/credentials/${cred.id}`, {
          headers: { 'X-N8N-API-KEY': N8N_API_KEY }
        });
        
        const credDetail = detailRes.data;
        console.log('   Type:', credDetail.type);
        
        // Le credential n8n ne retourne pas les données sensibles,
        // on doit le recréer avec les bonnes données
        
        // On va juste informer l'utilisateur de ce qu'il faut faire
        console.log('\n⚠️  Pour corriger ce credential dans n8n:');
        console.log('   1. Ouvrir n8n et aller dans les credentials');
        console.log('   2. Éditer le credential Nextcloud');
        console.log('   3. Changer le "Web DAV URL" en: https://s02.swdrive.fr');
        console.log('   4. Garder le User et Password identiques');
        console.log('   5. Tester la connexion et sauvegarder');
        
      } catch(e) {
        console.log('   ⚠️  Impossible de récupérer les détails');
      }
    }
    
    // Alternative: Supprimer et redéployer
    console.log('\n\n💡 ALTERNATIVE RECOMMANDÉE:');
    console.log('   1. Supprime le workflow Nextcloud dans n8n');
    console.log('   2. Supprime le credential Nextcloud dans n8n');
    console.log('   3. Redéploie depuis l\'application');
    console.log('   Le nouveau credential sera créé avec la bonne URL');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
})();

