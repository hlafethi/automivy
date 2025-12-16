require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    console.log('🔧 Correction du workflow Nextcloud existant dans n8n...\n');
    
    // 1. Trouver le workflow
    console.log('1. Recherche du workflow Nextcloud...');
    const wfsRes = await axios.get(`${N8N_URL}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const workflows = wfsRes.data.data || wfsRes.data;
    const ncWorkflow = workflows.find(w => w.name.toLowerCase().includes('nextcloud'));
    
    if (!ncWorkflow) {
      console.log('❌ Aucun workflow Nextcloud trouvé');
      return;
    }
    
    console.log(`   ✅ Trouvé: ${ncWorkflow.name} (${ncWorkflow.id})`);
    
    // 2. Récupérer les détails
    console.log('\n2. Récupération des détails...');
    const detailRes = await axios.get(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const workflow = detailRes.data;
    console.log(`   Noeuds: ${workflow.nodes?.length}`);
    
    // 3. Trouver et supprimer le noeud Respond to Webhook
    const respondNodeIndex = workflow.nodes?.findIndex(n => 
      n.type === 'n8n-nodes-base.respondToWebhook' ||
      n.name?.toLowerCase().includes('respond')
    );
    
    if (respondNodeIndex >= 0) {
      const respondNode = workflow.nodes[respondNodeIndex];
      console.log(`\n3. Suppression du noeud: ${respondNode.name}`);
      
      // Supprimer le noeud
      workflow.nodes.splice(respondNodeIndex, 1);
      
      // Supprimer les connexions
      for (const [nodeName, connections] of Object.entries(workflow.connections || {})) {
        if (connections.main) {
          connections.main = connections.main.map(connArray => 
            connArray ? connArray.filter(conn => conn.node !== respondNode.name) : []
          );
        }
      }
      delete workflow.connections[respondNode.name];
      
      console.log('   ✅ Noeud supprimé');
    } else {
      console.log('\n3. Pas de noeud "Respond to Webhook" trouvé');
    }
    
    // 4. Désactiver le workflow
    console.log('\n4. Désactivation...');
    try {
      await axios.post(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}/deactivate`, {}, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      console.log('   ✅ Désactivé');
    } catch(e) {}
    
    await new Promise(r => setTimeout(r, 2000));
    
    // 5. Mettre à jour le workflow
    console.log('\n5. Mise à jour du workflow...');
    await axios.put(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}`, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {}
    }, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    console.log('   ✅ Mis à jour');
    
    await new Promise(r => setTimeout(r, 2000));
    
    // 6. Activer le workflow
    console.log('\n6. Activation...');
    await axios.post(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}/activate`, {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    console.log('   ✅ Activé');
    
    // 7. Attendre et tester
    console.log('\n7. Attente (10s) et test du webhook...');
    await new Promise(r => setTimeout(r, 10000));
    
    const webhookNode = workflow.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
    const webhookPath = webhookNode?.parameters?.path;
    
    if (webhookPath) {
      const testUrl = `${N8N_URL}/webhook/${webhookPath}`;
      console.log(`   URL: ${testUrl}`);
      
      try {
        const testRes = await axios.post(testUrl, { 
          test: true,
          folders: ['/test']
        }, { timeout: 15000 });
        console.log(`   ✅ SUCCESS! Status: ${testRes.status}`);
      } catch(e) {
        console.log(`   ❌ Erreur: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
      }
    }
    
    console.log('\n🎉 Workflow corrigé! Reteste le tri.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
})();

