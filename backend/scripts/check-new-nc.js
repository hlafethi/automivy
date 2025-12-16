require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    const res = await axios.get(N8N_URL + '/api/v1/workflows', { 
      headers: { 'X-N8N-API-KEY': N8N_API_KEY } 
    });
    
    const wfs = (res.data.data || res.data).filter(w => 
      w.name.toLowerCase().includes('nextcloud')
    );
    
    console.log('Workflows Nextcloud:');
    for (const w of wfs) {
      console.log('\nID:', w.id);
      console.log('Name:', w.name);
      console.log('Active:', w.active);
      
      // Get details
      const detail = await axios.get(N8N_URL + '/api/v1/workflows/' + w.id, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      
      const webhook = detail.data.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
      console.log('Webhook path:', webhook?.parameters?.path || 'NON TROUVE');
      
      // Activate if not active
      if (!w.active) {
        console.log('-> Activation...');
        await axios.post(N8N_URL + '/api/v1/workflows/' + w.id + '/activate', {}, {
          headers: { 'X-N8N-API-KEY': N8N_API_KEY }
        });
        console.log('-> ACTIVE!');
      }
    }
    
    if (wfs.length === 0) {
      console.log('Aucun workflow Nextcloud!');
    }
    
  } catch(e) {
    console.log('Erreur:', e.response?.data || e.message);
  }
})();
