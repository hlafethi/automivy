import fetch from 'node-fetch';

async function testCredentialCreationDirect() {
  console.log('🧪 [Test] Test création credential direct...');
  
  try {
    // Test credential SMTP avec tous les types forcés
    console.log('🔧 [Test] Création credential SMTP...');
    const smtpResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'SMTP-TEST-DIRECT',
        type: 'smtp',
        data: {
          host: 'smtp.gmail.com',
          user: 'test@example.com',
          password: 'test_password',
          port: Number(465),
          secure: true
        }
      })
    });
    
    console.log('📋 [Test] Réponse SMTP:', smtpResponse.status, smtpResponse.statusText);
    
    if (!smtpResponse.ok) {
      const error = await smtpResponse.text();
      console.log('❌ [Test] Erreur SMTP:', error);
    } else {
      const smtpCred = await smtpResponse.json();
      console.log('✅ [Test] Credential SMTP créé:', smtpCred.id);
    }
    
    // Test credential IMAP avec tous les types forcés
    console.log('🔧 [Test] Création credential IMAP...');
    const imapResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'IMAP-TEST-DIRECT',
        type: 'imap',
        data: {
          host: 'imap.gmail.com',
          user: 'test@example.com',
          password: 'test_password',
          port: Number(993),
          secure: true
        }
      })
    });
    
    console.log('📋 [Test] Réponse IMAP:', imapResponse.status, imapResponse.statusText);
    
    if (!imapResponse.ok) {
      const error = await imapResponse.text();
      console.log('❌ [Test] Erreur IMAP:', error);
    } else {
      const imapCred = await imapResponse.json();
      console.log('✅ [Test] Credential IMAP créé:', imapCred.id);
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur:', error);
  }
  
  console.log('🎉 [Test] Test terminé !');
}

testCredentialCreationDirect();
