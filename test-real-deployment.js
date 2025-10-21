import fetch from 'node-fetch';
import fs from 'fs';

// Test de déploiement réel avec authentification
async function testRealDeployment() {
  console.log('🧪 [REAL-TEST] ==========================================');
  console.log('🧪 [REAL-TEST] TEST DÉPLOIEMENT RÉEL AVEC AUTH');
  console.log('🧪 [REAL-TEST] ==========================================');
  
  // 1. Se connecter pour obtenir un token
  console.log('\n🔧 [REAL-TEST] 1. Connexion pour obtenir un token...');
  let token = null;
  try {
    const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@heleam.com',
        password: 'admin123'
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      token = loginData.token;
      console.log('✅ [REAL-TEST] Connexion réussie, token obtenu');
    } else {
      console.log('❌ [REAL-TEST] Erreur de connexion:', loginResponse.status);
      return;
    }
  } catch (error) {
    console.log('❌ [REAL-TEST] Erreur connexion:', error.message);
    return;
  }
  
  // 2. Récupérer les workflows disponibles
  console.log('\n🔧 [REAL-TEST] 2. Récupération des workflows disponibles...');
  try {
    const workflowsResponse = await fetch('http://localhost:3004/api/smart-deploy/workflows', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (workflowsResponse.ok) {
      const workflowsData = await workflowsResponse.json();
      console.log('✅ [REAL-TEST] Workflows récupérés:', workflowsData.workflows.length);
      
      if (workflowsData.workflows.length === 0) {
        console.log('⚠️ [REAL-TEST] Aucun workflow disponible pour le test');
        return;
      }
      
      const firstWorkflow = workflowsData.workflows[0];
      console.log('📋 [REAL-TEST] Premier workflow:', firstWorkflow.name);
      
      // 3. Analyser le workflow
      console.log('\n🔧 [REAL-TEST] 3. Analyse du workflow...');
      const analyzeResponse = await fetch('http://localhost:3004/api/smart-deploy/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ workflowId: firstWorkflow.id })
      });
      
      if (analyzeResponse.ok) {
        const analyzeData = await analyzeResponse.json();
        console.log('✅ [REAL-TEST] Workflow analysé:', analyzeData.workflow.name);
        console.log('📋 [REAL-TEST] Credentials requis:', analyzeData.requiredCredentials.length);
        
        // 4. Déployer le workflow avec des credentials de test
        console.log('\n🔧 [REAL-TEST] 4. Déploiement du workflow...');
        const deployData = {
          workflowId: firstWorkflow.id,
          credentials: {
            email: 'test@example.com',
            smtpEmail: 'test@example.com',
            smtpPassword: 'test_password',
            smtpServer: 'smtp.gmail.com',
            smtpPort: '465',
            imapPassword: 'test_password',
            imapServer: 'imap.gmail.com',
            imapPort: '993'
          }
        };
        
        console.log('📋 [REAL-TEST] Données de déploiement:', JSON.stringify(deployData, null, 2));
        
        const deployResponse = await fetch('http://localhost:3004/api/smart-deploy/deploy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(deployData)
        });
        
        console.log('🔧 [REAL-TEST] Réponse déploiement:', deployResponse.status, deployResponse.statusText);
        
        if (deployResponse.ok) {
          const deployResult = await deployResponse.json();
          console.log('✅ [REAL-TEST] Workflow déployé avec succès:', deployResult.workflow.name);
          console.log('📋 [REAL-TEST] ID workflow n8n:', deployResult.workflow.n8n_workflow_id);
        } else {
          const errorText = await deployResponse.text();
          console.log('❌ [REAL-TEST] Erreur déploiement:', errorText);
        }
        
      } else {
        const errorText = await analyzeResponse.text();
        console.log('❌ [REAL-TEST] Erreur analyse:', errorText);
      }
      
    } else {
      const errorText = await workflowsResponse.text();
      console.log('❌ [REAL-TEST] Erreur récupération workflows:', errorText);
    }
  } catch (error) {
    console.log('❌ [REAL-TEST] Erreur test workflows:', error.message);
  }
  
  // 5. Vérifier les logs backend
  console.log('\n🔧 [REAL-TEST] 5. Vérification logs backend...');
  try {
    if (fs.existsSync('backend-logs.txt')) {
      const logs = fs.readFileSync('backend-logs.txt', 'utf8');
      console.log('📋 [REAL-TEST] Logs backend trouvés:');
      console.log('=====================================');
      console.log(logs);
      console.log('=====================================');
    } else {
      console.log('⚠️ [REAL-TEST] Aucun fichier backend-logs.txt trouvé');
    }
  } catch (error) {
    console.log('❌ [REAL-TEST] Erreur lecture logs:', error.message);
  }
  
  console.log('\n🎉 [REAL-TEST] Test de déploiement réel terminé !');
}

// Exécution du test
async function runRealTest() {
  try {
    await testRealDeployment();
  } catch (error) {
    console.error('❌ [REAL-TEST] Échec du test:', error);
    process.exit(1);
  }
}

runRealTest();