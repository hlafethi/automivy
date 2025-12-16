require('dotenv').config();
const axios = require('axios');
const db = require('../database');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    // 1. Check DB
    console.log('=== BASE DE DONNEES ===');
    const uwResult = await db.query(
      "SELECT * FROM user_workflows WHERE name ILIKE '%nextcloud%' ORDER BY created_at DESC LIMIT 1"
    );
    if (uwResult.rows.length > 0) {
      const uw = uwResult.rows[0];
      console.log('workflow_id:', uw.id);
      console.log('n8n_workflow_id:', uw.n8n_workflow_id);
      console.log('webhook_path:', uw.webhook_path);
    } else {
      console.log('Pas de workflow en DB!');
    }
    
    // 2. Check n8n
    console.log('\n=== N8N ===');
    const wfs = await axios.get(N8N_URL + '/api/v1/workflows', {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const ncWf = (wfs.data.data || wfs.data).find(w => w.name.toLowerCase().includes('nextcloud'));
    if (ncWf) {
      console.log('n8n_id:', ncWf.id);
      console.log('name:', ncWf.name);
      console.log('active:', ncWf.active);
      
      const detail = await axios.get(N8N_URL + '/api/v1/workflows/' + ncWf.id, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      
      const webhook = detail.data.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
      if (webhook) {
        console.log('\nWebhook config:');
        console.log('  path:', webhook.parameters?.path);
        console.log('  httpMethod:', webhook.parameters?.httpMethod);
        console.log('  responseMode:', webhook.parameters?.responseMode);
      }
    }
    
    // 3. Test direct webhook call
    console.log('\n=== TEST DIRECT ===');
    const webhookUrl = N8N_URL + '/webhook/nextcloud-072a5103-8c210030';
    console.log('URL:', webhookUrl);
    
    try {
      const testRes = await axios.post(webhookUrl, { test: true }, { timeout: 5000 });
      console.log('Response:', testRes.status, testRes.data);
    } catch(e) {
      console.log('Error:', e.response?.status, e.response?.data?.message || e.message);
    }
    
  } catch(e) {
    console.log('Erreur:', e.message);
  }
})();
