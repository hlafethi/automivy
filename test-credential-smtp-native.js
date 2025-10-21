import fetch from 'node-fetch';

// Configuration
const N8N_URL = 'http://localhost:5678';
const N8N_API_KEY = 'n8n_api_1234567890abcdef';

// Test de création d'un credential SMTP natif avec SSL/TLS
async function testSmtpCredentialCreation() {
  console.log('🧪 [Test] Création credential SMTP natif avec SSL/TLS...');
  
  // Payload exact pour garantir le bouton SSL/TLS activé
  const smtpCredentialData = {
    name: "SMTP-TEST-NATIVE",
    type: "smtp",
    data: {
      host: "smtp.gmail.com",
      user: "test@example.com",
      password: "test_password",
      port: 465,
      secure: true,           // ← CRUCIAL pour SSL/TLS, coche le bouton dans UI
      disableStartTls: true,  // ← Empêche n8n de tenter STARTTLS (inutile sur 465)
      tls: {
        rejectUnauthorized: false,
        secureProtocol: "TLSv1_2_method"
      }
    }
  };

  console.log('📤 [Test] Payload SMTP natif:', JSON.stringify(smtpCredentialData, null, 2));

  try {
    const response = await fetch(`${N8N_URL}/api/v1/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY,
      },
      body: JSON.stringify(smtpCredentialData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur création credential SMTP: ${response.status} - ${errorText}`);
    }

    const credential = await response.json();
    console.log('✅ [Test] Credential SMTP natif créé avec succès !');
    console.log('📋 [Test] Détails du credential:');
    console.log('  - ID:', credential.id);
    console.log('  - Name:', credential.name);
    console.log('  - Type:', credential.type);
    console.log('  - Created:', credential.createdAt);
    
    return credential;
    
  } catch (error) {
    console.error('❌ [Test] Erreur création credential SMTP natif:', error);
    throw error;
  }
}

// Test de création d'un workflow avec le credential
async function testWorkflowWithCredential(credentialId) {
  console.log('🧪 [Test] Création workflow avec credential SMTP...');
  
  const workflowData = {
    name: "Test Workflow SMTP Native",
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
            id: credentialId,
            name: "SMTP-TEST-NATIVE"
          }
        }
      }
    ],
    connections: {},
    settings: {}
  };

  try {
    const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
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
    const response = await fetch(`${N8N_URL}/api/v1/workflows/${workflowId}/activate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
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
    console.log('🚀 [Test] Début des tests SMTP natif...');
    
    // Test 1: Création du credential SMTP
    const credential = await testSmtpCredentialCreation();
    
    // Test 2: Création du workflow
    const workflow = await testWorkflowWithCredential(credential.id);
    
    // Test 3: Activation du workflow
    await testWorkflowActivation(workflow.id);
    
    console.log('🎉 [Test] Tous les tests sont passés avec succès !');
    console.log('📋 [Test] Résumé:');
    console.log('  - Credential SMTP créé avec SSL/TLS natif');
    console.log('  - Workflow créé avec référence au credential');
    console.log('  - Workflow activé automatiquement');
    
  } catch (error) {
    console.error('❌ [Test] Échec des tests:', error);
    process.exit(1);
  }
}

// Lancer les tests
runTests();
