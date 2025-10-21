#!/usr/bin/env node

/**
 * Script de test pour vérifier le flux de données dans le workflow PDF Analysis
 */

const config = require('./backend/config');

async function testWorkflowDataFlow() {
  console.log('🔧 [Test] Test du flux de données du workflow PDF Analysis...');
  
  try {
    // 1. Récupérer le workflow spécifique
    console.log('🔧 [Test] Récupération du workflow PDF Analysis...');
    const workflowResponse = await fetch(`${config.n8n.url}/api/v1/workflows/F5YmjMHHXajjOhxG`, {
      headers: {
        'X-N8N-API-KEY': config.n8n.apiKey
      }
    });
    
    if (!workflowResponse.ok) {
      throw new Error(`Erreur récupération workflow: ${workflowResponse.status}`);
    }
    
    const workflow = await workflowResponse.json();
    console.log('✅ [Test] Workflow récupéré:', workflow.name);
    
    // 2. Analyser les nœuds et leurs connexions
    console.log('\n🔧 [Test] Analyse des nœuds...');
    
    const nodes = workflow.nodes;
    console.log(`📊 [Test] Nombre de nœuds: ${nodes.length}`);
    
    // Trouver les nœuds clés
    const webhookNode = nodes.find(n => n.type === 'n8n-nodes-base.webhook');
    const editFieldsNode = nodes.find(n => n.name === 'Edit Fields1');
    const emailValidationNode = nodes.find(n => n.name === 'Email Validation');
    const sendEmailNode = nodes.find(n => n.name === 'Send email - SSL in Credentials');
    
    console.log('\n📧 [Test] Nœuds clés trouvés:');
    console.log(`  - Webhook: ${webhookNode ? '✅' : '❌'}`);
    console.log(`  - Edit Fields1: ${editFieldsNode ? '✅' : '❌'}`);
    console.log(`  - Email Validation: ${emailValidationNode ? '✅' : '❌'}`);
    console.log(`  - Send Email: ${sendEmailNode ? '✅' : '❌'}`);
    
    // 3. Analyser la configuration du nœud Send Email
    if (sendEmailNode) {
      console.log('\n📧 [Test] Configuration du nœud Send Email:');
      console.log(`  - From Email: ${sendEmailNode.parameters.fromEmail}`);
      console.log(`  - To Email: ${sendEmailNode.parameters.toEmail}`);
      console.log(`  - Subject: ${sendEmailNode.parameters.subject}`);
      
      // Vérifier l'expression To Email
      const toEmailExpression = sendEmailNode.parameters.toEmail;
      if (toEmailExpression.includes('Edit Fields1')) {
        console.log('✅ [Test] Expression To Email correcte (référence Edit Fields1)');
      } else if (toEmailExpression.includes('Email Validation')) {
        console.log('⚠️ [Test] Expression To Email utilise Email Validation (peut causer des problèmes)');
      } else {
        console.log('ℹ️ [Test] Expression To Email personnalisée');
      }
    }
    
    // 4. Analyser les connexions
    console.log('\n🔗 [Test] Analyse des connexions:');
    const connections = workflow.connections;
    
    if (connections['Webhook'] && connections['Webhook'].main[0][0].node === 'Edit Fields1') {
      console.log('✅ [Test] Webhook → Edit Fields1: Correct');
    } else {
      console.log('❌ [Test] Webhook → Edit Fields1: Problème de connexion');
    }
    
    if (connections['Edit Fields1'] && connections['Edit Fields1'].main[0][0].node === 'AI Agent') {
      console.log('✅ [Test] Edit Fields1 → AI Agent: Correct');
    } else {
      console.log('❌ [Test] Edit Fields1 → AI Agent: Problème de connexion');
    }
    
    if (connections['AI Agent'] && connections['AI Agent'].main[0][0].node === 'Email Validation') {
      console.log('✅ [Test] AI Agent → Email Validation: Correct');
    } else {
      console.log('❌ [Test] AI Agent → Email Validation: Problème de connexion');
    }
    
    if (connections['Email Validation'] && connections['Email Validation'].main[0][0].node === 'Send email - SSL in Credentials') {
      console.log('✅ [Test] Email Validation → Send Email: Correct');
    } else {
      console.log('❌ [Test] Email Validation → Send Email: Problème de connexion');
    }
    
    // 5. Recommandations
    console.log('\n💡 [Test] Recommandations:');
    
    if (sendEmailNode && sendEmailNode.parameters.toEmail.includes('Email Validation')) {
      console.log('🔧 [Test] CORRECTION NÉCESSAIRE:');
      console.log('   Changer dans le nœud "Send email - SSL in Credentials":');
      console.log('   ❌ AVANT: {{ $(\'Email Validation\').item.json.clientEmail }}');
      console.log('   ✅ APRÈS: {{ $(\'Edit Fields1\').item.json.clientEmail }}');
    } else {
      console.log('✅ [Test] Configuration semble correcte');
    }
    
    console.log('\n✅ [Test] Analyse terminée');
    
  } catch (error) {
    console.error('❌ [Test] Erreur analyse workflow:', error);
    throw error;
  }
}

async function runWorkflowTest() {
  console.log('🚀 [Test] === Test Flux de Données Workflow ===');
  console.log('🔧 [Test] Configuration n8n:', {
    url: config.n8n.url,
    hasApiKey: !!config.n8n.apiKey
  });
  
  try {
    await testWorkflowDataFlow();
    
    console.log('\n✅ [Test] === Test terminé avec succès ===');
    console.log('🔧 [Test] Vérifiez les recommandations ci-dessus');
    
  } catch (error) {
    console.error('\n❌ [Test] === Échec du test ===');
    console.error('❌ [Test] Erreur:', error.message);
    process.exit(1);
  }
}

// Exécuter les tests
runWorkflowTest();
