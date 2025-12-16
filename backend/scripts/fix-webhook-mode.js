require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const WF_ID = 'cqpuGBrioJob3y6h';

(async () => {
  try {
    console.log('1. Recuperation workflow...');
    const res = await axios.get(N8N_URL + '/api/v1/workflows/' + WF_ID, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const wf = res.data;
    
    // Find and fix webhook
    const webhookIdx = wf.nodes.findIndex(n => n.type === 'n8n-nodes-base.webhook');
    if (webhookIdx >= 0) {
      console.log('2. Modification du webhook...');
      // Change responseMode to lastNode (plus simple, pas besoin de Respond to Webhook)
      wf.nodes[webhookIdx].parameters.responseMode = 'lastNode';
      console.log('   responseMode: lastNode');
    }
    
    // Check Respond to Webhook exists
    const respondNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.respondToWebhook');
    console.log('3. Respond to Webhook existe:', !!respondNode);
    
    // Desactiver d abord
    console.log('\n4. Desactivation...');
    try {
      await axios.post(N8N_URL + '/api/v1/workflows/' + WF_ID + '/deactivate', {}, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
    } catch(e) {}
    
    // Sauvegarder
    console.log('5. Sauvegarde...');
    await axios.put(N8N_URL + '/api/v1/workflows/' + WF_ID, {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings
    }, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    // Attendre
    await new Promise(r => setTimeout(r, 3000));
    
    // Reactiver
    console.log('6. Reactivation...');
    await axios.post(N8N_URL + '/api/v1/workflows/' + WF_ID + '/activate', {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    // Attendre que n8n enregistre le webhook
    console.log('7. Attente 5 secondes...');
    await new Promise(r => setTimeout(r, 5000));
    
    // Test
    console.log('8. Test webhook...');
    const webhookUrl = N8N_URL + '/webhook/nextcloud-072a5103-8c210030';
    try {
      const testRes = await axios.post(webhookUrl, { folders: ['/test'] }, { timeout: 10000 });
      console.log('   SUCCESS:', testRes.status);
    } catch(e) {
      console.log('   Error:', e.response?.status, e.response?.data?.message || e.message);
    }
    
  } catch(e) {
    console.log('Erreur:', e.response?.data || e.message);
  }
})();
