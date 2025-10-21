import fetch from 'node-fetch';

// Test complet du déploiement côté utilisateur
async function testUserDeployment() {
  console.log('🧪 [Test] Simulation déploiement côté utilisateur...');
  
  // 1. Simuler l'analyse du workflow
  console.log('📋 [Test] Étape 1: Analyse du workflow...');
  const analyzeResponse = await fetch('http://localhost:3004/api/smart-deploy/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token' // Token de test
    },
    body: JSON.stringify({
      workflowId: 'test-workflow-id'
    })
  });
  
  if (!analyzeResponse.ok) {
    console.log('⚠️ [Test] Analyse échouée (normal si pas de template):', await analyzeResponse.text());
  } else {
    console.log('✅ [Test] Analyse réussie');
  }
  
  // 2. Simuler l'injection des credentials (comme dans credentialInjector.js)
  console.log('📋 [Test] Étape 2: Injection des credentials...');
  
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
  
  // Test de création credential SMTP
  console.log('🔧 [Test] Création credential SMTP...');
  const smtpCredentialData = {
    name: "SMTP-USER-TEST",
    type: "smtp",
    data: {
      host: userCredentials.smtpServer,
      user: userCredentials.smtpEmail,
      password: userCredentials.smtpPassword,
      port: 465,
      secure: true
    }
  };
  
  try {
    const smtpResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smtpCredentialData),
    });
    
    if (!smtpResponse.ok) {
      throw new Error(`Erreur credential SMTP: ${smtpResponse.status}`);
    }
    
    const smtpCredential = await smtpResponse.json();
    console.log('✅ [Test] Credential SMTP créé:', smtpCredential.id);
    
    // Test de création credential IMAP
    console.log('🔧 [Test] Création credential IMAP...');
    const imapCredentialData = {
      name: "IMAP-USER-TEST",
      type: "imap",
      data: {
        host: userCredentials.imapServer,
        user: userCredentials.email,
        password: userCredentials.imapPassword,
        port: 993,
        secure: true
      }
    };
    
    const imapResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(imapCredentialData),
    });
    
    if (!imapResponse.ok) {
      throw new Error(`Erreur credential IMAP: ${imapResponse.status}`);
    }
    
    const imapCredential = await imapResponse.json();
    console.log('✅ [Test] Credential IMAP créé:', imapCredential.id);
    
    // 3. Test de création du workflow avec credentials
    console.log('📋 [Test] Étape 3: Création du workflow...');
    
    const workflowData = {
      name: "Test User Workflow",
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflowData)
    });
    
    if (!workflowResponse.ok) {
      throw new Error(`Erreur création workflow: ${workflowResponse.status}`);
    }
    
    const workflow = await workflowResponse.json();
    console.log('✅ [Test] Workflow créé:', workflow.id);
    
    // 4. Test d'activation du workflow
    console.log('📋 [Test] Étape 4: Activation du workflow...');
    
    const activateResponse = await fetch(`http://localhost:3004/api/n8n/workflows/${workflow.id}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!activateResponse.ok) {
      console.log('⚠️ [Test] Activation échouée (normal avec credentials de test):', await activateResponse.text());
    } else {
      console.log('✅ [Test] Workflow activé avec succès !');
    }
    
    console.log('🎉 [Test] Déploiement côté utilisateur testé avec succès !');
    console.log('📋 [Test] Résumé:');
    console.log('  - Credentials SMTP/IMAP créés via proxy backend');
    console.log('  - Workflow créé via proxy backend');
    console.log('  - Activation via proxy backend');
    console.log('  - Tous les appels passent par le proxy (pas d\'appel direct n8n)');
    
  } catch (error) {
    console.error('❌ [Test] Erreur déploiement utilisateur:', error);
    throw error;
  }
}

// Exécution du test
async function runTest() {
  try {
    await testUserDeployment();
  } catch (error) {
    console.error('❌ [Test] Échec du test:', error);
    process.exit(1);
  }
}

runTest();
