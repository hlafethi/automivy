/**
 * Script de diagnostic pour vérifier le webhook d'un workflow
 * Usage: node backend/scripts/diagnose-webhook.js <n8nWorkflowId> [userWorkflowId]
 */

const fetch = require('node-fetch');
const config = require('../config');
const db = require('../database');

async function diagnoseWebhook(n8nWorkflowId, userWorkflowId = null) {
  console.log('🔍 Diagnostic du webhook pour le workflow:', n8nWorkflowId);
  console.log('');

  try {
    // 1. Récupérer le workflow depuis n8n
    console.log('1️⃣ Récupération du workflow depuis n8n...');
    const workflowResponse = await fetch(`${config.n8n.url}/api/v1/workflows/${n8nWorkflowId}`, {
      headers: { 'X-N8N-API-KEY': config.n8n.apiKey }
    });

    if (!workflowResponse.ok) {
      console.error(`❌ Erreur ${workflowResponse.status}: Impossible de récupérer le workflow`);
      const errorText = await workflowResponse.text();
      console.error('Détails:', errorText);
      return;
    }

    const workflow = await workflowResponse.json();
    console.log(`✅ Workflow récupéré: "${workflow.name}"`);
    console.log(`   - Actif: ${workflow.active ? '✅ OUI' : '❌ NON'}`);
    console.log('');

    // 2. Trouver le nœud webhook
    console.log('2️⃣ Recherche du nœud webhook...');
    const webhookNode = workflow.nodes?.find(node => 
      node.type === 'n8n-nodes-base.webhook' || 
      node.type === 'n8n-nodes-base.webhookTrigger' ||
      (node.typeVersion === 1 && node.type === 'n8n-nodes-base.webhook')
    );

    if (!webhookNode) {
      console.error('❌ Aucun nœud webhook trouvé dans le workflow');
      console.log('   Types de nœuds trouvés:', workflow.nodes?.map(n => n.type).filter((v, i, a) => a.indexOf(v) === i).join(', '));
      return;
    }

    console.log(`✅ Nœud webhook trouvé: "${webhookNode.name}"`);
    console.log(`   - Type: ${webhookNode.type}`);
    console.log(`   - TypeVersion: ${webhookNode.typeVersion || 'N/A'}`);
    
    // Récupérer le path
    const webhookPath = webhookNode.parameters?.path || webhookNode.parameters?.path?.value;
    console.log(`   - Path: ${webhookPath || '❌ NON CONFIGURÉ'}`);
    console.log('');

    if (!webhookPath) {
      console.error('❌ Le nœud webhook n\'a pas de path configuré');
      console.log('   Paramètres du nœud:', JSON.stringify(webhookNode.parameters, null, 2));
      return;
    }

    // 3. Construire l'URL webhook
    const webhookUrl = `${config.n8n.url}/webhook/${webhookPath}`;
    console.log('3️⃣ URL webhook construite:');
    console.log(`   ${webhookUrl}`);
    console.log('');

    // 4. Vérifier le path en BDD
    if (userWorkflowId) {
      console.log('4️⃣ Vérification du path en BDD (userWorkflowId)...');
      const dbResult = await db.query(
        'SELECT webhook_path, n8n_workflow_id, name FROM user_workflows WHERE id = $1',
        [userWorkflowId]
      );
      
      if (dbResult.rows.length > 0) {
        const dbPath = dbResult.rows[0].webhook_path;
        console.log(`   - Path en BDD: ${dbPath || '❌ NULL'}`);
        console.log(`   - Correspondance: ${dbPath === webhookPath ? '✅ OUI' : '❌ NON'}`);
        if (dbPath !== webhookPath) {
          console.log(`   ⚠️  Le path en BDD ne correspond pas au path réel dans n8n`);
          console.log(`   - BDD: "${dbPath}"`);
          console.log(`   - n8n: "${webhookPath}"`);
        }
      } else {
        console.log('   ⚠️  Aucun workflow trouvé en BDD avec cet ID');
      }
      console.log('');
    } else {
      console.log('4️⃣ Vérification du path en BDD (n8nWorkflowId)...');
      const dbResult = await db.query(
        'SELECT id, webhook_path, name FROM user_workflows WHERE n8n_workflow_id = $1 ORDER BY created_at DESC LIMIT 1',
        [n8nWorkflowId]
      );
      
      if (dbResult.rows.length > 0) {
        const dbPath = dbResult.rows[0].webhook_path;
        console.log(`   - Workflow en BDD: "${dbResult.rows[0].name}" (ID: ${dbResult.rows[0].id})`);
        console.log(`   - Path en BDD: ${dbPath || '❌ NULL'}`);
        console.log(`   - Correspondance: ${dbPath === webhookPath ? '✅ OUI' : '❌ NON'}`);
        if (dbPath !== webhookPath) {
          console.log(`   ⚠️  Le path en BDD ne correspond pas au path réel dans n8n`);
          console.log(`   - BDD: "${dbPath}"`);
          console.log(`   - n8n: "${webhookPath}"`);
        }
      } else {
        console.log('   ⚠️  Aucun workflow trouvé en BDD avec cet n8nWorkflowId');
      }
      console.log('');
    }

    // 5. Tester l'URL webhook de production
    console.log('5️⃣ Test de l\'URL webhook de production...');
    let productionTestResult = null;
    try {
      const testResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
      });

      productionTestResult = {
        status: testResponse.status,
        statusText: testResponse.statusText
      };

      console.log(`   - Status: ${testResponse.status} ${testResponse.statusText}`);
      
      if (testResponse.status === 404) {
        const errorText = await testResponse.text();
        let errorJson = null;
        try {
          errorJson = JSON.parse(errorText);
        } catch (e) {
          // Ignorer
        }
        
        console.log(`   ❌ Webhook retourne 404`);
        console.log(`   - Message: ${errorJson?.message || errorText.substring(0, 100)}`);
        console.log(`   - Hint: ${errorJson?.hint || 'N/A'}`);
        console.log('');
        console.log('💡 Solutions possibles:');
        console.log('   1. Vérifiez que le workflow est bien ACTIF dans n8n (bouton ON)');
        console.log('   2. Attendez quelques secondes après activation (n8n peut avoir un délai)');
        console.log('   3. Vérifiez que le path du webhook dans n8n correspond exactement');
        console.log('   4. Vérifiez la configuration WEBHOOK_URL dans n8n si auto-hébergé');
        console.log('   5. Essayez de désactiver puis réactiver le workflow dans n8n');
      } else if (testResponse.ok) {
        console.log(`   ✅ Webhook accessible et fonctionnel`);
        const responseText = await testResponse.text();
        console.log(`   - Réponse: ${responseText.substring(0, 200)}`);
      } else {
        console.log(`   ⚠️  Webhook retourne un code non-OK: ${testResponse.status}`);
        const responseText = await testResponse.text();
        console.log(`   - Réponse: ${responseText.substring(0, 200)}`);
      }
    } catch (testError) {
      console.error(`   ❌ Erreur lors du test: ${testError.message}`);
      productionTestResult = { error: testError.message };
    }
    console.log('');

    // 6. Tester l'URL webhook de test (pour comparaison)
    const testWebhookUrl = `${config.n8n.url}/webhook-test/${webhookPath}`;
    console.log('6️⃣ Test de l\'URL webhook de test (pour comparaison)...');
    let testWebhookResult = null;
    try {
      const testResponse = await fetch(testWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      testWebhookResult = {
        status: testResponse.status,
        statusText: testResponse.statusText
      };
      console.log(`   - Status: ${testResponse.status} ${testResponse.statusText}`);
      if (testResponse.ok) {
        console.log(`   ✅ URL de test fonctionne (mais ce n'est pas l'URL de production)`);
        console.log(`   ⚠️  Note: L'URL de test fonctionne mais pas l'URL de production`);
        console.log(`   ⚠️  Cela indique que le workflow est actif mais le webhook n'est pas enregistré en production`);
      } else {
        console.log(`   ⚠️  URL de test retourne: ${testResponse.status}`);
      }
    } catch (e) {
      console.log(`   ⚠️  Erreur lors du test de l'URL de test: ${e.message}`);
      testWebhookResult = { error: e.message };
    }
    console.log('');

    // 7. Résumé
    console.log('📊 Résumé:');
    console.log(`   - Workflow actif: ${workflow.active ? '✅' : '❌'}`);
    console.log(`   - Webhook path: ${webhookPath}`);
    console.log(`   - URL webhook production: ${webhookUrl}`);
    console.log(`   - Test production: ${productionTestResult?.status === 200 ? '✅ OK' : productionTestResult?.status === 404 ? '❌ 404' : productionTestResult?.error ? '❌ Erreur' : '⚠️ ' + productionTestResult?.status}`);
    console.log(`   - URL webhook test: ${testWebhookUrl}`);
    console.log(`   - Test test URL: ${testWebhookResult?.status === 200 ? '✅ OK' : testWebhookResult?.status ? '⚠️ ' + testWebhookResult.status : '❌ Erreur'}`);
    
    if (productionTestResult?.status === 404 && testWebhookResult?.status === 200) {
      console.log('');
      console.log('🔍 Diagnostic:');
      console.log('   Le workflow est actif et l\'URL de test fonctionne, mais l\'URL de production retourne 404.');
      console.log('   Cela peut indiquer:');
      console.log('   1. Un délai de propagation dans n8n (attendez 30-60 secondes)');
      console.log('   2. Un problème de configuration n8n (WEBHOOK_URL)');
      console.log('   3. Le webhook n\'est pas correctement enregistré en production');
      console.log('');
      console.log('   Solution: Essayez de désactiver puis réactiver le workflow dans n8n');
    }

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
    console.error(error.stack);
  }
}

// Récupérer les arguments
const n8nWorkflowId = process.argv[2];
const userWorkflowId = process.argv[3] || null;

if (!n8nWorkflowId) {
  console.error('Usage: node backend/scripts/diagnose-webhook.js <n8nWorkflowId> [userWorkflowId]');
  console.error('');
  console.error('Exemple:');
  console.error('  node backend/scripts/diagnose-webhook.js sENUoZQyNqK49zhb');
  console.error('  node backend/scripts/diagnose-webhook.js sENUoZQyNqK49zhb e45c77a5-c5be-453e-a625-5708e99563a5');
  process.exit(1);
}

diagnoseWebhook(n8nWorkflowId, userWorkflowId)
  .then(() => {
    console.log('');
    console.log('✅ Diagnostic terminé');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

