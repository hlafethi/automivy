import fetch from 'node-fetch';

async function testAdminCredentials() {
  try {
    console.log('🔍 Test des credentials admin...');
    
    // Se connecter en tant qu'admin
    console.log('1️⃣ Connexion admin...');
    const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@automivy.com',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('   Status:', loginResponse.status);
    
    if (!loginData.token) {
      console.log('❌ Pas de token, impossible de tester');
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('');
    console.log('2️⃣ Récupération des credentials n8n...');
    
    const credentialsResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'GET',
      headers
    });
    
    console.log('   Status:', credentialsResponse.status);
    
    if (credentialsResponse.ok) {
      const credentials = await credentialsResponse.json();
      console.log('✅ Credentials récupérés !');
      console.log('   Nombre:', credentials.length);
      
      console.log('');
      console.log('3️⃣ Analyse des credentials...');
      
      let openRouterFound = false;
      let smtpFound = false;
      
      credentials.forEach((cred, index) => {
        console.log(`   ${index + 1}. ${cred.name} (${cred.type}) [ID: ${cred.id}]`);
        
        if (cred.name.toLowerCase().includes('openrouter') || 
            cred.name.toLowerCase().includes('llm') || 
            cred.name.toLowerCase().includes('ai') ||
            cred.name.toLowerCase().includes('admin')) {
          openRouterFound = true;
          console.log(`      ✅ Credential OpenRouter/LLM trouvé: ${cred.id}`);
        }
        
        if (cred.name.toLowerCase().includes('smtp') || 
            cred.name.toLowerCase().includes('email') ||
            cred.name.toLowerCase().includes('mail')) {
          smtpFound = true;
          console.log(`      ✅ Credential SMTP/Email trouvé: ${cred.id}`);
        }
      });
      
      console.log('');
      console.log('4️⃣ Résumé:');
      console.log(`   OpenRouter trouvé: ${openRouterFound ? '✅' : '❌'}`);
      console.log(`   SMTP trouvé: ${smtpFound ? '✅' : '❌'}`);
      
      if (!openRouterFound) {
        console.log('');
        console.log('⚠️  Aucun credential OpenRouter trouvé !');
        console.log('   Il faut créer un credential OpenRouter dans n8n');
      }
      
    } else {
      const error = await credentialsResponse.text();
      console.log('❌ Erreur récupération credentials:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testAdminCredentials();
