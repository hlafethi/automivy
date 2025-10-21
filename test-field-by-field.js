import fetch from 'node-fetch';

async function testFieldByField() {
  console.log('🧪 [Test] Test champ par champ...');
  
  try {
    // Test avec seulement les champs essentiels
    console.log('🔧 [Test] Test avec champs minimaux...');
    const minimalResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'SMTP-MINIMAL',
        type: 'smtp',
        data: {
          host: 'smtp.gmail.com',
          user: 'test@example.com',
          password: 'test_password',
          port: 465,
          secure: true
        }
      })
    });
    
    console.log('📋 [Test] Réponse minimale:', minimalResponse.status, minimalResponse.statusText);
    
    if (!minimalResponse.ok) {
      const error = await minimalResponse.text();
      console.log('❌ [Test] Erreur minimale:', error);
    } else {
      console.log('✅ [Test] Credential minimal créé');
    }
    
    // Test avec tous les champs possibles
    console.log('🔧 [Test] Test avec tous les champs...');
    const fullResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'SMTP-FULL',
        type: 'smtp',
        data: {
          host: 'smtp.gmail.com',
          user: 'test@example.com',
          password: 'test_password',
          port: 465,
          secure: true,
          disableStartTls: true,
          tls: {
            rejectUnauthorized: false,
            secureProtocol: 'TLSv1_2_method'
          }
        }
      })
    });
    
    console.log('📋 [Test] Réponse complète:', fullResponse.status, fullResponse.statusText);
    
    if (!fullResponse.ok) {
      const error = await fullResponse.text();
      console.log('❌ [Test] Erreur complète:', error);
    } else {
      console.log('✅ [Test] Credential complet créé');
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur:', error);
  }
  
  console.log('🎉 [Test] Test terminé !');
}

testFieldByField();
