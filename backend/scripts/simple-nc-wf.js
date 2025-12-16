require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const WF_ID = 'UwFhNr7w2uSAtYue';

(async () => {
  try {
    // Desactiver
    console.log('1. Desactivation...');
    try {
      await axios.post(N8N_URL + '/api/v1/workflows/' + WF_ID + '/deactivate', {}, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
    } catch(e) {}
    
    // Workflow ULTRA simple
    console.log('2. Workflow simple...');
    
    const simpleWf = {
      name: 'Nextcloud File Sort',
      nodes: [
        {
          id: 'wh1',
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          position: [100, 300],
          parameters: {
            path: 'nextcloud-sort',
            httpMethod: 'POST',
            responseMode: 'onReceived',
            responseCode: 200
          }
        },
        {
          id: 'code1',
          name: 'Log',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [350, 300],
          parameters: {
            jsCode: 'console.log("Received:", JSON.stringify($input.all())); return $input.all();'
          }
        }
      ],
      connections: {
        'Webhook': { main: [[{ node: 'Log', type: 'main', index: 0 }]] }
      },
      settings: { executionOrder: 'v1' }
    };
    
    await axios.put(N8N_URL + '/api/v1/workflows/' + WF_ID, simpleWf, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    console.log('   OK');
    
    // Reactiver
    console.log('3. Reactivation...');
    await axios.post(N8N_URL + '/api/v1/workflows/' + WF_ID + '/activate', {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    // Test
    console.log('4. Test...');
    await new Promise(r => setTimeout(r, 3000));
    
    try {
      const res = await axios.post(N8N_URL + '/webhook/nextcloud-sort', { folders: ['/test'] }, { timeout: 10000 });
      console.log('   SUCCESS:', res.status);
    } catch(e) {
      console.log('   Error:', e.response?.status, e.response?.data?.message || e.message);
    }
    
  } catch(e) {
    console.log('Erreur:', e.response?.data || e.message);
  }
})();
