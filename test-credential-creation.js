import fetch from 'node-fetch';

// Test de création de credential SMTP avec SSL/TLS
async function testCredentialCreation() {
  console.log('🔍 Test de création de credential SMTP avec SSL/TLS...');
  
  const credentialData = {
    name: `TEST-SMTP-${Date.now()}`,
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
  
  console.log('📤 Données envoyées à n8n:');
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
      console.error('❌ Erreur API n8n:', error);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Credential créé dans n8n:');
    console.log('  - ID:', result.id);
    console.log('  - Name:', result.name);
    console.log('  - Type:', result.type);
    
    // Vérifier les données du credential créé
    console.log('\n🔍 Vérification du credential créé...');
    const getResponse = await fetch(`http://localhost:3004/api/n8n/credentials/${result.id}`);
    
    if (getResponse.ok) {
      const credentialDetails = await getResponse.json();
      console.log('📋 Détails du credential:');
      console.log('  - Secure:', credentialDetails.data?.secure);
      console.log('  - Port:', credentialDetails.data?.port);
      console.log('  - Host:', credentialDetails.data?.host);
      console.log('  - DisableStartTls:', credentialDetails.data?.disableStartTls);
      
      if (credentialDetails.data?.secure === true) {
        console.log('✅ SSL/TLS est activé dans le credential !');
      } else {
        console.log('❌ SSL/TLS n\'est PAS activé dans le credential !');
        console.log('🔍 Données complètes:', JSON.stringify(credentialDetails.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Test de vérification des credentials existants
async function checkExistingCredentials() {
  console.log('\n🔍 Vérification des credentials existants...');
  
  try {
    const response = await fetch('http://localhost:3004/api/n8n/credentials');
    
    if (!response.ok) {
      console.error('❌ Erreur lors de la récupération des credentials');
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
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

// Test de mise à jour d'un credential existant
async function updateCredentialSSL(credentialId) {
  console.log(`\n🔧 Mise à jour du credential ${credentialId} pour forcer SSL/TLS...`);
  
  const updateData = {
    data: {
      secure: true,
      port: 465,
      disableStartTls: true
    }
  };
  
  try {
    const response = await fetch(`http://localhost:3004/api/n8n/credentials/${credentialId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erreur lors de la mise à jour:', error);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Credential mis à jour:');
    console.log('  - Secure:', result.data?.secure);
    console.log('  - Port:', result.data?.port);
    console.log('  - DisableStartTls:', result.data?.disableStartTls);
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
  }
}

// Exécution des tests
async function runTests() {
  console.log('🚀 Début des tests de credentials SSL/TLS...\n');
  
  // 1. Vérifier les credentials existants
  await checkExistingCredentials();
  
  // 2. Créer un nouveau credential de test
  await testCredentialCreation();
  
  console.log('\n📋 Résumé des tests:');
  console.log('1. Vérifiez dans n8n que le bouton SSL/TLS est coché');
  console.log('2. Si ce n\'est pas le cas, le problème vient de l\'API n8n');
  console.log('3. Il faudra peut-être forcer SSL/TLS via l\'interface n8n');
}

runTests();
