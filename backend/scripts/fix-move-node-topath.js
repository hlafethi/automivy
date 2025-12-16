require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    console.log('🔧 Correction du noeud Move/Rename File Nextcloud...\n');
    
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
    
    // 3. Corriger le noeud Move/Rename
    workflow.nodes = workflow.nodes.map(node => {
      if (node.name === 'Move/Rename File Nextcloud' || 
          (node.type === 'n8n-nodes-base.nextCloud' && node.parameters?.operation === 'move')) {
        
        console.log('\n✏️  Correction Move/Rename File Nextcloud');
        console.log('   Avant:');
        console.log('     path:', node.parameters?.path);
        console.log('     newPath:', node.parameters?.newPath);
        console.log('     toPath:', node.parameters?.toPath);
        
        // Le noeud Nextcloud utilise "path" pour source et "newPath" ou "toPath" pour destination
        node.parameters = {
          resource: 'file',
          operation: 'move',
          path: '={{ $json.sourcePath || $json.originalFilename || $json.filename }}',
          newPath: '={{ $json.newPath || $json.destinationPath || "/Triés/" + $json.newFilename }}'
        };
        
        console.log('   Après:');
        console.log('     path:', node.parameters.path);
        console.log('     newPath:', node.parameters.newPath);
      }
      
      return node;
    });
    
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
    
    // 7. Attendre
    console.log('\n7. Attente (8s)...');
    await new Promise(r => setTimeout(r, 8000));
    
    // Vérifier
    const verifyRes = await axios.get(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const moveNode = verifyRes.data.nodes?.find(n => n.name === 'Move/Rename File Nextcloud');
    console.log('\n📋 Vérification:');
    console.log('   path:', moveNode?.parameters?.path);
    console.log('   newPath:', moveNode?.parameters?.newPath);
    
    console.log('\n🎉 Reteste le tri!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
})();

