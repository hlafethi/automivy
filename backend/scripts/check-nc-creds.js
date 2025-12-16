require('dotenv').config();
const axios = require('axios');

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

(async () => {
  try {
    const detail = await axios.get(N8N_URL + '/api/v1/workflows/cqpuGBrioJob3y6h', {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    console.log('Verification des credentials dans le workflow:\n');
    
    detail.data.nodes?.forEach(node => {
      if (node.type === 'n8n-nodes-base.nextCloud') {
        console.log(node.name + ':');
        console.log('  Credentials:', JSON.stringify(node.credentials));
      }
      if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter') {
        console.log(node.name + ':');
        console.log('  Credentials:', JSON.stringify(node.credentials));
      }
    });
    
    // Check if workflow has issues
    console.log('\nWorkflow active:', detail.data.active);
    
    // Try to get executions
    try {
      const execRes = await axios.get(N8N_URL + '/api/v1/executions?workflowId=cqpuGBrioJob3y6h&limit=5', {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      console.log('\nDernieres executions:', (execRes.data.data || execRes.data).length);
    } catch(e) {
      console.log('Pas d executions');
    }
    
  } catch(e) {
    console.log('Erreur:', e.response?.data || e.message);
  }
})();
