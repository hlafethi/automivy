import fetch from 'node-fetch';
import fs from 'fs';

// Analyse des problèmes récurrents de déploiement
async function analyzeDeploymentIssues() {
  console.log('🔍 [ANALYZE] ==========================================');
  console.log('🔍 [ANALYZE] ANALYSE DES PROBLÈMES RÉCURRENTS');
  console.log('🔍 [ANALYZE] ==========================================');
  
  // 1. Vérifier l'état du backend
  console.log('\n🔧 [ANALYZE] 1. Vérification état backend...');
  try {
    const healthResponse = await fetch('http://localhost:3004/api/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (healthResponse.ok) {
      console.log('✅ [ANALYZE] Backend accessible');
    } else {
      console.log('❌ [ANALYZE] Backend non accessible:', healthResponse.status);
      return;
    }
  } catch (error) {
    console.log('❌ [ANALYZE] Erreur connectivité backend:', error.message);
    return;
  }
  
  // 2. Analyser les logs backend existants
  console.log('\n🔧 [ANALYZE] 2. Analyse des logs backend...');
  const logFiles = [
    'backend-logs.txt',
    'logs.txt',
    'app.log',
    'error.log',
    'debug.log'
  ];
  
  let logsFound = false;
  for (const logFile of logFiles) {
    if (fs.existsSync(logFile)) {
      console.log(`📋 [ANALYZE] Fichier de logs trouvé: ${logFile}`);
      try {
        const logs = fs.readFileSync(logFile, 'utf8');
        console.log('📋 [ANALYZE] Contenu des logs:');
        console.log('=====================================');
        console.log(logs);
        console.log('=====================================');
        logsFound = true;
      } catch (error) {
        console.log(`❌ [ANALYZE] Erreur lecture ${logFile}:`, error.message);
      }
    }
  }
  
  if (!logsFound) {
    console.log('⚠️ [ANALYZE] Aucun fichier de logs trouvé');
    console.log('💡 [ANALYZE] Les logs peuvent être dans la console du backend');
  }
  
  // 3. Tester la création de credentials avec SSL
  console.log('\n🔧 [ANALYZE] 3. Test credentials SSL...');
  try {
    const smtpCredentialData = {
      name: "ANALYZE-SMTP-SSL-TEST",
      type: "smtp",
      data: {
        host: "smtp.gmail.com",
        user: "test@example.com",
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
    
    console.log('🔧 [ANALYZE] Réponse credential SMTP:', smtpResponse.status, smtpResponse.statusText);
    
    if (smtpResponse.ok) {
      const smtpCredential = await smtpResponse.json();
      console.log('✅ [ANALYZE] Credential SMTP créé avec SSL:', smtpCredential.id);
      
      // Nettoyer
      await fetch(`http://localhost:3004/api/n8n/credentials/${smtpCredential.id}`, {
        method: 'DELETE'
      });
      console.log('🧹 [ANALYZE] Credential nettoyé');
    } else {
      const errorText = await smtpResponse.text();
      console.log('❌ [ANALYZE] Erreur credential SMTP:', errorText);
    }
  } catch (error) {
    console.log('❌ [ANALYZE] Erreur test credential SSL:', error.message);
  }
  
  // 4. Tester l'activation automatique
  console.log('\n🔧 [ANALYZE] 4. Test activation automatique...');
  try {
    const workflowData = {
      name: "ANALYZE-WORKFLOW-TEST",
      nodes: [
        {
          id: "webhook-trigger",
          name: "Webhook Trigger",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [160, 16],
          parameters: {
            path: "analyze-test-webhook",
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
    
    if (workflowResponse.ok) {
      const workflow = await workflowResponse.json();
      console.log('✅ [ANALYZE] Workflow créé:', workflow.id);
      console.log('📋 [ANALYZE] Workflow initial - active:', workflow.active);
      
      // Test activation
      const activateResponse = await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (activateResponse.ok) {
        const activateResult = await activateResponse.json();
        console.log('✅ [ANALYZE] Workflow activé avec succès:', activateResult.active);
      } else {
        const errorText = await activateResponse.text();
        console.log('❌ [ANALYZE] Erreur activation:', errorText);
      }
      
      // Nettoyer
      await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.id}`, {
        method: 'DELETE'
      });
      console.log('🧹 [ANALYZE] Workflow nettoyé');
      
    } else {
      const errorText = await workflowResponse.text();
      console.log('❌ [ANALYZE] Erreur création workflow:', errorText);
    }
  } catch (error) {
    console.log('❌ [ANALYZE] Erreur test activation:', error.message);
  }
  
  // 5. Analyser les problèmes récurrents
  console.log('\n📊 [ANALYZE] ==========================================');
  console.log('📊 [ANALYZE] ANALYSE DES PROBLÈMES RÉCURRENTS');
  console.log('📊 [ANALYZE] ==========================================');
  
  console.log('\n🔍 [ANALYZE] Problèmes identifiés lors de vos 20 tests:');
  console.log('  1. ❌ Pas de logs backend - Les logs ne s\'affichent pas');
  console.log('  2. ❌ Pas de SSL - Configuration SSL/TLS manquante');
  console.log('  3. ❌ Pas d\'activation automatique - Workflows non activés');
  
  console.log('\n💡 [ANALYZE] Solutions appliquées:');
  console.log('  ✅ Configuration SSL/TLS corrigée dans credentialInjector.js');
  console.log('  ✅ Vérification nœuds de déclenchement dans smartDeploy.js');
  console.log('  ✅ Activation automatique conditionnelle');
  console.log('  ✅ Logs backend améliorés avec écriture fichier');
  
  console.log('\n🎯 [ANALYZE] Prochaines étapes:');
  console.log('  1. Tester le déploiement via l\'interface web');
  console.log('  2. Vérifier les logs dans backend-logs.txt');
  console.log('  3. Contrôler l\'activation des workflows dans n8n');
  
  console.log('\n🎉 [ANALYZE] Analyse terminée !');
}

// Exécution de l'analyse
async function runAnalyze() {
  try {
    await analyzeDeploymentIssues();
  } catch (error) {
    console.error('❌ [ANALYZE] Échec de l\'analyse:', error);
    process.exit(1);
  }
}

runAnalyze();
