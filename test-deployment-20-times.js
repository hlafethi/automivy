import fetch from 'node-fetch';
import fs from 'fs';

// Test de déploiement 20 fois pour identifier les problèmes
async function testDeployment20Times() {
  console.log('🧪 [TEST-20] ==========================================');
  console.log('🧪 [TEST-20] TEST DÉPLOIEMENT 20 FOIS');
  console.log('🧪 [TEST-20] ==========================================');
  
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };
  
  for (let i = 1; i <= 20; i++) {
    console.log(`\n🔧 [TEST-20] Test ${i}/20...`);
    
    try {
      // 1. Test création credential SMTP
      console.log(`  📋 [TEST-20] Test ${i} - Création credential SMTP...`);
      const smtpCredentialData = {
        name: `TEST-SMTP-${i}`,
        type: "smtp",
        data: {
          host: "smtp.gmail.com",
          user: `test${i}@example.com`,
          password: "test_password",
          port: 465,
          secure: true
        }
      };
      
      const smtpResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpCredentialData)
      });
      
      if (!smtpResponse.ok) {
        throw new Error(`Erreur credential SMTP: ${smtpResponse.status}`);
      }
      
      const smtpCredential = await smtpResponse.json();
      console.log(`  ✅ [TEST-20] Test ${i} - Credential SMTP créé: ${smtpCredential.id}`);
      
      // 2. Test création workflow avec déclencheur
      console.log(`  📋 [TEST-20] Test ${i} - Création workflow...`);
      const workflowData = {
        name: `TEST-WORKFLOW-${i}`,
        nodes: [
          {
            id: "webhook-trigger",
            name: "Webhook Trigger",
            type: "n8n-nodes-base.webhook",
            typeVersion: 1,
            position: [160, 16],
            parameters: {
              path: `test-webhook-${i}`,
              httpMethod: "POST"
            }
          },
          {
            id: "debug-node",
            name: "Debug Node",
            type: "n8n-nodes-base.noOp",
            typeVersion: 1,
            position: [360, 16],
            parameters: {}
          }
        ],
        connections: {
          "webhook-trigger": {
            "main": [
              [
                {
                  "node": "debug-node",
                  "type": "main",
                  "index": 0
                }
              ]
            ]
          }
        },
        settings: {}
      };
      
      const workflowResponse = await fetch('http://localhost:3004/api/n8n/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });
      
      if (!workflowResponse.ok) {
        throw new Error(`Erreur création workflow: ${workflowResponse.status}`);
      }
      
      const workflow = await workflowResponse.json();
      console.log(`  ✅ [TEST-20] Test ${i} - Workflow créé: ${workflow.id}`);
      
      // 3. Test activation automatique
      console.log(`  📋 [TEST-20] Test ${i} - Activation workflow...`);
      const activateResponse = await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (activateResponse.ok) {
        const activateResult = await activateResponse.json();
        console.log(`  ✅ [TEST-20] Test ${i} - Workflow activé: ${activateResult.active}`);
      } else {
        const errorText = await activateResponse.text();
        console.log(`  ⚠️ [TEST-20] Test ${i} - Erreur activation: ${errorText}`);
      }
      
      // 4. Nettoyer les ressources
      console.log(`  🧹 [TEST-20] Test ${i} - Nettoyage...`);
      try {
        await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.id}`, {
          method: 'DELETE'
        });
        await fetch(`http://localhost:3004/api/n8n/credentials/${smtpCredential.id}`, {
          method: 'DELETE'
        });
        console.log(`  ✅ [TEST-20] Test ${i} - Nettoyage terminé`);
      } catch (cleanupError) {
        console.log(`  ⚠️ [TEST-20] Test ${i} - Erreur nettoyage: ${cleanupError.message}`);
      }
      
      results.successful++;
      console.log(`  🎉 [TEST-20] Test ${i} - SUCCÈS`);
      
    } catch (error) {
      results.failed++;
      results.errors.push({
        test: i,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      console.log(`  ❌ [TEST-20] Test ${i} - ÉCHEC: ${error.message}`);
    }
    
    // Pause entre les tests
    if (i < 20) {
      console.log(`  ⏳ [TEST-20] Pause 1 seconde avant le test ${i + 1}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // 5. Vérifier les logs backend
  console.log('\n🔧 [TEST-20] Vérification logs backend...');
  try {
    if (fs.existsSync('backend-logs.txt')) {
      const logs = fs.readFileSync('backend-logs.txt', 'utf8');
      console.log('📋 [TEST-20] Logs backend trouvés:');
      console.log('=====================================');
      console.log(logs);
      console.log('=====================================');
    } else {
      console.log('⚠️ [TEST-20] Aucun fichier backend-logs.txt trouvé');
    }
  } catch (error) {
    console.log('❌ [TEST-20] Erreur lecture logs:', error.message);
  }
  
  // Résumé des résultats
  console.log('\n📊 [TEST-20] ==========================================');
  console.log('📊 [TEST-20] RÉSUMÉ DES TESTS');
  console.log('📊 [TEST-20] ==========================================');
  console.log(`✅ Tests réussis: ${results.successful}/20`);
  console.log(`❌ Tests échoués: ${results.failed}/20`);
  console.log(`📈 Taux de réussite: ${((results.successful / 20) * 100).toFixed(1)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ [TEST-20] Erreurs détaillées:');
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. Test ${error.test}: ${error.error} (${error.timestamp})`);
    });
  }
  
  console.log('\n🎉 [TEST-20] Test de déploiement 20 fois terminé !');
}

// Exécution du test
async function runTest20() {
  try {
    await testDeployment20Times();
  } catch (error) {
    console.error('❌ [TEST-20] Échec du test:', error);
    process.exit(1);
  }
}

runTest20();
