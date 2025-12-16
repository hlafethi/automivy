require('dotenv').config();
const axios = require('axios');
const db = require('../database');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const WF_ID = 'cqpuGBrioJob3y6h';

(async () => {
  try {
    // Nouveau path simple
    const newPath = 'nc-sort-' + Date.now();
    console.log('Nouveau webhook path:', newPath);
    
    // 1. Desactiver
    console.log('\n1. Desactivation...');
    try {
      await axios.post(N8N_URL + '/api/v1/workflows/' + WF_ID + '/deactivate', {}, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
    } catch(e) {}
    
    // 2. Recuperer et modifier
    console.log('2. Modification...');
    const res = await axios.get(N8N_URL + '/api/v1/workflows/' + WF_ID, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const wf = res.data;
    const webhookIdx = wf.nodes.findIndex(n => n.type === 'n8n-nodes-base.webhook');
    if (webhookIdx >= 0) {
      wf.nodes[webhookIdx].parameters.path = newPath;
      wf.nodes[webhookIdx].parameters.responseMode = 'onReceived';
      wf.nodes[webhookIdx].parameters.httpMethod = 'POST';
    }
    
    // 3. Sauvegarder
    console.log('3. Sauvegarde...');
    await axios.put(N8N_URL + '/api/v1/workflows/' + WF_ID, {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings
    }, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    // 4. Reactiver
    console.log('4. Reactivation...');
    await new Promise(r => setTimeout(r, 2000));
    await axios.post(N8N_URL + '/api/v1/workflows/' + WF_ID + '/activate', {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    // 5. Mettre a jour la DB
    console.log('5. Mise a jour DB...');
    await db.query(
      "UPDATE user_workflows SET webhook_path = $1 WHERE n8n_workflow_id = $2",
      [newPath, WF_ID]
    );
    
    // 6. Attendre
    console.log('6. Attente 5 secondes...');
    await new Promise(r => setTimeout(r, 5000));
    
    // 7. Test
    console.log('7. Test webhook...');
    const webhookUrl = N8N_URL + '/webhook/' + newPath;
    console.log('   URL:', webhookUrl);
    try {
      const testRes = await axios.post(webhookUrl, { folders: ['/test'] }, { timeout: 10000 });
      console.log('   SUCCESS:', testRes.status);
    } catch(e) {
      console.log('   Error:', e.response?.status, e.response?.data?.message || e.message);
    }
    
    console.log('\nNouveau webhook:', webhookUrl);
    
  } catch(e) {
    console.log('Erreur:', e.response?.data || e.message);
  }
})();
