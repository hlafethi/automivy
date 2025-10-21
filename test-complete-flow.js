import fetch from 'node-fetch';

// Test du flux complet de déploiement
async function testCompleteFlow() {
  console.log('🧪 [Test] Test flux complet de déploiement...');
  
  // 1. Connexion
  console.log('🔧 [Test] Connexion...');
  const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@heleam.com',
      password: 'user123'
    })
  });
  
  if (!loginResponse.ok) {
    throw new Error(`Erreur connexion: ${loginResponse.status}`);
  }
  
  const loginResult = await loginResponse.json();
  const token = loginResult.token;
  console.log('✅ [Test] Token obtenu');
  
  // 2. Récupérer les workflows
  console.log('🔧 [Test] Récupération des workflows...');
  const workflowsResponse = await fetch('http://localhost:3004/api/smart-deploy/workflows', {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!workflowsResponse.ok) {
    throw new Error(`Erreur workflows: ${workflowsResponse.status}`);
  }
  
  const workflowsResult = await workflowsResponse.json();
  const firstWorkflow = workflowsResult.workflows[0];
  console.log('✅ [Test] Workflow sélectionné:', firstWorkflow.name);
  
  // 3. Analyser le workflow
  console.log('🔧 [Test] Analyse du workflow...');
  const analyzeResponse = await fetch('http://localhost:3004/api/smart-deploy/analyze', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ workflowId: firstWorkflow.id })
  });
  
  if (!analyzeResponse.ok) {
    const errorText = await analyzeResponse.text();
    throw new Error(`Erreur analyse: ${analyzeResponse.status} - ${errorText}`);
  }
  
  const analyzeResult = await analyzeResponse.json();
  console.log('✅ [Test] Workflow analysé:', analyzeResult.requiredCredentials.length, 'credentials requis');
  
  // 4. Test de l'injection des credentials (simulation)
  console.log('🔧 [Test] Simulation injection credentials...');
  
  const userCredentials = {
    email: 'user@heleam.com',
    smtpEmail: 'user@heleam.com',
    smtpPassword: 'user_password',
    smtpServer: 'smtp.gmail.com',
    smtpPort: '465',
    imapPassword: 'user_password',
    imapServer: 'imap.gmail.com',
    imapPort: '993'
  };
  
  // Simuler l'injection comme dans credentialInjector.js
  console.log('🔧 [Test] Création credential SMTP...');
  const smtpCredentialData = {
    name: `SMTP-test-user-${Date.now()}`,
    type: "smtp",
    data: {
      host: userCredentials.smtpServer,
      user: userCredentials.smtpEmail,
      password: userCredentials.smtpPassword,
      port: Number(userCredentials.smtpPort) || 465,
      secure: true
    }
  };
  
  console.log('📤 [Test] Payload SMTP:', JSON.stringify(smtpCredentialData, null, 2));
  
  const smtpResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(smtpCredentialData)
  });
  
  if (!smtpResponse.ok) {
    const errorText = await smtpResponse.text();
    throw new Error(`Erreur credential SMTP: ${smtpResponse.status} - ${errorText}`);
  }
  
  const smtpCredential = await smtpResponse.json();
  console.log('✅ [Test] Credential SMTP créé:', smtpCredential.id);
  
  // 5. Créer le workflow
  console.log('🔧 [Test] Création du workflow...');
  
  const workflowData = {
    name: "Test Complete Flow",
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
          replyTo: userCredentials.email
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
  
  // 6. Activer le workflow
  console.log('🔧 [Test] Activation du workflow...');
  
  const activateResponse = await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.id}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!activateResponse.ok) {
    const errorText = await activateResponse.text();
    throw new Error(`Erreur activation workflow: ${activateResponse.status} - ${errorText}`);
  }
  
  const activateResult = await activateResponse.json();
  console.log('✅ [Test] Workflow activé:', activateResult.active);
  
  console.log('🎉 [Test] Flux complet testé avec succès !');
}

// Exécution du test
async function runTest() {
  try {
    await testCompleteFlow();
  } catch (error) {
    console.error('❌ [Test] Échec du test:', error);
    process.exit(1);
  }
}

runTest();
