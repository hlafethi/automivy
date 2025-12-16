require('dotenv').config();
const axios = require('axios');
const db = require('../database');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  try {
    // 1. Get Nextcloud credentials from DB
    console.log('1. Recuperation credentials Nextcloud depuis DB...');
    const ncResult = await db.query("SELECT * FROM nextcloud_credentials ORDER BY created_at DESC LIMIT 1");
    
    if (ncResult.rows.length === 0) {
      console.log('Pas de credentials Nextcloud en DB!');
      console.log('Tu dois redeployer le workflow avec tes credentials.');
      return;
    }
    
    const nc = ncResult.rows[0];
    console.log('   URL:', nc.nextcloud_url);
    console.log('   User:', nc.nextcloud_username);
    
    // 2. Create credential in n8n
    console.log('\n2. Creation credential dans n8n...');
    
    const webDavUrl = nc.nextcloud_url.replace(/\/$/, '') + '/remote.php/dav/files/' + nc.nextcloud_username + '/';
    
    const credPayload = {
      name: 'Nextcloud - ' + nc.nextcloud_username,
      type: 'nextCloudApi',
      data: {
        webDavUrl: webDavUrl,
        user: nc.nextcloud_username,
        password: nc.nextcloud_password
      }
    };
    
    let credId;
    try {
      const credRes = await axios.post(N8N_URL + '/api/v1/credentials', credPayload, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      credId = credRes.data.id;
      console.log('   Credential cree! ID:', credId);
    } catch(e) {
      console.log('   Erreur:', e.response?.data?.message || e.message);
      return;
    }
    
    // 3. Update workflow with new credential
    console.log('\n3. Mise a jour du workflow...');
    
    const wfRes = await axios.get(N8N_URL + '/api/v1/workflows/MsGQuonehgD0pG1W', {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const wf = wfRes.data;
    
    wf.nodes = wf.nodes.map(node => {
      if (node.type === 'n8n-nodes-base.nextCloud') {
        node.credentials = {
          nextCloudApi: {
            id: credId,
            name: 'Nextcloud - ' + nc.nextcloud_username
          }
        };
        console.log('   Updated:', node.name);
      }
      return node;
    });
    
    await axios.put(N8N_URL + '/api/v1/workflows/MsGQuonehgD0pG1W', {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings
    }, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    // 4. Reactivate
    console.log('\n4. Reactivation...');
    await axios.post(N8N_URL + '/api/v1/workflows/MsGQuonehgD0pG1W/activate', {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    console.log('\nTermine! Reteste maintenant.');
    
  } catch(e) {
    console.log('Erreur:', e.response?.data || e.message);
  }
}

fix();
