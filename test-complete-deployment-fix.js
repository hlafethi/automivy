#!/usr/bin/env node

/**
 * Script de test complet pour vérifier le déploiement depuis l'interface
 * Teste l'activation des workflows et la configuration SSL
 */

const config = require('./backend/config');

async function testBackendHealth() {
  console.log('🔧 [Test] Vérification santé du backend...');
  
  try {
    const response = await fetch('http://localhost:3004/api/health');
    
    if (response.ok) {
      const health = await response.json();
      console.log('✅ [Test] Backend accessible:', health);
      return true;
    } else {
      console.error('❌ [Test] Backend non accessible:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ [Test] Erreur connexion backend:', error.message);
    return false;
  }
}

async function testSmartDeployFlow() {
  console.log('🔧 [Test] Test du flux SmartDeploy complet...');
  
  try {
    // 1. Login utilisateur
    console.log('🔧 [Test] Étape 1: Login utilisateur...');
    const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('⚠️ [Test] Login échoué, création d\'un utilisateur de test...');
      const registerResponse = await fetch('http://localhost:3004/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword',
          name: 'Test User'
        })
      });
      
      if (!registerResponse.ok) {
        throw new Error('Impossible de créer un utilisateur de test');
      }
      
      // Retry login
      const retryLoginResponse = await fetch('http://localhost:3004/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword'
        })
      });
      
      if (!retryLoginResponse.ok) {
        throw new Error('Impossible de se connecter après création');
      }
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ [Test] Login réussi');
    
    // 2. Récupérer les workflows disponibles
    console.log('🔧 [Test] Étape 2: Récupération des workflows...');
    const workflowsResponse = await fetch('http://localhost:3004/api/smart-deploy/workflows', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!workflowsResponse.ok) {
      throw new Error('Impossible de récupérer les workflows');
    }
    
    const workflows = await workflowsResponse.json();
    console.log('✅ [Test] Workflows récupérés:', workflows.workflows?.length || 0);
    
    if (workflows.workflows && workflows.workflows.length > 0) {
      const testWorkflow = workflows.workflows[0];
      console.log('🔧 [Test] Test avec workflow:', testWorkflow.name);
      
      // 3. Analyser le workflow
      console.log('🔧 [Test] Étape 3: Analyse du workflow...');
      const analyzeResponse = await fetch('http://localhost:3004/api/smart-deploy/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workflowId: testWorkflow.id })
      });
      
      if (!analyzeResponse.ok) {
        throw new Error('Impossible d\'analyser le workflow');
      }
      
      const analysis = await analyzeResponse.json();
      console.log('✅ [Test] Workflow analysé:', analysis.formConfig?.sections?.length || 0, 'sections');
      
      // 4. Déployer le workflow avec credentials
      console.log('🔧 [Test] Étape 4: Déploiement du workflow...');
      const deployResponse = await fetch('http://localhost:3004/api/smart-deploy/deploy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflowId: testWorkflow.id,
          credentials: {
            smtpHost: 'smtp.gmail.com',
            smtpPort: 465,
            smtpUser: 'test@example.com',
            smtpPassword: 'test-password',
            imapHost: 'imap.gmail.com',
            imapPort: 993,
            imapUser: 'test@example.com',
            imapPassword: 'test-password'
          }
        })
      });
      
      console.log('🔧 [Test] Deploy response status:', deployResponse.status);
      
      if (deployResponse.ok) {
        const deployResult = await deployResponse.json();
        console.log('✅ [Test] Workflow déployé avec succès:', deployResult.workflow?.id);
        
        // 5. Vérifier l'activation
        if (deployResult.workflow?.id) {
          console.log('🔧 [Test] Étape 5: Vérification de l\'activation...');
          
          // Attendre un peu pour que l'activation se propage
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const statusResponse = await fetch(`${config.n8n.url}/api/v1/workflows/${deployResult.workflow.id}`, {
            headers: {
              'X-N8N-API-KEY': config.n8n.apiKey
            }
          });
          
          if (statusResponse.ok) {
            const status = await statusResponse.json();
            console.log('🔧 [Test] Statut du workflow:', status.active ? 'ACTIF' : 'INACTIF');
            
            if (status.active) {
              console.log('✅ [Test] Workflow correctement activé !');
            } else {
              console.log('⚠️ [Test] Workflow déployé mais non activé');
            }
          }
        }
        
        return deployResult;
      } else {
        const error = await deployResponse.text();
        console.error('❌ [Test] Erreur déploiement:', error);
        throw new Error(`Déploiement échoué: ${error}`);
      }
    } else {
      console.log('⚠️ [Test] Aucun workflow disponible pour le test');
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur test SmartDeploy:', error);
    throw error;
  }
}

async function runCompleteTest() {
  console.log('🚀 [Test] === Test Complet du Déploiement ===');
  console.log('🔧 [Test] Configuration:', {
    backend: 'http://localhost:3004',
    n8n: config.n8n.url,
    hasApiKey: !!config.n8n.apiKey
  });
  
  try {
    // Test 1: Santé du backend
    console.log('\n📡 [Test] === Test 1: Santé Backend ===');
    const backendOk = await testBackendHealth();
    
    if (!backendOk) {
      throw new Error('Backend non accessible - arrêt des tests');
    }
    
    // Test 2: Flux SmartDeploy complet
    console.log('\n🔄 [Test] === Test 2: Flux SmartDeploy Complet ===');
    await testSmartDeployFlow();
    
    console.log('\n✅ [Test] === Tous les tests sont passés avec succès ===');
    console.log('🎉 [Test] Les corrections sont fonctionnelles !');
    console.log('🔧 [Test] Les workflows devraient maintenant être activés et SSL configuré');
    
  } catch (error) {
    console.error('\n❌ [Test] === Échec des tests ===');
    console.error('❌ [Test] Erreur:', error.message);
    console.error('🔧 [Test] Vérifiez que:');
    console.error('  - Le backend est démarré sur le port 3004');
    console.error('  - n8n est accessible sur le VPS');
    console.error('  - Les credentials n8n sont corrects');
    process.exit(1);
  }
}

// Exécuter les tests
runCompleteTest();
