import fetch from 'node-fetch';

// Test direct de l'API n8n pour créer un credential SMTP
async function testN8nDirectAPI() {
  console.log('🔍 Test direct de l\'API n8n pour créer un credential SMTP...');
  
  // Configuration n8n (à adapter selon votre config)
  const n8nUrl = 'http://localhost:5678'; // URL de votre instance n8n
  const n8nApiKey = 'your-n8n-api-key'; // Votre clé API n8n
  
  const credentialData = {
    name: `TEST-SMTP-DIRECT-${Date.now()}`,
    type: 'smtp',
    data: {
      user: 'test@heleam.com',
      password: 'test-password',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      disableStartTls: true
    }
  };
  
  console.log('📤 Données envoyées directement à n8n:');
  console.log(JSON.stringify(credentialData, null, 2));
  
  try {
    const response = await fetch(`${n8nUrl}/api/v1/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
      body: JSON.stringify(credentialData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erreur API n8n directe:', error);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Credential créé directement dans n8n:');
    console.log('  - ID:', result.id);
    console.log('  - Name:', result.name);
    console.log('  - Type:', result.type);
    console.log('  - Data:', result.data);
    
    if (result.data?.secure === true) {
      console.log('✅ SSL/TLS est activé dans le credential !');
    } else {
      console.log('❌ SSL/TLS n\'est PAS activé dans le credential !');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test direct:', error);
  }
}

// Test de l'API backend (proxy)
async function testBackendAPI() {
  console.log('\n🔍 Test de l\'API backend (proxy)...');
  
  const credentialData = {
    name: `TEST-SMTP-BACKEND-${Date.now()}`,
    type: 'smtp',
    data: {
      user: 'test@heleam.com',
      password: 'test-password',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      disableStartTls: true
    }
  };
  
  console.log('📤 Données envoyées au backend:');
  console.log(JSON.stringify(credentialData, null, 2));
  
  try {
    const response = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentialData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erreur API backend:', error);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Credential créé via backend:');
    console.log('  - ID:', result.id);
    console.log('  - Name:', result.name);
    console.log('  - Type:', result.type);
    console.log('  - Data:', result.data);
    
    if (result.data?.secure === true) {
      console.log('✅ SSL/TLS est activé dans le credential !');
    } else {
      console.log('❌ SSL/TLS n\'est PAS activé dans le credential !');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test backend:', error);
  }
}

// Test de récupération des credentials existants
async function testGetCredentials() {
  console.log('\n🔍 Test de récupération des credentials existants...');
  
  try {
    const response = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erreur lors de la récupération:', error);
      return;
    }
    
    const credentials = await response.json();
    console.log(`📋 ${credentials.length} credentials trouvés:`);
    
    credentials.forEach((cred, index) => {
      if (cred.type === 'smtp') {
        console.log(`\n📧 Credential SMTP #${index + 1}:`);
        console.log(`  - Name: ${cred.name}`);
        console.log(`  - ID: ${cred.id}`);
        console.log(`  - Secure: ${cred.data?.secure}`);
        console.log(`  - Port: ${cred.data?.port}`);
        console.log(`  - Host: ${cred.data?.host}`);
        console.log(`  - DisableStartTls: ${cred.data?.disableStartTls}`);
        
        if (cred.data?.secure === true) {
          console.log('  ✅ SSL/TLS activé');
        } else {
          console.log('  ❌ SSL/TLS NON activé');
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération:', error);
  }
}

// Menu principal
async function main() {
  console.log('🚀 Tests de l\'API n8n pour les credentials SMTP\n');
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Options disponibles:');
    console.log('  node test-n8n-direct.js direct    # Test direct de l\'API n8n');
    console.log('  node test-n8n-direct.js backend   # Test de l\'API backend');
    console.log('  node test-n8n-direct.js get       # Récupérer les credentials existants');
    console.log('  node test-n8n-direct.js all        # Tous les tests');
    console.log('');
    console.log('Exemples:');
    console.log('  node test-n8n-direct.js all');
    console.log('  node test-n8n-direct.js get');
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'direct':
      await testN8nDirectAPI();
      break;
      
    case 'backend':
      await testBackendAPI();
      break;
      
    case 'get':
      await testGetCredentials();
      break;
      
    case 'all':
      await testGetCredentials();
      await testBackendAPI();
      break;
      
    default:
      console.error('❌ Commande inconnue:', command);
  }
}

main();
