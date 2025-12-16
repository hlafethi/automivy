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

// Le workflow "Tri NC" / "NC Sort" dans n8n
const N8N_WORKFLOW_ID = 'xVKL8YcSg24QjPyM';
const WEBHOOK_PATH = 'ncsort';

(async () => {
  try {
    console.log('🔧 Synchronisation du workflow Nextcloud...\n');
    
    // 1. Vérifier que le workflow existe dans n8n
    console.log('1. Vérification du workflow dans n8n...');
    const wfRes = await axios.get(`${N8N_URL}/api/v1/workflows/${N8N_WORKFLOW_ID}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    console.log(`   ✅ Workflow trouvé: ${wfRes.data.name}`);
    console.log(`   Active: ${wfRes.data.active}`);
    
    const webhook = wfRes.data.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
    console.log(`   Webhook path: ${webhook?.parameters?.path}`);
    
    // 2. Activer le workflow si pas actif
    if (!wfRes.data.active) {
      console.log('\n2. Activation du workflow...');
      await axios.post(`${N8N_URL}/api/v1/workflows/${N8N_WORKFLOW_ID}/activate`, {}, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      console.log('   ✅ Activé!');
      await new Promise(r => setTimeout(r, 3000));
    } else {
      console.log('\n2. Workflow déjà actif ✅');
    }
    
    // 3. Mettre à jour la DB
    console.log('\n3. Mise à jour de la base de données...');
    const result = await pool.query(`
      UPDATE user_workflows 
      SET n8n_workflow_id = $1, webhook_path = $2 
      WHERE name ILIKE '%nextcloud%' 
      RETURNING id, name, n8n_workflow_id, webhook_path
    `, [N8N_WORKFLOW_ID, WEBHOOK_PATH]);
    
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.name}`);
      console.log(`      n8n_workflow_id: ${row.n8n_workflow_id}`);
      console.log(`      webhook_path: ${row.webhook_path}`);
    });
    
    // 4. Tester le webhook
    console.log('\n4. Test du webhook...');
    await new Promise(r => setTimeout(r, 2000));
    
    const testUrl = `${N8N_URL}/webhook/${WEBHOOK_PATH}`;
    console.log(`   URL: ${testUrl}`);
    
    try {
      const testRes = await axios.post(testUrl, { 
        test: true, 
        folders: ['/test'],
        triggeredBy: 'sync-script'
      }, { timeout: 15000 });
      console.log(`   ✅ SUCCESS! Status: ${testRes.status}`);
    } catch(e) {
      if (e.response?.status === 404) {
        console.log('   ⚠️  Webhook 404 - Le workflow doit être réactivé dans n8n');
        console.log('   Tentative de réactivation...');
        
        // Désactiver puis réactiver
        try {
          await axios.post(`${N8N_URL}/api/v1/workflows/${N8N_WORKFLOW_ID}/deactivate`, {}, {
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
          });
          await new Promise(r => setTimeout(r, 2000));
          await axios.post(`${N8N_URL}/api/v1/workflows/${N8N_WORKFLOW_ID}/activate`, {}, {
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
          });
          console.log('   ✅ Réactivé!');
          
          await new Promise(r => setTimeout(r, 5000));
          
          // Retester
          const retestRes = await axios.post(testUrl, { test: true }, { timeout: 15000 });
          console.log(`   ✅ Re-test SUCCESS! Status: ${retestRes.status}`);
        } catch(e2) {
          console.log('   ❌ Échec réactivation:', e2.response?.data?.message || e2.message);
        }
      } else {
        console.log(`   ❌ Erreur: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
      }
    }
    
    console.log('\n📡 URL du webhook:');
    console.log(`   ${testUrl}`);
    console.log('\n🎉 Reteste le tri depuis l\'application!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  } finally {
    await pool.end();
  }
})();

