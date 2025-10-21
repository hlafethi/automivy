#!/usr/bin/env node

/**
 * Script de diagnostic pour le workflow PDF Analysis
 * Vérifie la chaîne de données et les expressions
 */

const config = require('./backend/config');

async function testWorkflowExecution() {
  console.log('🔧 [Debug] Test d\'exécution du workflow PDF Analysis...');
  
  try {
    // 1. Tester le webhook du workflow
    console.log('🔧 [Debug] Test du webhook...');
    
    const webhookUrl = `${config.n8n.url}/webhook/pdf-upload-analysis`;
    console.log('🔧 [Debug] URL webhook:', webhookUrl);
    
    const testData = {
      clientName: "Test Client",
      clientEmail: "test@example.com",
      files: [
        {
          name: "test.pdf",
          content: "base64content"
        }
      ],
      sessionId: "test-session-123"
    };
    
    console.log('🔧 [Debug] Données de test:', JSON.stringify(testData, null, 2));
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('🔧 [Debug] Réponse webhook:', webhookResponse.status);
    
    if (webhookResponse.ok) {
      const result = await webhookResponse.json();
      console.log('✅ [Debug] Webhook exécuté avec succès');
      console.log('🔧 [Debug] Résultat:', result);
    } else {
      const error = await webhookResponse.text();
      console.log('❌ [Debug] Erreur webhook:', error);
    }
    
  } catch (error) {
    console.error('❌ [Debug] Erreur test webhook:', error);
  }
}

async function analyzeWorkflowStructure() {
  console.log('\n🔧 [Debug] Analyse de la structure du workflow...');
  
  try {
    // Récupérer le workflow
    const workflowResponse = await fetch(`${config.n8n.url}/api/v1/workflows/F5YmjMHHXajjOhxG`, {
      headers: {
        'X-N8N-API-KEY': config.n8n.apiKey
      }
    });
    
    if (!workflowResponse.ok) {
      throw new Error(`Erreur récupération workflow: ${workflowResponse.status}`);
    }
    
    const workflow = await workflowResponse.json();
    
    // Analyser chaque nœud
    console.log('\n📊 [Debug] Analyse des nœuds:');
    
    workflow.nodes.forEach((node, index) => {
      console.log(`\n${index + 1}. ${node.name} (${node.type})`);
      
      if (node.parameters) {
        // Analyser les paramètres importants
        if (node.parameters.jsonOutput) {
          console.log('   📝 JSON Output:', node.parameters.jsonOutput.substring(0, 100) + '...');
        }
        
        if (node.parameters.toEmail) {
          console.log('   📧 To Email:', node.parameters.toEmail);
        }
        
        if (node.parameters.html) {
          console.log('   📄 HTML:', node.parameters.html);
        }
        
        if (node.parameters.text) {
          console.log('   💬 Text:', node.parameters.text.substring(0, 100) + '...');
        }
      }
    });
    
    // Analyser les connexions
    console.log('\n🔗 [Debug] Analyse des connexions:');
    Object.entries(workflow.connections).forEach(([sourceNode, connections]) => {
      if (connections.main && connections.main[0]) {
        const targetNode = connections.main[0][0].node;
        console.log(`   ${sourceNode} → ${targetNode}`);
      }
    });
    
  } catch (error) {
    console.error('❌ [Debug] Erreur analyse workflow:', error);
  }
}

async function suggestFixes() {
  console.log('\n💡 [Debug] Suggestions de corrections:');
  
  console.log('\n🔧 [Debug] 1. Correction du champ "To Email":');
  console.log('   Dans le nœud "Send email - SSL in Credentials":');
  console.log('   ❌ AVANT: {{ $(\'Edit Fields1\').item.json.clientEmail }}');
  console.log('   ✅ APRÈS: {{ $(\'Edit Fields1\').item.json.clientEmail || $json.clientEmail || \'admin@heleam.com\' }}');
  
  console.log('\n🔧 [Debug] 2. Correction du champ "HTML":');
  console.log('   Dans le nœud "Send email - SSL in Credentials":');
  console.log('   ❌ AVANT: {{ $json.output }}');
  console.log('   ✅ APRÈS: {{ $(\'AI Agent\').item.json.output || $json.output || \'<p>Analyse en cours...</p>\' }}');
  
  console.log('\n🔧 [Debug] 3. Vérification de la chaîne de données:');
  console.log('   Webhook → Edit Fields1 → AI Agent → Email Validation → Send Email');
  console.log('   Vérifiez que chaque nœud reçoit bien les données du précédent');
  
  console.log('\n🔧 [Debug] 4. Test des expressions:');
  console.log('   Dans n8n, testez chaque expression individuellement');
  console.log('   Utilisez le mode "Execute" pour voir les valeurs');
}

async function runDebug() {
  console.log('🚀 [Debug] === Diagnostic Workflow PDF Analysis ===');
  console.log('🔧 [Debug] Configuration n8n:', {
    url: config.n8n.url,
    hasApiKey: !!config.n8n.apiKey
  });
  
  try {
    // Test 1: Structure du workflow
    console.log('\n📊 [Debug] === Test 1: Structure du Workflow ===');
    await analyzeWorkflowStructure();
    
    // Test 2: Exécution du webhook
    console.log('\n🔄 [Debug] === Test 2: Exécution du Webhook ===');
    await testWorkflowExecution();
    
    // Test 3: Suggestions
    console.log('\n💡 [Debug] === Test 3: Suggestions de Corrections ===');
    await suggestFixes();
    
    console.log('\n✅ [Debug] === Diagnostic terminé ===');
    console.log('🔧 [Debug] Appliquez les corrections suggérées dans n8n');
    
  } catch (error) {
    console.error('\n❌ [Debug] === Échec du diagnostic ===');
    console.error('❌ [Debug] Erreur:', error.message);
    process.exit(1);
  }
}

// Exécuter le diagnostic
runDebug();
