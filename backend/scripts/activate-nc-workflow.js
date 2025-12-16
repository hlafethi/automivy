require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const WEBHOOK_PATH = 'nc-sort-1764866523044';

(async () => {
  try {
    console.log('🔍 1. Recherche du workflow Nextcloud dans n8n...');
    console.log('   N8N_URL:', N8N_URL);
    
    const wfsRes = await axios.get(N8N_URL + '/api/v1/workflows', {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const workflows = wfsRes.data.data || wfsRes.data;
    console.log('   Workflows trouvés:', workflows.length);
    
    // Chercher le workflow avec le bon webhook path
    let targetWorkflow = null;
    
    for (const wf of workflows) {
      const detail = await axios.get(N8N_URL + '/api/v1/workflows/' + wf.id, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      
      const webhook = detail.data.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
      if (webhook?.parameters?.path === WEBHOOK_PATH) {
        targetWorkflow = { ...wf, webhookPath: webhook.parameters.path };
        break;
      }
      
      // Afficher les workflows Nextcloud trouvés
      if (wf.name.toLowerCase().includes('nextcloud') || wf.name.toLowerCase().includes('sort')) {
        console.log(`   - ${wf.name} (${wf.id}) - active: ${wf.active}`);
        if (webhook) {
          console.log(`     webhook path: ${webhook.parameters?.path}`);
        }
      }
    }
    
    if (!targetWorkflow) {
      // Chercher n'importe quel workflow Nextcloud
      const ncWf = workflows.find(w => 
        w.name.toLowerCase().includes('nextcloud') || 
        w.name.toLowerCase().includes('sort')
      );
      
      if (ncWf) {
        targetWorkflow = ncWf;
        console.log('\n⚠️  Workflow trouvé par nom:', targetWorkflow.name);
      } else {
        console.log('\n❌ Aucun workflow Nextcloud trouvé!');
        return;
      }
    } else {
      console.log('\n✅ Workflow trouvé avec le bon webhook path:', targetWorkflow.name);
    }
    
    console.log('\n🔧 2. Activation du workflow', targetWorkflow.id, '...');
    
    // Désactiver d'abord si déjà actif (pour refresh)
    try {
      await axios.post(N8N_URL + '/api/v1/workflows/' + targetWorkflow.id + '/deactivate', {}, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      console.log('   Désactivé');
      await new Promise(r => setTimeout(r, 2000));
    } catch(e) {}
    
    // Activer
    await axios.post(N8N_URL + '/api/v1/workflows/' + targetWorkflow.id + '/activate', {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    console.log('   ✅ Activé!');
    
    // Vérifier
    console.log('\n🔍 3. Vérification...');
    await new Promise(r => setTimeout(r, 3000));
    
    const verifyRes = await axios.get(N8N_URL + '/api/v1/workflows/' + targetWorkflow.id, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    console.log('   Active:', verifyRes.data.active);
    
    const webhook = verifyRes.data.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
    const webhookPath = webhook?.parameters?.path;
    console.log('   Webhook path:', webhookPath);
    
    // Test du webhook
    console.log('\n🧪 4. Test du webhook...');
    const testUrl = N8N_URL + '/webhook/' + webhookPath;
    console.log('   URL:', testUrl);
    
    try {
      const testRes = await axios.post(testUrl, { 
        test: true,
        folders: ['/test'] 
      }, { timeout: 10000 });
      console.log('   ✅ SUCCESS! Status:', testRes.status);
    } catch(e) {
      console.log('   ❌ Erreur test:', e.response?.status, e.response?.data?.message || e.message);
    }
    
    console.log('\n📡 URL du webhook de production:');
    console.log(`   ${N8N_URL}/webhook/${webhookPath}`);
    console.log('\n🎉 Reteste maintenant le tri depuis l\'application!');
    
  } catch(e) {
    console.log('❌ Erreur:', e.response?.data || e.message);
  }
})();

