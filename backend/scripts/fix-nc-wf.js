require('dotenv').config();
const axios = require('axios');
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    const res = await axios.get(N8N_URL + '/api/v1/workflows/MsGQuonehgD0pG1W', { 
      headers: { 'X-N8N-API-KEY': N8N_API_KEY } 
    });
    
    const wf = res.data;
    
    // Get actual node names
    console.log('Noms des noeuds:');
    wf.nodes.forEach(n => console.log(' -', n.name));
    
    // Build connections using actual node names
    const nodeNames = {};
    wf.nodes.forEach(n => {
      const baseName = n.name.replace(/\d+$/, '').trim();
      nodeNames[baseName] = n.name;
    });
    
    console.log('\nCorrection des connexions...');
    
    // Fix connections with actual names
    wf.connections = {
      [nodeNames['Webhook Trigger'] || 'Webhook Trigger1']: {
        "main": [[{"node": nodeNames['Set Target Folder'] || 'Set Target Folder1', "type": "main", "index": 0}]]
      },
      [nodeNames['Set Target Folder'] || 'Set Target Folder1']: {
        "main": [[{"node": nodeNames['List Files Nextcloud'] || 'List Files Nextcloud1', "type": "main", "index": 0}]]
      },
      [nodeNames['List Files Nextcloud'] || 'List Files Nextcloud1']: {
        "main": [[{"node": nodeNames['Loop Over Files'] || 'Loop Over Files1', "type": "main", "index": 0}]]
      },
      [nodeNames['Loop Over Files'] || 'Loop Over Files1']: {
        "main": [
          [{"node": nodeNames['Download File Nextcloud'] || 'Download File Nextcloud1', "type": "main", "index": 0}],
          [{"node": nodeNames['Respond to Webhook'] || 'Respond to Webhook1', "type": "main", "index": 0}]
        ]
      },
      [nodeNames['Download File Nextcloud'] || 'Download File Nextcloud1']: {
        "main": [[{"node": nodeNames['AI Agent'] || 'AI Agent1', "type": "main", "index": 0}]]
      },
      [nodeNames['OpenRouter Chat Model'] || 'OpenRouter Chat Model1']: {
        "ai_languageModel": [[{"node": nodeNames['AI Agent'] || 'AI Agent1', "type": "ai_languageModel", "index": 0}]]
      },
      [nodeNames['Calculator Tool'] || 'Calculator Tool1']: {
        "ai_tool": [[{"node": nodeNames['AI Agent'] || 'AI Agent1', "type": "ai_tool", "index": 0}]]
      },
      [nodeNames['Buffer Window Memory'] || 'Buffer Window Memory1']: {
        "ai_memory": [[{"node": nodeNames['AI Agent'] || 'AI Agent1', "type": "ai_memory", "index": 0}]]
      },
      [nodeNames['AI Agent'] || 'AI Agent1']: {
        "main": [[{"node": nodeNames['Parse AI Response'] || 'Parse AI Response1', "type": "main", "index": 0}]]
      },
      [nodeNames['Parse AI Response'] || 'Parse AI Response1']: {
        "main": [[{"node": nodeNames['Move/Rename File Nextcloud'] || 'Move/Rename File Nextcloud1', "type": "main", "index": 0}]]
      },
      [nodeNames['Move/Rename File Nextcloud'] || 'Move/Rename File Nextcloud1']: {
        "main": [[{"node": nodeNames['Loop Over Files'] || 'Loop Over Files1', "type": "main", "index": 0}]]
      }
    };
    
    const updatePayload = {
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings
    };
    
    await axios.put(
      N8N_URL + '/api/v1/workflows/MsGQuonehgD0pG1W',
      updatePayload,
      { headers: { 'X-N8N-API-KEY': N8N_API_KEY } }
    );
    
    console.log('Workflow corrige! Rafraichis n8n.');
    
  } catch(e) { 
    console.error('Error:', e.response?.data || e.message); 
  }
})();
