require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const WF_ID = 'UwFhNr7w2uSAtYue';
const NC_CRED_ID = 'ed8NsaGIJmCRczNm';
const NC_CRED_NAME = 'Nextcloud - abfe0261';

(async () => {
  try {
    // 1. Desactiver workflow
    console.log('1. Desactivation...');
    try {
      await axios.post(N8N_URL + '/api/v1/workflows/' + WF_ID + '/deactivate', {}, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
    } catch(e) {}
    
    // 2. Creer workflow complet
    console.log('2. Mise a jour workflow...');
    
    const fullWorkflow = {
      name: 'Nextcloud File Sort',
      nodes: [
        {
          id: 'webhook',
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
          id: 'list-files',
          name: 'List Files',
          type: 'n8n-nodes-base.nextCloud',
          typeVersion: 1,
          position: [350, 300],
          parameters: {
            resource: 'folder',
            operation: 'list',
            path: '={{ $json.folders[0] || "/" }}'
          },
          credentials: {
            nextCloudApi: { id: NC_CRED_ID, name: NC_CRED_NAME }
          }
        },
        {
          id: 'organize',
          name: 'Organize Files',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [600, 300],
          parameters: {
            jsCode: 'const items = $input.all(); const results = []; for (const item of items) { const fileName = item.json.name || ""; const path = item.json.path || ""; const ext = fileName.split(".").pop()?.toLowerCase() || ""; let destFolder = "/Tries/Autres"; if (["jpg","jpeg","png","gif","webp","bmp"].includes(ext)) destFolder = "/Tries/Images"; else if (["mp4","avi","mov","mkv","webm"].includes(ext)) destFolder = "/Tries/Videos"; else if (["pdf","doc","docx","xls","xlsx","ppt","pptx"].includes(ext)) destFolder = "/Tries/Documents"; else if (["mp3","wav","flac","aac","ogg"].includes(ext)) destFolder = "/Tries/Audio"; else if (["zip","rar","7z","tar","gz"].includes(ext)) destFolder = "/Tries/Archives"; results.push({ json: { sourcePath: path, destPath: destFolder + "/" + fileName, fileName, extension: ext } }); } return results;'
          }
        },
        {
          id: 'move-files',
          name: 'Move Files',
          type: 'n8n-nodes-base.nextCloud',
          typeVersion: 1,
          position: [850, 300],
          parameters: {
            resource: 'file',
            operation: 'move',
            path: '={{ $json.sourcePath }}',
            toPath: '={{ $json.destPath }}'
          },
          credentials: {
            nextCloudApi: { id: NC_CRED_ID, name: NC_CRED_NAME }
          }
        }
      ],
      connections: {
        'Webhook': { main: [[{ node: 'List Files', type: 'main', index: 0 }]] },
        'List Files': { main: [[{ node: 'Organize Files', type: 'main', index: 0 }]] },
        'Organize Files': { main: [[{ node: 'Move Files', type: 'main', index: 0 }]] }
      },
      settings: { executionOrder: 'v1' }
    };
    
    await axios.put(N8N_URL + '/api/v1/workflows/' + WF_ID, fullWorkflow, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    console.log('   OK');
    
    // 3. Reactiver
    console.log('3. Reactivation...');
    await axios.post(N8N_URL + '/api/v1/workflows/' + WF_ID + '/activate', {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    // 4. Test
    console.log('4. Attente et test...');
    await new Promise(r => setTimeout(r, 3000));
    
    try {
      const testRes = await axios.post(N8N_URL + '/webhook/nextcloud-sort', { folders: ['/test'] }, { timeout: 10000 });
      console.log('   SUCCESS! Webhook OK');
    } catch(e) {
      console.log('   Error:', e.response?.status, e.response?.data?.message || e.message);
    }
    
    console.log('\nWorkflow complet actif!');
    
  } catch(e) {
    console.log('Erreur:', e.response?.data || e.message);
  }
})();
