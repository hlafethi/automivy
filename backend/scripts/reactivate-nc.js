require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const WF_ID = 'cqpuGBrioJob3y6h';

(async () => {
  try {
    console.log('1. Desactivation...');
    await axios.post(N8N_URL + '/api/v1/workflows/' + WF_ID + '/deactivate', {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    console.log('   OK');
    
    // Wait 2 seconds
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('2. Reactivation...');
    await axios.post(N8N_URL + '/api/v1/workflows/' + WF_ID + '/activate', {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    console.log('   OK');
    
    console.log('\n3. Verification...');
    const res = await axios.get(N8N_URL + '/api/v1/workflows/' + WF_ID, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    console.log('   Active:', res.data.active);
    
    const webhook = res.data.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
    console.log('   Webhook path:', webhook?.parameters?.path);
    console.log('   Webhook URL:', N8N_URL + '/webhook/' + webhook?.parameters?.path);
    
    console.log('\nReteste maintenant!');
    
  } catch(e) {
    console.log('Erreur:', e.response?.data || e.message);
  }
})();
