import fetch from 'node-fetch';

// Test du déploiement avec logs détaillés
async function testDeploymentWithLogs() {
  console.log('🧪 [Test] Test déploiement avec logs détaillés...');
  
  // Simuler les credentials utilisateur
  const userCredentials = {
    email: 'user@example.com',
    smtpEmail: 'user@example.com',
    smtpPassword: 'user_password',
    smtpServer: 'smtp.gmail.com',
    smtpPort: '465',
    imapPassword: 'user_password',
    imapServer: 'imap.gmail.com',
    imapPort: '993'
  };
  
  console.log('📋 [Test] Credentials utilisateur:', {
    email: userCredentials.email,
    smtpServer: userCredentials.smtpServer,
    smtpPort: userCredentials.smtpPort
  });
  
  // 1. Créer les credentials (comme dans credentialInjector.js)
  console.log('🔧 [Test] Création credentials...');
  
  // Credential SMTP
  const smtpCredentialData = {
    name: "SMTP-USER-LOGS",
    type: "smtp",
    data: {
      host: userCredentials.smtpServer,
      user: userCredentials.smtpEmail,
      password: userCredentials.smtpPassword,
      port: 465,
      secure: true
    }
  };
  
  const smtpResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(smtpCredentialData),
  });
  
  if (!smtpResponse.ok) {
    throw new Error(`Erreur credential SMTP: ${smtpResponse.status}`);
  }
  
  const smtpCredential = await smtpResponse.json();
  console.log('✅ [Test] Credential SMTP créé:', smtpCredential.id);
  
  // Credential IMAP
  const imapCredentialData = {
    name: "IMAP-USER-LOGS",
    type: "imap",
    data: {
      user: userCredentials.email,
      password: userCredentials.imapPassword,
      host: userCredentials.imapServer,
      port: 993,
      secure: true
    }
  };
  
  const imapResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(imapCredentialData),
  });
  
  if (!imapResponse.ok) {
    throw new Error(`Erreur credential IMAP: ${imapResponse.status}`);
  }
  
  const imapCredential = await imapResponse.json();
  console.log('✅ [Test] Credential IMAP créé:', imapCredential.id);
  
  // 2. Créer le workflow (comme dans smartDeploy.js)
  console.log('🔧 [Test] Création workflow...');
  
  const workflowData = {
    name: "Test User Workflow LOGS",
    nodes: [
      {
        id: "send-email-node",
        name: "Send Email",
        type: "n8n-nodes-base.emailSend",
        typeVersion: 2.1,
        position: [160, 16],
        parameters: {
          html: "Test email content",
          subject: "Test Subject",
          toEmail: "recipient@example.com",
          fromEmail: userCredentials.email,
          replyTo: userCredentials.email,
          options: {
            retryOnFail: true,
            retryTimes: 5,
            retryDelay: 10000,
            timeout: 60000
          }
        },
        credentials: {
          smtp: {
            id: smtpCredential.id,
            name: smtpCredential.name
          }
        }
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
  
  if (!workflowResponse.ok) {
    const errorText = await workflowResponse.text();
    throw new Error(`Erreur création workflow: ${workflowResponse.status} - ${errorText}`);
  }
  
  const workflow = await workflowResponse.json();
  console.log('✅ [Test] Workflow créé:', workflow.id);
  console.log('📋 [Test] Workflow initial - active:', workflow.active);
  
  // 3. Test d'activation (comme dans smartDeploy.js)
  console.log('🔧 [Test] Activation du workflow...');
  console.log('🔧 [Test] Workflow ID à activer:', workflow.id);
  
  try {
    const activateResponse = await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.id}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('🔧 [Test] Réponse activation:', activateResponse.status, activateResponse.statusText);
    
    if (activateResponse.ok) {
      const activateResult = await activateResponse.json();
      console.log('✅ [Test] Workflow activé avec succès:', activateResult);
    } else {
      const errorText = await activateResponse.text();
      console.log('⚠️ [Test] Impossible d\'activer le workflow:', errorText);
      console.log('⚠️ [Test] Status:', activateResponse.status);
    }
  } catch (activateError) {
    console.log('⚠️ [Test] Erreur activation:', activateError.message);
  }
  
  // 4. Vérifier le statut final du workflow
  console.log('🔧 [Test] Vérification du statut final...');
  
  const statusResponse = await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (statusResponse.ok) {
    const finalWorkflow = await statusResponse.json();
    console.log('📋 [Test] Statut final du workflow:');
    console.log('  - ID:', finalWorkflow.id);
    console.log('  - Name:', finalWorkflow.name);
    console.log('  - Active:', finalWorkflow.active);
    console.log('  - Created:', finalWorkflow.createdAt);
  }
  
  console.log('🎉 [Test] Test terminé !');
}

// Exécution du test
async function runTest() {
  try {
    await testDeploymentWithLogs();
  } catch (error) {
    console.error('❌ [Test] Échec du test:', error);
    process.exit(1);
  }
}

runTest();
