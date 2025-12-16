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

(async () => {
  try {
    console.log('🔧 Synchronisation Nextcloud DB ↔ n8n...\n');
    
    // 1. Trouver le workflow Nextcloud dans n8n
    console.log('1. Recherche du workflow Nextcloud dans n8n...');
    const wfsRes = await axios.get(`${N8N_URL}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const workflows = wfsRes.data.data || wfsRes.data;
    
    // Chercher le workflow Nextcloud (par nom)
    const ncWorkflow = workflows.find(w => 
      w.name.toLowerCase().includes('nextcloud') ||
      w.name.toLowerCase().includes('tri nc') ||
      w.name.toLowerCase().includes('file sort')
    );
    
    if (!ncWorkflow) {
      console.log('❌ Aucun workflow Nextcloud trouvé dans n8n!');
      console.log('   Workflows disponibles:', workflows.map(w => w.name).join(', '));
      return;
    }
    
    console.log(`   ✅ Trouvé: ${ncWorkflow.name} (${ncWorkflow.id})`);
    console.log(`   Active: ${ncWorkflow.active}`);
    
    // 2. Récupérer les détails du workflow pour avoir le webhook path
    console.log('\n2. Récupération du webhook path...');
    const detailRes = await axios.get(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const webhook = detailRes.data.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
    const webhookPath = webhook?.parameters?.path;
    
    if (!webhookPath) {
      console.log('❌ Pas de webhook trouvé dans le workflow!');
      return;
    }
    
    console.log(`   Webhook path: ${webhookPath}`);
    
    // 3. Activer le workflow si pas actif
    if (!ncWorkflow.active) {
      console.log('\n3. Activation du workflow...');
      await axios.post(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}/activate`, {}, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      console.log('   ✅ Activé!');
      await new Promise(r => setTimeout(r, 3000));
    } else {
      console.log('\n3. Workflow déjà actif ✅');
    }
    
    // 4. Mettre à jour la DB
    console.log('\n4. Mise à jour de la base de données...');
    const dbResult = await pool.query(`
      UPDATE user_workflows 
      SET n8n_workflow_id = $1, webhook_path = $2 
      WHERE name ILIKE '%nextcloud%' 
      RETURNING id, name, webhook_path
    `, [ncWorkflow.id, webhookPath]);
    
    if (dbResult.rows.length === 0) {
      console.log('   ⚠️  Aucun workflow Nextcloud dans la DB');
    } else {
      dbResult.rows.forEach(row => {
        console.log(`   ✅ ${row.name}`);
        console.log(`      webhook_path: ${row.webhook_path}`);
      });
    }
    
    // 5. Test du webhook
    console.log('\n5. Test du webhook...');
    const testUrl = `${N8N_URL}/webhook/${webhookPath}`;
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
        console.log('   ⚠️  Webhook 404 - Réactivation nécessaire...');
        
        // Désactiver/Réactiver
        try {
          await axios.post(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}/deactivate`, {}, {
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
          });
          await new Promise(r => setTimeout(r, 2000));
          await axios.post(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}/activate`, {}, {
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
          });
          console.log('   ✅ Réactivé! Attente 5s...');
          await new Promise(r => setTimeout(r, 5000));
          
          // Re-test
          const retestRes = await axios.post(testUrl, { test: true }, { timeout: 15000 });
          console.log(`   ✅ Re-test SUCCESS! Status: ${retestRes.status}`);
        } catch(e2) {
          console.log('   ❌ Échec:', e2.response?.data?.message || e2.message);
        }
      } else {
        console.log(`   ❌ Erreur: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📡 URL WEBHOOK SYNCHRONISÉE:');
    console.log(`   ${testUrl}`);
    console.log('='.repeat(50));
    console.log('\n🎉 Reteste le tri depuis l\'application!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  } finally {
    await pool.end();
  }
})();

