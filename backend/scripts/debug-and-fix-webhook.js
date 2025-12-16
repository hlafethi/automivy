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
    console.log('🔍 Diagnostic du problème webhook Nextcloud...\n');
    
    // 1. Trouver le workflow dans n8n
    console.log('1. Recherche du workflow dans n8n...');
    const wfsRes = await axios.get(`${N8N_URL}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const workflows = wfsRes.data.data || wfsRes.data;
    const ncWorkflow = workflows.find(w => w.name.toLowerCase().includes('nextcloud'));
    
    if (!ncWorkflow) {
      console.log('❌ Aucun workflow Nextcloud trouvé dans n8n');
      return;
    }
    
    console.log(`   ✅ Trouvé: ${ncWorkflow.name}`);
    console.log(`   ID: ${ncWorkflow.id}`);
    console.log(`   Active: ${ncWorkflow.active}`);
    
    // 2. Récupérer les détails
    console.log('\n2. Détails du workflow...');
    const detailRes = await axios.get(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const workflow = detailRes.data;
    const webhookNode = workflow.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
    
    if (!webhookNode) {
      console.log('❌ Pas de noeud webhook trouvé!');
      return;
    }
    
    console.log('   Webhook Node:');
    console.log('     Name:', webhookNode.name);
    console.log('     Type:', webhookNode.type);
    console.log('     TypeVersion:', webhookNode.typeVersion);
    console.log('     Path:', webhookNode.parameters?.path);
    console.log('     HttpMethod:', webhookNode.parameters?.httpMethod);
    console.log('     ResponseMode:', webhookNode.parameters?.responseMode);
    console.log('     WebhookId:', webhookNode.webhookId);
    
    // 3. Changer le webhook path en quelque chose de plus simple
    const newWebhookPath = 'nctri' + Date.now().toString().slice(-6);
    console.log(`\n3. Nouveau webhook path: ${newWebhookPath}`);
    
    // Modifier le noeud webhook
    webhookNode.parameters = {
      ...webhookNode.parameters,
      path: newWebhookPath,
      httpMethod: 'POST',
      responseMode: 'onReceived',
      responseCode: 200
    };
    webhookNode.webhookId = 'wh-' + Date.now();
    
    // 4. Désactiver le workflow
    console.log('\n4. Désactivation du workflow...');
    try {
      await axios.post(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}/deactivate`, {}, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      console.log('   ✅ Désactivé');
    } catch(e) {
      console.log('   Déjà désactivé ou erreur');
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    // 5. Mettre à jour le workflow
    console.log('\n5. Mise à jour du workflow avec nouveau webhook path...');
    await axios.put(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}`, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {}
    }, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    console.log('   ✅ Mis à jour');
    
    await new Promise(r => setTimeout(r, 2000));
    
    // 6. Activer le workflow
    console.log('\n6. Activation du workflow...');
    await axios.post(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}/activate`, {}, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    console.log('   ✅ Activé');
    
    // 7. Attendre plus longtemps
    console.log('\n7. Attente de l\'enregistrement du webhook (15s)...');
    await new Promise(r => setTimeout(r, 15000));
    
    // 8. Tester le webhook
    console.log('\n8. Test du webhook...');
    const testUrl = `${N8N_URL}/webhook/${newWebhookPath}`;
    console.log(`   URL: ${testUrl}`);
    
    for (let i = 1; i <= 5; i++) {
      try {
        const testRes = await axios.post(testUrl, { test: true }, { timeout: 10000 });
        console.log(`   ✅ Tentative ${i}: SUCCESS! Status: ${testRes.status}`);
        
        // 9. Mettre à jour la DB
        console.log('\n9. Mise à jour de la base de données...');
        const dbResult = await pool.query(`
          UPDATE user_workflows 
          SET webhook_path = $1 
          WHERE name ILIKE '%nextcloud%' 
          RETURNING id, name, webhook_path
        `, [newWebhookPath]);
        
        dbResult.rows.forEach(row => {
          console.log(`   ✅ ${row.name}: ${row.webhook_path}`);
        });
        
        console.log('\n' + '='.repeat(50));
        console.log('📡 NOUVELLE URL WEBHOOK:');
        console.log(`   ${testUrl}`);
        console.log('='.repeat(50));
        console.log('\n🎉 Reteste le tri!');
        
        await pool.end();
        return;
        
      } catch(e) {
        console.log(`   ❌ Tentative ${i}: ${e.response?.status || e.message}`);
        
        if (i < 5) {
          // Réactiver
          console.log('   Réactivation...');
          try {
            await axios.post(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}/deactivate`, {}, {
              headers: { 'X-N8N-API-KEY': N8N_API_KEY }
            });
          } catch(e) {}
          await new Promise(r => setTimeout(r, 2000));
          await axios.post(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}/activate`, {}, {
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
          });
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }
    
    console.log('\n❌ Le webhook ne fonctionne toujours pas après 5 tentatives');
    console.log('\n🔧 Vérification de l\'état dans n8n...');
    
    // Vérifier l'état final
    const finalRes = await axios.get(`${N8N_URL}/api/v1/workflows/${ncWorkflow.id}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    console.log('   Active:', finalRes.data.active);
    
    const finalWebhook = finalRes.data.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
    console.log('   Webhook path:', finalWebhook?.parameters?.path);
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  } finally {
    await pool.end();
  }
})();

