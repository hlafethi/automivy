require('dotenv').config();
const axios = require('axios');

(async () => {
  try {
    const res = await axios.get(process.env.N8N_URL + '/api/v1/workflows', { 
      headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY } 
    });
    
    const wfs = (res.data.data || res.data).filter(w => 
      w.name.toLowerCase().includes('nextcloud')
    );
    
    console.log('Workflows Nextcloud dans n8n:');
    wfs.forEach(w => {
      console.log(' ID:', w.id);
      console.log(' Name:', w.name);
      console.log(' Active:', w.active);
      console.log('');
    });
    
    if (wfs.length === 0) {
      console.log('Aucun workflow Nextcloud trouve dans n8n!');
    }
  } catch(e) {
    console.log('Erreur:', e.message);
  }
})();
