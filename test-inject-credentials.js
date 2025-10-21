import fetch from 'node-fetch';

// Test de la fonction injectUserCredentials complète
async function testInjectUserCredentials() {
  console.log('🧪 [Test] Test injection credentials complète...');
  
  // Simuler un workflow template (comme dans smartDeploy.js)
  const workflowTemplate = {
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
          fromEmail: "{{USER_EMAIL}}",
          replyTo: "{{USER_EMAIL}}"
        },
        credentials: {
          smtp: {
            id: "USER_SMTP_CREDENTIAL_ID",
            name: "USER_SMTP_CREDENTIAL_NAME"
          }
        }
      }
    ],
    connections: {},
    settings: {}
  };
  
  // Simuler les credentials utilisateur (comme dans smartDeploy.js)
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
  
  const userId = 'test-user-123';
  
  console.log('📋 [Test] Workflow template:', JSON.stringify(workflowTemplate, null, 2));
  console.log('📋 [Test] User credentials:', userCredentials);
  console.log('📋 [Test] User ID:', userId);
  
  // Simuler l'injection des credentials (comme dans credentialInjector.js)
  console.log('🔧 [Test] Simulation injection credentials...');
  
  // 1. Créer credential SMTP
  console.log('🔧 [Test] Création credential SMTP...');
  const smtpCredentialData = {
    name: `SMTP-${userId}`,
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
  
  // 2. Créer credential IMAP
  console.log('🔧 [Test] Création credential IMAP...');
  const imapCredentialData = {
    name: `IMAP-${userId}`,
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
  
  // 3. Simuler l'injection dans le workflow
  console.log('🔧 [Test] Injection dans le workflow...');
  
  const injectedWorkflow = JSON.parse(JSON.stringify(workflowTemplate));
  
  // Remplacer les credentials dans les nœuds
  injectedWorkflow.nodes = injectedWorkflow.nodes.map(node => {
    const updatedNode = { ...node };
    
    if (node.credentials && Object.keys(node.credentials).length > 0) {
      const updatedCredentials = {};
      
      Object.entries(node.credentials).forEach(([credType, credValue]) => {
        if (credType === 'smtp' && credValue.id === 'USER_SMTP_CREDENTIAL_ID') {
          updatedCredentials[credType] = {
            id: smtpCredential.id,
            name: smtpCredential.name
          };
          console.log(`✅ [Test] Credential SMTP remplacé: ${smtpCredential.id}`);
        } else {
          updatedCredentials[credType] = credValue;
        }
      });
      
      updatedNode.credentials = updatedCredentials;
    }
    
    // Remplacer les placeholders dans les paramètres
    if (node.parameters) {
      const updatedParameters = { ...node.parameters };
      
      Object.keys(updatedParameters).forEach(paramKey => {
        if (typeof updatedParameters[paramKey] === 'string') {
          if (updatedParameters[paramKey].includes('{{USER_EMAIL}}')) {
            updatedParameters[paramKey] = updatedParameters[paramKey].replace('{{USER_EMAIL}}', userCredentials.email);
            console.log(`✅ [Test] Paramètre ${paramKey} mis à jour avec l'email utilisateur`);
          }
        }
      });
      
      updatedNode.parameters = updatedParameters;
    }
    
    return updatedNode;
  });
  
  console.log('📋 [Test] Workflow injecté:', JSON.stringify(injectedWorkflow, null, 2));
  
  // 4. Créer le workflow avec les credentials injectés
  console.log('🔧 [Test] Création workflow avec credentials injectés...');
  
  const workflowData = {
    name: "Test Injected Workflow",
    nodes: injectedWorkflow.nodes,
    connections: injectedWorkflow.connections,
    settings: injectedWorkflow.settings
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
  console.log('✅ [Test] Workflow créé avec credentials injectés:', workflow.id);
  console.log('📋 [Test] Workflow initial - active:', workflow.active);
  
  // 5. Activer le workflow
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
  
  // 6. Vérifier le statut final
  console.log('🔧 [Test] Vérification du statut final...');
  
  const statusResponse = await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (statusResponse.ok) {
    const finalWorkflow = await statusResponse.json();
    console.log('📋 [Test] Statut final:');
    console.log('  - ID:', finalWorkflow.id);
    console.log('  - Name:', finalWorkflow.name);
    console.log('  - Active:', finalWorkflow.active);
    console.log('  - Credentials SMTP:', finalWorkflow.nodes[0].credentials.smtp);
  }
  
  console.log('🎉 [Test] Test injection credentials terminé !');
}

// Exécution du test
async function runTest() {
  try {
    await testInjectUserCredentials();
  } catch (error) {
    console.error('❌ [Test] Échec du test:', error);
    process.exit(1);
  }
}

runTest();
