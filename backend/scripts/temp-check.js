require('dotenv').config();
const axios = require('axios');
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    const res = await axios.get(N8N_URL + '/api/v1/workflows', { headers: { 'X-N8N-API-KEY': N8N_API_KEY } });
    const wfs = res.data.data || res.data;
    const nc = wfs.find(w => w.name.toLowerCase().includes('nextcloud'));
    if (nc) {
      console.log('ID:', nc.id);
      const detail = await axios.get(N8N_URL + '/api/v1/workflows/' + nc.id, { headers: { 'X-N8N-API-KEY': N8N_API_KEY } });
      console.log('NODES:', JSON.stringify(detail.data.nodes.map(n => ({name: n.name, type: n.type}))));
      console.log('CONN:', JSON.stringify(detail.data.connections));
    }
  } catch(e) { console.error(e.message); }
})();
