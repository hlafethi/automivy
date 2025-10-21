import fetch from 'node-fetch';

// Debug avec la structure qui fonctionne
async function debugWorkingStructure() {
  console.log('🔍 Debug avec la structure qui fonctionne...');
  
  try {
    // Structure qui fonctionne (d'après les tests précédents)
    const testCredential = {
      name: `DEBUG-WORKING-${Date.now()}`,
      type: 'smtp',
      data: {
        user: 'debug@heleam.com',
        password: 'debug-password',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        disableStartTls: true
      }
    };
    
    console.log('📤 Création d\'un credential de test...');
    const createResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCredential)
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('❌ Erreur création credential:', error);
      return;
    }
    
    const createdCred = await createResponse.json();
    console.log('✅ Credential créé:', createdCred.id);
    console.log('📋 Structure complète du credential:');
    console.log(JSON.stringify(createdCred, null, 2));
    
    // Analyser la structure
    console.log('\n🔍 Analyse de la structure:');
    console.log('  - ID:', createdCred.id);
    console.log('  - Name:', createdCred.name);
    console.log('  - Type:', createdCred.type);
    console.log('  - Data keys:', Object.keys(createdCred.data || {}));
    console.log('  - Data secure:', createdCred.data?.secure);
    console.log('  - Data port:', createdCred.data?.port);
    console.log('  - Data host:', createdCred.data?.host);
    console.log('  - Data user:', createdCred.data?.user);
    console.log('  - Data disableStartTls:', createdCred.data?.disableStartTls);
    
    // Vérifier si SSL/TLS est vraiment activé
    if (createdCred.data?.secure === true) {
      console.log('✅ SSL/TLS est activé dans les données');
    } else {
      console.log('❌ SSL/TLS n\'est PAS activé dans les données');
    }
    
    return createdCred;
    
  } catch (error) {
    console.error('❌ Erreur lors du debug:', error);
    return null;
  }
}

// Test de mise à jour avec SSL/TLS forcé
async function testSSLUpdate(credentialId) {
  console.log(`\n🔧 Test de mise à jour SSL/TLS du credential ${credentialId}...`);
  
  const updateData = {
    name: `UPDATED-SSL-${Date.now()}`,
    type: 'smtp',
    data: {
      user: 'updated@heleam.com',
      password: 'updated-password',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      disableStartTls: true,
      // Paramètres SSL/TLS supplémentaires
      tls: {
        rejectUnauthorized: false,
        secureProtocol: 'TLSv1_2_method'
      },
      ssl: {
        rejectUnauthorized: false
      },
      requireTLS: true
    }
  };
  
  console.log('📤 Données de mise à jour:');
  console.log(JSON.stringify(updateData, null, 2));
  
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
    console.log('  - TLS:', result.data?.tls);
    console.log('  - SSL:', result.data?.ssl);
    console.log('  - RequireTLS:', result.data?.requireTLS);
    console.log('  - DisableStartTls:', result.data?.disableStartTls);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    return null;
  }
}

// Menu principal
async function main() {
  console.log('🚀 Debug SSL/TLS avec structure fonctionnelle\n');
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Options disponibles:');
    console.log('  node debug-ssl-working.js create     # Créer un credential de test');
    console.log('  node debug-ssl-working.js update <id> # Mettre à jour un credential');
    console.log('  node debug-ssl-working.js all        # Tous les tests');
    console.log('');
    console.log('Exemples:');
    console.log('  node debug-ssl-working.js create');
    console.log('  node debug-ssl-working.js update 12345');
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'create':
      const cred = await debugWorkingStructure();
      if (cred) {
        console.log('\n💡 ID du credential créé:', cred.id);
        console.log('💡 Utilisez: node debug-ssl-working.js update', cred.id);
      }
      break;
      
    case 'update':
      if (args[1]) {
        await testSSLUpdate(args[1]);
      } else {
        console.error('❌ ID du credential requis pour la commande update');
      }
      break;
      
    case 'all':
      const credential = await debugWorkingStructure();
      if (credential) {
        await testSSLUpdate(credential.id);
      }
      break;
      
    default:
      console.error('❌ Commande inconnue:', command);
  }
}

main();
