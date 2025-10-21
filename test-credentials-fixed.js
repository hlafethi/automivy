import fetch from 'node-fetch';

// Test de création de credentials SMTP avec SSL/TLS via le proxy backend
async function testSmtpCredentialViaProxy() {
  console.log('🧪 [Test] Création credential SMTP via proxy backend...');
  
  // Payload exact pour garantir le bouton SSL/TLS activé
  const smtpCredentialData = {
    name: "SMTP-TEST-PROXY",
    type: "smtp",
    data: {
      host: "smtp.gmail.com",
      user: "test@example.com",
      password: "test_password",
      port: 465,
      secure: true           // ← CRUCIAL pour SSL/TLS, coche le bouton dans UI
    }
  };

  console.log('📤 [Test] Payload SMTP via proxy:', JSON.stringify(smtpCredentialData, null, 2));

  try {
    const response = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smtpCredentialData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur création credential SMTP: ${response.status} - ${errorText}`);
    }

    const credential = await response.json();
    console.log('✅ [Test] Credential SMTP créé avec succès via proxy !');
    console.log('📋 [Test] Détails du credential:');
    console.log('  - ID:', credential.id);
    console.log('  - Name:', credential.name);
    console.log('  - Type:', credential.type);
    console.log('  - Created:', credential.createdAt);
    
    return credential;
    
  } catch (error) {
    console.error('❌ [Test] Erreur création credential SMTP via proxy:', error);
    throw error;
  }
}

// Test de création de credentials IMAP via le proxy backend
async function testImapCredentialViaProxy() {
  console.log('🧪 [Test] Création credential IMAP via proxy backend...');
  
  const imapCredentialData = {
    name: "IMAP-TEST-PROXY",
    type: "imap",
    data: {
      host: "imap.gmail.com",
      user: "test@example.com",
      password: "test_password",
      port: 993,
      secure: true
    }
  };

  console.log('📤 [Test] Payload IMAP via proxy:', JSON.stringify(imapCredentialData, null, 2));

  try {
    const response = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(imapCredentialData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur création credential IMAP: ${response.status} - ${errorText}`);
    }

    const credential = await response.json();
    console.log('✅ [Test] Credential IMAP créé avec succès via proxy !');
    console.log('📋 [Test] Détails du credential:');
    console.log('  - ID:', credential.id);
    console.log('  - Name:', credential.name);
    console.log('  - Type:', credential.type);
    console.log('  - Created:', credential.createdAt);
    
    return credential;
    
  } catch (error) {
    console.error('❌ [Test] Erreur création credential IMAP via proxy:', error);
    throw error;
  }
}

// Test de création d'un workflow avec les credentials
async function testWorkflowWithCredentials(smtpCredentialId, imapCredentialId) {
  console.log('🧪 [Test] Création workflow avec credentials...');
  
  const workflowData = {
    name: "Test Workflow Credentials Fixed",
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
          fromEmail: "test@example.com",
          replyTo: "test@example.com",
          options: {
            retryOnFail: true,
            retryTimes: 5,
            retryDelay: 10000,
            timeout: 60000
          }
        },
        credentials: {
          smtp: {
            id: smtpCredentialId,
            name: "SMTP-TEST-PROXY"
          }
        }
      },
      {
        id: "imap-node",
        name: "IMAP",
        type: "n8n-nodes-base.emailReadImap",
        typeVersion: 2.1,
        position: [160, 200],
        parameters: {
          mailbox: "INBOX",
          format: "resolved"
        },
        credentials: {
          imap: {
            id: imapCredentialId,
            name: "IMAP-TEST-PROXY"
          }
        }
      }
    ],
    connections: {},
    settings: {}
  };

  try {
    const response = await fetch('http://localhost:3004/api/n8n/workflows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflowData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur création workflow: ${response.status} - ${errorText}`);
    }

    const workflow = await response.json();
    console.log('✅ [Test] Workflow créé avec succès !');
    console.log('📋 [Test] Détails du workflow:');
    console.log('  - ID:', workflow.id);
    console.log('  - Name:', workflow.name);
    console.log('  - Active:', workflow.active);
    
    return workflow;
    
  } catch (error) {
    console.error('❌ [Test] Erreur création workflow:', error);
    throw error;
  }
}

// Test d'activation du workflow
async function testWorkflowActivation(workflowId) {
  console.log('🧪 [Test] Activation du workflow...');
  
  try {
    const response = await fetch(`http://localhost:3004/api/n8n/workflows/${workflowId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur activation workflow: ${response.status} - ${errorText}`);
    }

    console.log('✅ [Test] Workflow activé avec succès !');
    
  } catch (error) {
    console.error('❌ [Test] Erreur activation workflow:', error);
    throw error;
  }
}

// Exécution des tests
async function runTests() {
  try {
    console.log('🚀 [Test] Début des tests credentials corrigés...');
    
    // Test 1: Création du credential SMTP
    const smtpCredential = await testSmtpCredentialViaProxy();
    
    // Test 2: Création du credential IMAP
    const imapCredential = await testImapCredentialViaProxy();
    
    // Test 3: Création du workflow
    const workflow = await testWorkflowWithCredentials(smtpCredential.id, imapCredential.id);
    
    // Test 4: Activation du workflow
    await testWorkflowActivation(workflow.id);
    
    console.log('🎉 [Test] Tous les tests sont passés avec succès !');
    console.log('📋 [Test] Résumé:');
    console.log('  - Credential SMTP créé avec SSL/TLS natif');
    console.log('  - Credential IMAP créé avec mot de passe correct');
    console.log('  - Workflow créé avec références aux credentials');
    console.log('  - Workflow activé automatiquement');
    
  } catch (error) {
    console.error('❌ [Test] Échec des tests:', error);
    process.exit(1);
  }
}

// Lancer les tests
runTests();
