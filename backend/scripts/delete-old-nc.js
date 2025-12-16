require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    console.log('Suppression du workflow Nextcloud ancien dans n8n...');
    
    await axios.delete(N8N_URL + '/api/v1/workflows/MsGQuonehgD0pG1W', {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    console.log('Workflow supprime de n8n!');
    console.log('\nMaintenant:');
    console.log('1. Va dans ton application');
    console.log('2. Deploie le template "Nextcloud File Sorting Automation"');
    console.log('3. Entre tes credentials Nextcloud');
    console.log('\nLe systeme va creer automatiquement le credential et le workflow.');
    
  } catch(e) {
    console.log('Erreur:', e.response?.data?.message || e.message);
  }
})();
