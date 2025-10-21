#!/usr/bin/env node

/**
 * Script de test pour vérifier la création de credentials SMTP avec SSL
 * et l'activation des workflows depuis l'interface de l'application
 */

const config = require('./backend/config');

async function testSmtpCredentialCreation() {
  console.log('🔧 [Test] Création d\'un credential SMTP avec SSL...');
  
  try {
    const credentialData = {
      name: `SMTP-Test-${Date.now()}`,
      type: 'smtp',
      data: {
        user: 'test@example.com',
        password: 'test-password',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        ssl: true,
        tls: {
          rejectUnauthorized: false
        }
      }
    };
    
    console.log('🔧 [Test] Credential data:', JSON.stringify(credentialData, null, 2));
    
    const response = await fetch(`${config.n8n.url}/api/v1/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': config.n8n.apiKey
      },
      body: JSON.stringify(credentialData)
    });
    
    console.log('🔧 [Test] Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ [Test] Credential SMTP créé avec SSL:', result.id);
      return result;
    } else {
      const error = await response.text();
      console.error('❌ [Test] Erreur création credential:', error);
      throw new Error(`Erreur ${response.status}: ${error}`);
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur test credential:', error);
    throw error;
  }
}

async function testWorkflowActivation() {
  console.log('🔧 [Test] Test d\'activation de workflow...');
  
  try {
    // Récupérer un workflow existant
    const workflowsResponse = await fetch(`${config.n8n.url}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': config.n8n.apiKey
      }
    });
    
    if (!workflowsResponse.ok) {
      throw new Error(`Erreur récupération workflows: ${workflowsResponse.status}`);
    }
    
    const workflows = await workflowsResponse.json();
    console.log('🔧 [Test] Workflows trouvés:', workflows.length);
    
    if (workflows.length > 0) {
      const testWorkflow = workflows[0];
      console.log('🔧 [Test] Test activation workflow:', testWorkflow.id);
      
      const activateResponse = await fetch(`${config.n8n.url}/api/v1/workflows/${testWorkflow.id}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': config.n8n.apiKey
        }
      });
      
      console.log('🔧 [Test] Activation response:', activateResponse.status);
      
      if (activateResponse.ok) {
        const result = await activateResponse.json();
        console.log('✅ [Test] Workflow activé avec succès');
        return result;
      } else {
        const error = await activateResponse.text();
        console.error('❌ [Test] Erreur activation:', error);
        throw new Error(`Erreur activation ${activateResponse.status}: ${error}`);
      }
    } else {
      console.log('⚠️ [Test] Aucun workflow trouvé pour le test');
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur test activation:', error);
    throw error;
  }
}

async function testCompleteFlow() {
  console.log('🚀 [Test] Démarrage du test complet...');
  console.log('🔧 [Test] Configuration n8n:', {
    url: config.n8n.url,
    hasApiKey: !!config.n8n.apiKey
  });
  
  try {
    // Test 1: Création credential SMTP avec SSL
    console.log('\n📧 [Test] === Test 1: Création Credential SMTP avec SSL ===');
    const credential = await testSmtpCredentialCreation();
    
    // Test 2: Activation workflow
    console.log('\n🔄 [Test] === Test 2: Activation Workflow ===');
    await testWorkflowActivation();
    
    console.log('\n✅ [Test] === Tous les tests sont passés avec succès ===');
    console.log('🔧 [Test] Les corrections sont fonctionnelles');
    
  } catch (error) {
    console.error('\n❌ [Test] === Échec des tests ===');
    console.error('❌ [Test] Erreur:', error.message);
    process.exit(1);
  }
}

// Exécuter les tests
testCompleteFlow();
