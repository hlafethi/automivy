require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password
});

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const WEBHOOK_PATH = 'nextcloud-tri';

(async () => {
  try {
    console.log('🔧 Recréation complète du workflow Nextcloud...\n');
    
    // 1. Supprimer les anciens workflows Nextcloud
    console.log('1. Suppression des anciens workflows Nextcloud...');
    const wfsRes = await axios.get(`${N8N_URL}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const workflows = wfsRes.data.data || wfsRes.data;
    const ncWorkflows = workflows.filter(w => 
      w.name.toLowerCase().includes('nextcloud') || 
      w.name.toLowerCase().includes('nc sort') ||
      w.name.toLowerCase().includes('tri nc') ||
      w.name.toLowerCase().includes('file sort')
    );
    
    for (const wf of ncWorkflows) {
      console.log(`   Suppression: ${wf.name} (${wf.id})`);
      try {
        await axios.delete(`${N8N_URL}/api/v1/workflows/${wf.id}`, {
          headers: { 'X-N8N-API-KEY': N8N_API_KEY }
        });
      } catch(e) {
        console.log(`   ⚠️  Échec suppression: ${e.message}`);
      }
    }
    
    // 2. Créer un nouveau workflow
    console.log('\n2. Création du nouveau workflow...');
    const newWorkflow = {
      name: 'Nextcloud Tri Fichiers',
      nodes: [
        {
          id: 'webhook-trigger',
          name: 'Webhook Trigger',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          position: [200, 300],
          parameters: {
            path: WEBHOOK_PATH,
            httpMethod: 'POST',
            responseMode: 'onReceived',
            responseCode: 200,
            responseData: 'allEntries'
          },
          webhookId: 'nc-webhook-' + Date.now()
        },
        {
          id: 'code-process',
          name: 'Process Folders',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [450, 300],
          parameters: {
            jsCode: `
// Log des données reçues
const input = $input.all();
console.log('Données reçues:', JSON.stringify(input, null, 2));

// Retourner les données pour le prochain noeud
return input.map(item => ({
  json: {
    success: true,
    folders: item.json.folders || [],
    triggeredBy: item.json.triggeredBy || 'unknown',
    timestamp: new Date().toISOString()
  }
}));
`
          }
        }
      ],
      connections: {
        'Webhook Trigger': {
          main: [[{ node: 'Process Folders', type: 'main', index: 0 }]]
        }
      },
      settings: {
        executionOrder: 'v1'
      }
    };
    
    const createRes = await axios.post(`${N8N_URL}/api/v1/workflows`, newWorkflow, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const newWorkflowId = createRes.data.id;
    console.log(`   ✅ Workflow créé: ${newWorkflowId}`);
    
    // 3. Activer le workflow
    console.log('\n3. Activation du workflow...');
    await axios.post(`${N8N_URL}/api/v1/workflows/${newWorkflowId}/activate`, {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    console.log('   ✅ Activé!');
    
    // Attendre que n8n enregistre le webhook
    console.log('\n4. Attente de l\'enregistrement du webhook (10s)...');
    await new Promise(r => setTimeout(r, 10000));
    
    // 5. Mettre à jour la base de données
    console.log('\n5. Mise à jour de la base de données...');
    const dbResult = await pool.query(`
      UPDATE user_workflows 
      SET n8n_workflow_id = $1, webhook_path = $2 
      WHERE name ILIKE '%nextcloud%' 
      RETURNING id, name
    `, [newWorkflowId, WEBHOOK_PATH]);
    
    dbResult.rows.forEach(row => {
      console.log(`   ✅ ${row.name}`);
    });
    
    // 6. Tester le webhook
    console.log('\n6. Test du webhook...');
    const testUrl = `${N8N_URL}/webhook/${WEBHOOK_PATH}`;
    console.log(`   URL: ${testUrl}`);
    
    try {
      const testRes = await axios.post(testUrl, {
        test: true,
        folders: ['/test/folder'],
        triggeredBy: 'recreate-script'
      }, { timeout: 15000 });
      
      console.log(`   ✅ SUCCESS! Status: ${testRes.status}`);
      console.log(`   Réponse:`, JSON.stringify(testRes.data).substring(0, 100));
    } catch(e) {
      console.log(`   ❌ Erreur: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📡 NOUVELLE URL WEBHOOK:');
    console.log(`   ${testUrl}`);
    console.log('='.repeat(50));
    console.log('\n🎉 Reteste maintenant le tri depuis l\'application!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  } finally {
    await pool.end();
  }
})();

