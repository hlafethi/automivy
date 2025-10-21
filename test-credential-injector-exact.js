import fetch from 'node-fetch';

// Test exact de credentialInjector.js
async function testCredentialInjectorExact() {
  console.log('🧪 [Test] Test exact credentialInjector...');
  
  // Simuler exactement les credentials utilisateur
  const userCredentials = {
    email: 'user@heleam.com',
    smtpEmail: 'user@heleam.com',
    smtpPassword: 'user_password',
    smtpServer: 'smtp.gmail.com',
    smtpPort: '465', // String comme dans le test
    imapPassword: 'user_password',
    imapServer: 'imap.gmail.com',
    imapPort: '993'
  };
  
  const userId = 'test-user-123';
  
  console.log('📋 [Test] User credentials:', userCredentials);
  console.log('📋 [Test] User ID:', userId);
  
  // Simuler exactement createSmtpCredential
  console.log('🔧 [Test] Création credential SMTP (simulation credentialInjector)...');
  
  const smtpCredentialData = {
    name: `SMTP-${userId}`,
    type: "smtp",
    data: {
      host: userCredentials.smtpServer || userCredentials.IMAP_SERVER?.replace('imap', 'smtp'),
      user: userCredentials.smtpEmail || userCredentials.email,
      password: userCredentials.smtpPassword,
      port: Number(userCredentials.smtpPort) || 465, // Exactement comme dans le code
      secure: true
    }
  };
  
  console.log('📤 [Test] Payload SMTP natif:', JSON.stringify(smtpCredentialData, null, 2));
  console.log('🔍 [Test] DEBUG - Port type:', typeof smtpCredentialData.data.port);
  console.log('🔍 [Test] DEBUG - Port value:', smtpCredentialData.data.port);
  
  try {
    const response = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smtpCredentialData),
    });
    
    console.log('📋 [Test] Réponse:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ [Test] Erreur création credential SMTP:', errorText);
    } else {
      const credential = await response.json();
      console.log('✅ [Test] Credential SMTP natif créé:', credential.id);
      console.log('📋 [Test] Détails SMTP:', { id: credential.id, name: credential.name, type: credential.type });
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur création credential SMTP natif:', error);
  }
  
  console.log('🎉 [Test] Test credentialInjector exact terminé !');
}

// Exécution du test
async function runTest() {
  try {
    await testCredentialInjectorExact();
  } catch (error) {
    console.error('❌ [Test] Échec du test:', error);
    process.exit(1);
  }
}

runTest();
