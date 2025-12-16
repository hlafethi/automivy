require('dotenv').config();
const axios = require('axios');
const db = require('../database');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fixN8nWorkflow() {
  try {
    // 1. Recuperer les credentials Nextcloud de la base
    console.log('1. Recuperation credentials depuis DB...');
    const ncCreds = await db.query("SELECT * FROM nextcloud_credentials LIMIT 1");
    
    if (ncCreds.rows.length === 0) {
      console.log('Pas de credentials Nextcloud en DB. Utilisation des valeurs par defaut.');
    }
    
    const cred = ncCreds.rows[0];
    console.log('Credentials trouves:', cred ? cred.nextcloud_url : 'Aucun');
    
    // 2. Creer le credential dans n8n
    console.log('\n2. Creation credential dans n8n...');
    
    let newCredId;
    try {
      const credData = {
        name: 'Nextcloud User',
        type: 'nextCloudApi',
        data: {
          webDavUrl: cred ? cred.nextcloud_url + '/remote.php/dav/files/' + cred.nextcloud_username + '/' : 'https://example.com/remote.php/dav/files/user/',
          user: cred ? cred.nextcloud_username : 'user',
          password: cred ? cred.nextcloud_password : 'password'
        }
      };
      
      const createRes = await axios.post(N8N_URL + '/api/v1/credentials', credData, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      
      newCredId = createRes.data.id;
      console.log('Credential cree avec ID:', newCredId);
    } catch (e) {
      console.log('Erreur creation credential:', e.response?.data?.message || e.message);
      // Essayer de trouver un credential existant
      const existingCreds = await axios.get(N8N_URL + '/api/v1/credentials', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      const ncCred = (existingCreds.data.data || existingCreds.data).find(c => c.type === 'nextCloudApi');
      if (ncCred) {
        newCredId = ncCred.id;
        console.log('Utilisation credential existant:', newCredId);
      }
    }
    
    if (!newCredId) {
      console.log('Impossible de creer ou trouver un credential Nextcloud');
      return;
    }
    
    // 3. Mettre a jour le workflow dans n8n
    console.log('\n3. Mise a jour du workflow dans n8n...');
    
    const wfRes = await axios.get(N8N_URL + '/api/v1/workflows/MsGQuonehgD0pG1W', {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const wf = wfRes.data;
    
    // Mettre a jour les credentials des noeuds Nextcloud
    wf.nodes = wf.nodes.map(node => {
      if (node.type === 'n8n-nodes-base.nextCloud') {
        node.credentials = {
          nextCloudApi: {
            id: newCredId,
            name: 'Nextcloud User'
          }
        };
        console.log('Updated credentials for:', node.name);
      }
      return node;
    });
    
    // Sauvegarder
    await axios.put(N8N_URL + '/api/v1/workflows/MsGQuonehgD0pG1W', {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings
    }, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    console.log('\nWorkflow mis a jour!');
    
    // Reactiver
    await axios.post(N8N_URL + '/api/v1/workflows/MsGQuonehgD0pG1W/activate', {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    console.log('Workflow reactive!');
    console.log('\nReteste maintenant!');
    
  } catch(e) {
    console.log('Erreur:', e.response?.data || e.message);
  }
}

fixN8nWorkflow();
