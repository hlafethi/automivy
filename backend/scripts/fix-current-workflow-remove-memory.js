require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    console.log('🔧 Suppression des noeuds problématiques du workflow n8n...\n');
    
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
    console.log(`   Noeuds avant: ${workflow.nodes?.length}`);
    
    // 3. Supprimer les noeuds problématiques
    const nodesToRemove = [];
    
    workflow.nodes = workflow.nodes?.filter(node => {
      const isMemory = node.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow' ||
                       node.name?.toLowerCase().includes('buffer window memory') ||
                       node.name?.toLowerCase().includes('memory');
      
      const isCalculator = node.type === '@n8n/n8n-nodes-langchain.toolCalculator' ||
                           node.name?.toLowerCase().includes('calculator');
      
      if (isMemory || isCalculator) {
        nodesToRemove.push(node.name);
        console.log(`   🗑️  Suppression: ${node.name}`);
        return false;
      }
      return true;
    });
    
    // 4. Nettoyer les connexions
    for (const nodeName of nodesToRemove) {
      // Supprimer les connexions vers ce noeud
      for (const [sourceNode, connections] of Object.entries(workflow.connections || {})) {
        if (connections.main) {
          connections.main = connections.main.map(connArray => 
            connArray ? connArray.filter(conn => conn.node !== nodeName) : []
          );
        }
      }
      // Supprimer les connexions depuis ce noeud
      delete workflow.connections[nodeName];
    }
    
    console.log(`   Noeuds après: ${workflow.nodes?.length}`);
    
    if (nodesToRemove.length === 0) {
      console.log('\n✅ Aucun noeud à supprimer');
      return;
    }
    
    // 5. Désactiver
    console.log('\n4. Désactivation...');
    try {
      await axios.post(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}/deactivate`, {}, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
    } catch(e) {}
    
    await new Promise(r => setTimeout(r, 2000));
    
    // 6. Mettre à jour
    console.log('5. Mise à jour...');
    await axios.put(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}`, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {}
    }, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    // 7. Réactiver
    console.log('6. Réactivation...');
    await axios.post(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}/activate`, {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    console.log('\n✅ Workflow mis à jour!');
    console.log('   Les noeuds Buffer Window Memory et Calculator Tool ont été supprimés.');
    console.log('\n🎉 Reteste le tri!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
})();

