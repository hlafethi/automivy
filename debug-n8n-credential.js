import fetch from 'node-fetch';

// Debug d'un credential existant pour voir la vraie structure
async function debugExistingCredential() {
  console.log('🔍 Debug d\'un credential existant...');
  
  try {
    // Créer un credential de test d'abord
    const testCredential = {
      name: `DEBUG-TEST-${Date.now()}`,
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

// Test de différentes structures SSL/TLS
async function testSSLStructures() {
  console.log('\n🔍 Test de différentes structures SSL/TLS...');
  
  const sslStructures = [
    {
      name: 'Structure SSL 1 - secure boolean',
      data: {
        user: 'ssl1@heleam.com',
        password: 'ssl1',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        disableStartTls: true
      }
    },
    {
      name: 'Structure SSL 2 - secure string',
      data: {
        user: 'ssl2@heleam.com',
        password: 'ssl2',
        host: 'smtp.gmail.com',
        port: 465,
        secure: 'true',
        disableStartTls: true
      }
    },
    {
      name: 'Structure SSL 3 - tls object',
      data: {
        user: 'ssl3@heleam.com',
        password: 'ssl3',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        tls: {
          rejectUnauthorized: false
        },
        disableStartTls: true
      }
    },
    {
      name: 'Structure SSL 4 - ssl object',
      data: {
        user: 'ssl4@heleam.com',
        password: 'ssl4',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        ssl: {
          rejectUnauthorized: false
        },
        disableStartTls: true
      }
    },
    {
      name: 'Structure SSL 5 - requireTLS',
      data: {
        user: 'ssl5@heleam.com',
        password: 'ssl5',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        requireTLS: true,
        disableStartTls: true
      }
    }
  ];
  
  for (const structure of sslStructures) {
    console.log(`\n📤 Test: ${structure.name}`);
    
    try {
      const response = await fetch('http://localhost:3004/api/n8n/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `TEST-${structure.name.replace(/\s+/g, '-')}-${Date.now()}`,
          type: 'smtp',
          data: structure.data
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Succès:', result.id);
        console.log('  - Secure:', result.data?.secure);
        console.log('  - Port:', result.data?.port);
        console.log('  - TLS:', result.data?.tls);
        console.log('  - SSL:', result.data?.ssl);
        console.log('  - RequireTLS:', result.data?.requireTLS);
        console.log('  - DisableStartTls:', result.data?.disableStartTls);
      } else {
        const error = await response.text();
        console.log('❌ Échec:', error);
      }
      
    } catch (error) {
      console.log('❌ Erreur:', error.message);
    }
  }
}

// Menu principal
async function main() {
  console.log('🚀 Debug des credentials n8n pour SSL/TLS\n');
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Options disponibles:');
    console.log('  node debug-n8n-credential.js debug     # Debug d\'un credential existant');
    console.log('  node debug-n8n-credential.js ssl      # Test des structures SSL');
    console.log('  node debug-n8n-credential.js all       # Tous les tests');
    console.log('');
    console.log('Exemples:');
    console.log('  node debug-n8n-credential.js debug');
    console.log('  node debug-n8n-credential.js ssl');
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'debug':
      await debugExistingCredential();
      break;
      
    case 'ssl':
      await testSSLStructures();
      break;
      
    case 'all':
      await debugExistingCredential();
      await testSSLStructures();
      break;
      
    default:
      console.error('❌ Commande inconnue:', command);
  }
}

main();
