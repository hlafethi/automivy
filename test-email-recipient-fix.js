#!/usr/bin/env node

/**
 * Script de test pour vérifier la configuration des destinataires email
 * dans les workflows n8n
 */

const config = require('./backend/config');

async function testWorkflowEmailConfiguration() {
  console.log('🔧 [Test] Vérification de la configuration email des workflows...');
  
  try {
    // 1. Récupérer tous les workflows
    console.log('🔧 [Test] Récupération des workflows...');
    const workflowsResponse = await fetch(`${config.n8n.url}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': config.n8n.apiKey
      }
    });
    
    if (!workflowsResponse.ok) {
      throw new Error(`Erreur récupération workflows: ${workflowsResponse.status}`);
    }
    
    const workflows = await workflowsResponse.json();
    console.log('✅ [Test] Workflows trouvés:', workflows.length);
    
    // 2. Analyser chaque workflow pour les nœuds email
    for (const workflow of workflows) {
      console.log(`\n🔧 [Test] Analyse du workflow: ${workflow.name} (ID: ${workflow.id})`);
      
      if (workflow.nodes) {
        const emailNodes = workflow.nodes.filter(node => 
          node.type === 'n8n-nodes-base.emailSend' || 
          node.name?.toLowerCase().includes('email')
        );
        
        console.log(`📧 [Test] Nœuds email trouvés: ${emailNodes.length}`);
        
        for (const emailNode of emailNodes) {
          console.log(`\n📧 [Test] Nœud: ${emailNode.name}`);
          console.log(`📧 [Test] Type: ${emailNode.type}`);
          
          if (emailNode.parameters) {
            const toEmail = emailNode.parameters.toEmail;
            const fromEmail = emailNode.parameters.fromEmail;
            
            console.log(`📧 [Test] From Email: ${fromEmail}`);
            console.log(`📧 [Test] To Email: ${toEmail}`);
            
            // Vérifier si l'expression est correcte
            if (toEmail && typeof toEmail === 'string') {
              if (toEmail.includes('$workflow.variables')) {
                console.log('⚠️ [Test] PROBLÈME: Utilise des variables de workflow non définies');
                console.log('🔧 [Test] Suggestion: Utiliser {{ $(\'Email Validation\').item.json.clientEmail }}');
              } else if (toEmail.includes('clientEmail ail')) {
                console.log('⚠️ [Test] PROBLÈME: Faute de frappe dans l\'expression');
                console.log('🔧 [Test] Suggestion: Corriger "clientEmail ail" en "clientEmail"');
              } else if (toEmail.includes('clientEmail')) {
                console.log('✅ [Test] Expression semble correcte');
              } else {
                console.log('ℹ️ [Test] Expression personnalisée détectée');
              }
            } else {
              console.log('⚠️ [Test] PROBLÈME: Champ To Email vide ou invalide');
            }
          }
        }
      }
    }
    
    console.log('\n✅ [Test] Analyse terminée');
    
  } catch (error) {
    console.error('❌ [Test] Erreur analyse workflows:', error);
    throw error;
  }
}

async function testEmailExpression() {
  console.log('\n🔧 [Test] Test des expressions email...');
  
  // Expressions à tester
  const expressions = [
    '{{ $(\'Email Validation\').item.json.clientEmail }}',
    '{{ $(\'Email Validation\').item.json.clientEmail ail }}', // Avec faute
    '{{ $workflow.variables.recipientEmail }}', // Variables non définies
    '{{ $(\'Edit Fields1\').item.json.clientEmail }}'
  ];
  
  console.log('🔧 [Test] Expressions à vérifier:');
  expressions.forEach((expr, index) => {
    console.log(`${index + 1}. ${expr}`);
    
    if (expr.includes('clientEmail ail')) {
      console.log('   ⚠️ PROBLÈME: Faute de frappe détectée');
    } else if (expr.includes('$workflow.variables')) {
      console.log('   ⚠️ PROBLÈME: Variables de workflow non définies');
    } else if (expr.includes('clientEmail')) {
      console.log('   ✅ Expression correcte');
    }
  });
}

async function runEmailTest() {
  console.log('🚀 [Test] === Test Configuration Email Workflows ===');
  console.log('🔧 [Test] Configuration n8n:', {
    url: config.n8n.url,
    hasApiKey: !!config.n8n.apiKey
  });
  
  try {
    // Test 1: Analyse des workflows
    console.log('\n📧 [Test] === Test 1: Analyse Workflows ===');
    await testWorkflowEmailConfiguration();
    
    // Test 2: Test des expressions
    console.log('\n🔧 [Test] === Test 2: Test Expressions ===');
    await testEmailExpression();
    
    console.log('\n✅ [Test] === Tests terminés avec succès ===');
    console.log('🔧 [Test] Vérifiez les suggestions ci-dessus pour corriger les problèmes');
    
  } catch (error) {
    console.error('\n❌ [Test] === Échec des tests ===');
    console.error('❌ [Test] Erreur:', error.message);
    process.exit(1);
  }
}

// Exécuter les tests
runEmailTest();
