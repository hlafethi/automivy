import fetch from 'node-fetch';
import fs from 'fs';

// Script de diagnostic complet pour le déploiement
async function debugDeploymentComplete() {
  console.log('🔍 [DEBUG] ==========================================');
  console.log('🔍 [DEBUG] DIAGNOSTIC DÉPLOIEMENT COMPLET');
  console.log('🔍 [DEBUG] ==========================================');
  console.log('🔍 [DEBUG] Timestamp:', new Date().toISOString());
  
  // 1. Vérifier la connectivité backend
  console.log('\n🔧 [DEBUG] 1. Test connectivité backend...');
  try {
    const healthResponse = await fetch('http://localhost:3004/api/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (healthResponse.ok) {
      console.log('✅ [DEBUG] Backend accessible');
    } else {
      console.log('❌ [DEBUG] Backend non accessible:', healthResponse.status);
    }
  } catch (error) {
    console.log('❌ [DEBUG] Erreur connectivité backend:', error.message);
  }
  
  // 2. Vérifier la connectivité n8n
  console.log('\n🔧 [DEBUG] 2. Test connectivité n8n...');
  try {
    const n8nResponse = await fetch('http://localhost:3004/api/n8n/workflows', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (n8nResponse.ok) {
      const workflows = await n8nResponse.json();
      console.log('✅ [DEBUG] n8n accessible, workflows:', workflows.data?.length || 0);
    } else {
      console.log('❌ [DEBUG] n8n non accessible:', n8nResponse.status);
    }
  } catch (error) {
    console.log('❌ [DEBUG] Erreur connectivité n8n:', error.message);
  }
  
  // 3. Test création credentials avec SSL
  console.log('\n🔧 [DEBUG] 3. Test création credentials SMTP avec SSL...');
  try {
    const smtpCredentialData = {
      name: "DEBUG-SMTP-SSL-TEST",
      type: "smtp",
      data: {
        host: "smtp.gmail.com",
        user: "test@example.com",
        password: "test_password",
        port: 465,
        secure: true,
        tls: {
          rejectUnauthorized: false
        }
      }
    };
    
    console.log('🔧 [DEBUG] Données credential SMTP:', JSON.stringify(smtpCredentialData, null, 2));
    
    const smtpResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(smtpCredentialData)
    });
    
    console.log('🔧 [DEBUG] Réponse SMTP:', smtpResponse.status, smtpResponse.statusText);
    
    if (smtpResponse.ok) {
      const smtpCredential = await smtpResponse.json();
      console.log('✅ [DEBUG] Credential SMTP créé:', smtpCredential.id);
      
      // Nettoyer le credential de test
      await fetch(`http://localhost:3004/api/n8n/credentials/${smtpCredential.id}`, {
        method: 'DELETE'
      });
      console.log('🧹 [DEBUG] Credential de test supprimé');
    } else {
      const errorText = await smtpResponse.text();
      console.log('❌ [DEBUG] Erreur création credential SMTP:', errorText);
    }
  } catch (error) {
    console.log('❌ [DEBUG] Erreur test credential SMTP:', error.message);
  }
  
  // 4. Test création workflow simple
  console.log('\n🔧 [DEBUG] 4. Test création workflow simple...');
  try {
    const workflowData = {
      name: "DEBUG-WORKFLOW-TEST",
      nodes: [
        {
          id: "debug-node",
          name: "Debug Node",
          type: "n8n-nodes-base.noOp",
          typeVersion: 1,
          position: [160, 16],
          parameters: {}
        }
      ],
      connections: {},
      settings: {}
    };
    
    const workflowResponse = await fetch('http://localhost:3004/api/n8n/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflowData)
    });
    
    console.log('🔧 [DEBUG] Réponse workflow:', workflowResponse.status, workflowResponse.statusText);
    
    if (workflowResponse.ok) {
      const workflow = await workflowResponse.json();
      console.log('✅ [DEBUG] Workflow créé:', workflow.id);
      console.log('📋 [DEBUG] Workflow initial - active:', workflow.active);
      
      // 5. Test activation automatique
      console.log('\n🔧 [DEBUG] 5. Test activation automatique...');
      try {
        const activateResponse = await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.id}/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('🔧 [DEBUG] Réponse activation:', activateResponse.status, activateResponse.statusText);
        
        if (activateResponse.ok) {
          const activateResult = await activateResponse.json();
          console.log('✅ [DEBUG] Workflow activé avec succès:', activateResult);
        } else {
          const errorText = await activateResponse.text();
          console.log('⚠️ [DEBUG] Impossible d\'activer le workflow:', errorText);
        }
      } catch (activateError) {
        console.log('⚠️ [DEBUG] Erreur activation:', activateError.message);
      }
      
      // 6. Vérifier le statut final
      console.log('\n🔧 [DEBUG] 6. Vérification statut final...');
      const statusResponse = await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (statusResponse.ok) {
        const finalWorkflow = await statusResponse.json();
        console.log('📋 [DEBUG] Statut final du workflow:');
        console.log('  - ID:', finalWorkflow.id);
        console.log('  - Name:', finalWorkflow.name);
        console.log('  - Active:', finalWorkflow.active);
        console.log('  - Created:', finalWorkflow.createdAt);
      }
      
      // Nettoyer le workflow de test
      await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.id}`, {
        method: 'DELETE'
      });
      console.log('🧹 [DEBUG] Workflow de test supprimé');
      
    } else {
      const errorText = await workflowResponse.text();
      console.log('❌ [DEBUG] Erreur création workflow:', errorText);
    }
  } catch (error) {
    console.log('❌ [DEBUG] Erreur test workflow:', error.message);
  }
  
  // 7. Vérifier les logs backend
  console.log('\n🔧 [DEBUG] 7. Vérification logs backend...');
  try {
    if (fs.existsSync('backend-logs.txt')) {
      const logs = fs.readFileSync('backend-logs.txt', 'utf8');
      console.log('📋 [DEBUG] Logs backend trouvés:');
      console.log(logs);
    } else {
      console.log('⚠️ [DEBUG] Aucun fichier backend-logs.txt trouvé');
    }
  } catch (error) {
    console.log('❌ [DEBUG] Erreur lecture logs:', error.message);
  }
  
  console.log('\n🎉 [DEBUG] Diagnostic terminé !');
}

// Exécution du diagnostic
async function runDebug() {
  try {
    await debugDeploymentComplete();
  } catch (error) {
    console.error('❌ [DEBUG] Échec du diagnostic:', error);
    process.exit(1);
  }
}

runDebug();
