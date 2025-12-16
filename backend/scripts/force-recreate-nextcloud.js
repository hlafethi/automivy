require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');
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

// Nouveau webhook path unique
const NEW_WEBHOOK_PATH = 'nc-tri-' + Date.now();

(async () => {
  try {
    console.log('🔧 Recréation forcée du workflow Nextcloud...\n');
    
    // 1. Trouver et récupérer le workflow existant
    console.log('1. Recherche du workflow existant...');
    const wfsRes = await axios.get(`${N8N_URL}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const workflows = wfsRes.data.data || wfsRes.data;
    const ncWorkflow = workflows.find(w => 
      w.name.toLowerCase().includes('nextcloud')
    );
    
    if (!ncWorkflow) {
      console.log('❌ Aucun workflow Nextcloud trouvé');
      return;
    }
    
    console.log(`   Trouvé: ${ncWorkflow.name} (${ncWorkflow.id})`);
    
    // 2. Récupérer les détails complets
    console.log('\n2. Récupération des détails...');
    const detailRes = await axios.get(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const workflowData = detailRes.data;
    
    // 3. Modifier le webhook path
    console.log('\n3. Modification du webhook path...');
    console.log(`   Nouveau path: ${NEW_WEBHOOK_PATH}`);
    
    const webhookNode = workflowData.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
    if (webhookNode) {
      webhookNode.parameters.path = NEW_WEBHOOK_PATH;
      webhookNode.webhookId = 'nc-wh-' + Date.now();
    }
    
    // 4. Supprimer l'ancien workflow
    console.log('\n4. Suppression de l\'ancien workflow...');
    try {
      await axios.delete(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      console.log('   ✅ Supprimé');
    } catch(e) {
      console.log('   ⚠️  Erreur suppression:', e.message);
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // 5. Créer le nouveau workflow
    console.log('\n5. Création du nouveau workflow...');
    const createRes = await axios.post(`${N8N_URL}/api/v1/workflows`, {
      name: workflowData.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: workflowData.settings || { executionOrder: 'v1' }
    }, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const newWorkflowId = createRes.data.id;
    console.log(`   ✅ Créé: ${newWorkflowId}`);
    
    // 6. Activer
    console.log('\n6. Activation...');
    await axios.post(`${N8N_URL}/api/v1/workflows/${newWorkflowId}/activate`, {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    console.log('   ✅ Activé');
    
    // 7. Attendre
    console.log('\n7. Attente de l\'enregistrement du webhook (10s)...');
    await new Promise(r => setTimeout(r, 10000));
    
    // 8. Mettre à jour la DB
    console.log('\n8. Mise à jour de la base de données...');
    const dbResult = await pool.query(`
      UPDATE user_workflows 
      SET n8n_workflow_id = $1, webhook_path = $2 
      WHERE name ILIKE '%nextcloud%' 
      RETURNING id, name
    `, [newWorkflowId, NEW_WEBHOOK_PATH]);
    
    dbResult.rows.forEach(row => {
      console.log(`   ✅ ${row.name}`);
    });
    
    // 9. Test
    console.log('\n9. Test du webhook...');
    const testUrl = `${N8N_URL}/webhook/${NEW_WEBHOOK_PATH}`;
    console.log(`   URL: ${testUrl}`);
    
    try {
      const testRes = await axios.post(testUrl, {
        test: true,
        folders: ['/test']
      }, { timeout: 15000 });
      console.log(`   ✅ SUCCESS! Status: ${testRes.status}`);
    } catch(e) {
      console.log(`   ❌ Erreur: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📡 NOUVELLE URL WEBHOOK:');
    console.log(`   ${testUrl}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  } finally {
    await pool.end();
  }
})();

