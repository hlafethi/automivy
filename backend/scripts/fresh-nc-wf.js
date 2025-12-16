require('dotenv').config();
const axios = require('axios');
const db = require('../database');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    // 1. Supprimer TOUS les workflows Nextcloud
    console.log('1. Suppression workflows existants...');
    const wfsRes = await axios.get(N8N_URL + '/api/v1/workflows', {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const ncWfs = (wfsRes.data.data || wfsRes.data).filter(w => 
      w.name.toLowerCase().includes('nextcloud') || w.name.toLowerCase().includes('file sort')
    );
    
    for (const wf of ncWfs) {
      console.log('   Suppression:', wf.id, wf.name);
      try {
        await axios.delete(N8N_URL + '/api/v1/workflows/' + wf.id, {
          headers: { 'X-N8N-API-KEY': N8N_API_KEY }
        });
      } catch(e) {}
    }
    
    // 2. Creer nouveau workflow
    console.log('\n2. Creation nouveau workflow...');
    const newWf = {
      name: 'NC Sort',
      nodes: [
        {
          id: 'w1',
          name: 'W',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          position: [200, 300],
          parameters: {
            path: 'ncsort',
            httpMethod: 'POST',
            responseMode: 'onReceived',
            responseCode: 200
          }
        },
        {
          id: 'c1',
          name: 'C',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [450, 300],
          parameters: {
            jsCode: 'return $input.all();'
          }
        }
      ],
      connections: {
        'W': { main: [[{ node: 'C', type: 'main', index: 0 }]] }
      },
      settings: { executionOrder: 'v1' }
    };
    
    const createRes = await axios.post(N8N_URL + '/api/v1/workflows', newWf, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const newId = createRes.data.id;
    console.log('   ID:', newId);
    
    // 3. Activer
    console.log('\n3. Activation...');
    await axios.post(N8N_URL + '/api/v1/workflows/' + newId + '/activate', {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    // 4. Test
    console.log('\n4. Test (apres 5s)...');
    await new Promise(r => setTimeout(r, 5000));
    
    const testUrl = N8N_URL + '/webhook/ncsort';
    console.log('   URL:', testUrl);
    
    try {
      const res = await axios.post(testUrl, { test: true }, { timeout: 10000 });
      console.log('   SUCCESS:', res.status);
      
      // 5. Mettre a jour DB
      console.log('\n5. Mise a jour DB...');
      await db.query(
        "UPDATE user_workflows SET n8n_workflow_id = $1, webhook_path = $2 WHERE name ILIKE '%nextcloud%'",
        [newId, 'ncsort']
      );
      console.log('   OK');
      
      console.log('\n=== WEBHOOK URL: ' + testUrl + ' ===');
      
    } catch(e) {
      console.log('   Error:', e.response?.status, e.response?.data?.message || e.message);
    }
    
  } catch(e) {
    console.log('Erreur:', e.response?.data || e.message);
  }
})();
