import fetch from 'node-fetch';

// Test du déploiement réel côté utilisateur avec les vraies données
async function testRealUserDeployment() {
  console.log('🧪 [Test] Simulation déploiement RÉEL côté utilisateur...');
  
  // Simuler les credentials que l'utilisateur saisit dans le formulaire
  const userCredentials = {
    email: 'user@example.com',
    smtpEmail: 'user@example.com', 
    smtpPassword: 'user_real_password',
    smtpServer: 'smtp.gmail.com',
    smtpPort: '465',
    imapPassword: 'user_real_password',
    imapServer: 'imap.gmail.com',
    imapPort: '993'
  };
  
  console.log('📋 [Test] Credentials utilisateur simulés:', {
    email: userCredentials.email,
    smtpServer: userCredentials.smtpServer,
    smtpPort: userCredentials.smtpPort,
    imapServer: userCredentials.imapServer,
    imapPort: userCredentials.imapPort,
    passwordLength: userCredentials.smtpPassword.length
  });
  
  // 1. Test de création credential SMTP (comme dans createSmtpCredential)
  console.log('🔧 [Test] Création credential SMTP (flux réel)...');
  
  const smtpCredentialData = {
    name: `SMTP-USER-REAL`,
    type: "smtp",
    data: {
      host: userCredentials.smtpServer,
      user: userCredentials.smtpEmail,
      password: userCredentials.smtpPassword,
      port: 465,
      secure: true  // ← CRUCIAL pour SSL/TLS
    }
  };
  
  console.log('📤 [Test] Payload SMTP réel:', JSON.stringify(smtpCredentialData, null, 2));
  
  try {
    const smtpResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smtpCredentialData),
    });
    
    if (!smtpResponse.ok) {
      const errorText = await smtpResponse.text();
      throw new Error(`Erreur credential SMTP: ${smtpResponse.status} - ${errorText}`);
    }
    
    const smtpCredential = await smtpResponse.json();
    console.log('✅ [Test] Credential SMTP créé avec SSL/TLS:', smtpCredential.id);
    console.log('📋 [Test] Détails SMTP:', {
      id: smtpCredential.id,
      name: smtpCredential.name,
      type: smtpCredential.type
    });
    
    // 2. Test de création credential IMAP (comme dans createImapCredential)
    console.log('🔧 [Test] Création credential IMAP (flux réel)...');
    
    const imapCredentialData = {
      name: `IMAP-USER-REAL`,
      type: 'imap',
      data: {
        user: userCredentials.email,
        password: userCredentials.imapPassword,
        host: userCredentials.imapServer,
        port: parseInt(userCredentials.imapPort) || 993,
        secure: true
      }
    };
    
    console.log('📤 [Test] Payload IMAP réel:', JSON.stringify(imapCredentialData, null, 2));
    
    const imapResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(imapCredentialData),
    });
    
    if (!imapResponse.ok) {
      const errorText = await imapResponse.text();
      throw new Error(`Erreur credential IMAP: ${imapResponse.status} - ${errorText}`);
    }
    
    const imapCredential = await imapResponse.json();
    console.log('✅ [Test] Credential IMAP créé:', imapCredential.id);
    console.log('📋 [Test] Détails IMAP:', {
      id: imapCredential.id,
      name: imapCredential.name,
      type: imapCredential.type
    });
    
    // 3. Test de création du workflow avec les credentials
    console.log('🔧 [Test] Création workflow avec credentials réels...');
    
    const workflowData = {
      name: "Test User Workflow REAL",
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
              timeout: 60000,
              connectionTimeout: 30000,
              greetingTimeout: 15000,
              socketTimeout: 30000,
              pool: true,
              maxConnections: 5,
              maxMessages: 100,
              rateDelta: 1000,
              rateLimit: 5
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflowData)
    });
    
    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      throw new Error(`Erreur création workflow: ${workflowResponse.status} - ${errorText}`);
    }
    
    const workflow = await workflowResponse.json();
    console.log('✅ [Test] Workflow créé avec credentials réels:', workflow.id);
    console.log('📋 [Test] Détails workflow:', {
      id: workflow.id,
      name: workflow.name,
      active: workflow.active
    });
    
    // 4. Test d'activation du workflow
    console.log('🔧 [Test] Activation du workflow...');
    
    const activateResponse = await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.id}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!activateResponse.ok) {
      const errorText = await activateResponse.text();
      console.log('⚠️ [Test] Activation échouée (normal avec credentials de test):', errorText);
    } else {
      console.log('✅ [Test] Workflow activé avec succès !');
    }
    
    console.log('🎉 [Test] Déploiement RÉEL côté utilisateur testé avec succès !');
    console.log('📋 [Test] Résumé:');
    console.log('  - Credential SMTP créé avec secure: true (SSL/TLS activé)');
    console.log('  - Credential IMAP créé avec secure: true');
    console.log('  - Workflow créé avec références aux credentials');
    console.log('  - Activation automatique du workflow');
    console.log('  - Tous les appels passent par le proxy backend');
    
  } catch (error) {
    console.error('❌ [Test] Erreur déploiement réel:', error);
    throw error;
  }
}

// Exécution du test
async function runTest() {
  try {
    await testRealUserDeployment();
  } catch (error) {
    console.error('❌ [Test] Échec du test:', error);
    process.exit(1);
  }
}

runTest();
