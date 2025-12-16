require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    console.log('🔍 Liste de tous les workflows n8n...\n');
    
    const wfsRes = await axios.get(N8N_URL + '/api/v1/workflows', {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const workflows = wfsRes.data.data || wfsRes.data;
    
    for (const wf of workflows) {
      const detail = await axios.get(N8N_URL + '/api/v1/workflows/' + wf.id, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      
      const webhook = detail.data.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
      
      console.log(`📋 ${wf.name}`);
      console.log(`   ID: ${wf.id}`);
      console.log(`   Active: ${wf.active}`);
      if (webhook) {
        console.log(`   Webhook path: ${webhook.parameters?.path}`);
        console.log(`   URL: ${N8N_URL}/webhook/${webhook.parameters?.path}`);
      } else {
        console.log(`   Pas de webhook`);
      }
      console.log('');
    }
    
  } catch(e) {
    console.log('❌ Erreur:', e.response?.data || e.message);
  }
})();

