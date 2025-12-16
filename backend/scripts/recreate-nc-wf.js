require('dotenv').config();
const axios = require('axios');
const db = require('../database');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    const OLD_WF_ID = 'cqpuGBrioJob3y6h';
    const webhookPath = 'nextcloud-sort';
    
    // 1. Supprimer ancien workflow
    console.log('1. Suppression ancien workflow...');
    try {
      await axios.delete(N8N_URL + '/api/v1/workflows/' + OLD_WF_ID, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      console.log('   OK');
    } catch(e) {
      console.log('   Deja supprime ou erreur:', e.message);
    }
    
    // 2. Creer nouveau workflow simple
    console.log('\n2. Creation nouveau workflow...');
    
    const simpleWorkflow = {
      name: 'Nextcloud File Sort',
      nodes: [
        {
          id: 'webhook',
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          position: [250, 300],
          parameters: {
            path: webhookPath,
            httpMethod: 'POST',
            responseMode: 'onReceived',
            responseCode: 200,
            responseData: 'allEntries'
          },
          webhookId: 'nc-wh-' + Date.now()
        },
        {
          id: 'code',
          name: 'Process',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [500, 300],
          parameters: {
            jsCode: 'return items.map(item => ({ json: { received: true, folders: item.json.folders } }));'
          }
        }
      ],
      connections: {
        'Webhook': {
          main: [[{ node: 'Process', type: 'main', index: 0 }]]
        }
      },
      settings: {
        executionOrder: 'v1'
      }
    };
    
    const createRes = await axios.post(N8N_URL + '/api/v1/workflows', simpleWorkflow, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const newWfId = createRes.data.id;
    console.log('   Nouveau workflow ID:', newWfId);
    
    // 3. Activer
    console.log('\n3. Activation...');
    await axios.post(N8N_URL + '/api/v1/workflows/' + newWfId + '/activate', {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    console.log('   OK');
    
    // 4. Attendre
    console.log('\n4. Attente 3 secondes...');
    await new Promise(r => setTimeout(r, 3000));
    
    // 5. Test webhook
    console.log('\n5. Test webhook...');
    const testUrl = N8N_URL + '/webhook/' + webhookPath;
    console.log('   URL:', testUrl);
    
    try {
      const testRes = await axios.post(testUrl, { folders: ['/test'] }, { timeout: 10000 });
      console.log('   SUCCESS! Status:', testRes.status);
      console.log('   Response:', JSON.stringify(testRes.data));
    } catch(e) {
      console.log('   Error:', e.response?.status, e.response?.data?.message || e.message);
    }
    
    // 6. Mettre a jour DB
    console.log('\n6. Mise a jour DB...');
    await db.query(
      "UPDATE user_workflows SET n8n_workflow_id = $1, webhook_path = $2 WHERE name ILIKE '%nextcloud%'",
      [newWfId, webhookPath]
    );
    console.log('   OK');
    
    console.log('\nNouveau webhook URL:', testUrl);
    
  } catch(e) {
    console.log('Erreur:', e.response?.data || e.message);
  }
})();
