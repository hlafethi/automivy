require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    console.log('🔧 Correction du path dans List Files Nextcloud...\n');
    
    // 1. Trouver le workflow
    const wfsRes = await axios.get(`${N8N_URL}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const workflows = wfsRes.data.data || wfsRes.data;
    const ncWorkflow = workflows.find(w => w.name.toLowerCase().includes('nextcloud'));
    
    if (!ncWorkflow) {
      console.log('❌ Aucun workflow Nextcloud trouvé');
      return;
    }
    
    console.log(`📋 Workflow: ${ncWorkflow.name} (${ncWorkflow.id})`);
    
    // 2. Récupérer les détails
    const detailRes = await axios.get(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const workflow = detailRes.data;
    
    // 3. Corriger les noeuds
    let modified = false;
    
    workflow.nodes = workflow.nodes.map(node => {
      // Corriger List Files Nextcloud
      if (node.name === 'List Files Nextcloud' || 
          (node.type === 'n8n-nodes-base.nextCloud' && node.parameters?.operation === 'list')) {
        console.log('\n✏️  Correction List Files Nextcloud');
        console.log(`   Ancien path: ${node.parameters?.path}`);
        
        node.parameters = {
          ...node.parameters,
          resource: 'file',
          operation: 'list',
          path: '={{ $json.targetFolder || "/" }}'
        };
        
        console.log(`   Nouveau path: ${node.parameters.path}`);
        modified = true;
      }
      
      // Vérifier Move/Rename - s'assurer que newPath est correct
      if (node.name === 'Move/Rename File Nextcloud' ||
          (node.type === 'n8n-nodes-base.nextCloud' && node.parameters?.operation === 'move')) {
        console.log('\n✏️  Vérification Move/Rename File Nextcloud');
        console.log(`   Path: ${node.parameters?.path}`);
        console.log(`   NewPath: ${node.parameters?.newPath}`);
        
        // S'assurer que les paramètres sont corrects
        if (!node.parameters?.newPath || node.parameters?.newPath === '={{ $json.newPath || $json.destinationPath }}') {
          // C'est OK, mais vérifions que le path source est correct
        }
      }
      
      return node;
    });
    
    if (!modified) {
      console.log('\n⚠️  Aucune modification nécessaire');
      return;
    }
    
    // 4. Désactiver
    console.log('\n4. Désactivation...');
    try {
      await axios.post(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}/deactivate`, {}, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
    } catch(e) {}
    
    await new Promise(r => setTimeout(r, 2000));
    
    // 5. Mettre à jour
    console.log('\n5. Mise à jour...');
    await axios.put(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}`, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {}
    }, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    // 6. Réactiver
    console.log('\n6. Réactivation...');
    await axios.post(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}/activate`, {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    console.log('\n✅ Workflow corrigé!');
    
    // 7. Attendre et tester
    console.log('\n7. Attente (8s) et test...');
    await new Promise(r => setTimeout(r, 8000));
    
    const webhookNode = workflow.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
    const webhookPath = webhookNode?.parameters?.path;
    
    if (webhookPath) {
      const testUrl = `${N8N_URL}/webhook/${webhookPath}`;
      try {
        const testRes = await axios.post(testUrl, { 
          test: true, 
          folders: ['/2024'] 
        }, { timeout: 15000 });
        console.log(`   ✅ Webhook OK: ${testRes.status}`);
      } catch(e) {
        console.log(`   ❌ Erreur: ${e.response?.data?.message || e.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
})();

