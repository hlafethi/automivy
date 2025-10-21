import fetch from 'node-fetch';

// Test de la correction SSL/TLS avec la nouvelle structure
async function testSSLFix() {
  console.log('🔍 Test de la correction SSL/TLS...');
  
  const credentialData = {
    name: `SSL-FIX-TEST-${Date.now()}`,
    type: 'smtp',
    data: {
      user: 'ssl-fix@heleam.com',
      password: 'ssl-fix-password',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      disableStartTls: true,
      // Paramètres SSL/TLS supplémentaires pour forcer l'activation
      tls: {
        rejectUnauthorized: false,
        secureProtocol: 'TLSv1_2_method'
      },
      ssl: {
        rejectUnauthorized: false
      },
      requireTLS: true,
      // Forcer SSL/TLS au niveau de la connexion
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 30000
    }
  };
  
  console.log('📤 Structure SSL/TLS complète:');
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
    console.log('✅ Credential créé avec succès:');
    console.log('  - ID:', result.id);
    console.log('  - Name:', result.name);
    console.log('  - Type:', result.type);
    console.log('  - Data:', result.data);
    
    // Vérifier les paramètres SSL/TLS
    console.log('\n🔍 Vérification des paramètres SSL/TLS:');
    console.log('  - Secure:', result.data?.secure);
    console.log('  - Port:', result.data?.port);
    console.log('  - DisableStartTls:', result.data?.disableStartTls);
    console.log('  - TLS:', result.data?.tls);
    console.log('  - SSL:', result.data?.ssl);
    console.log('  - RequireTLS:', result.data?.requireTLS);
    console.log('  - ConnectionTimeout:', result.data?.connectionTimeout);
    console.log('  - GreetingTimeout:', result.data?.greetingTimeout);
    console.log('  - SocketTimeout:', result.data?.socketTimeout);
    
    // Vérifier si SSL/TLS est activé
    if (result.data?.secure === true) {
      console.log('✅ SSL/TLS est activé dans le credential !');
    } else {
      console.log('❌ SSL/TLS n\'est PAS activé dans le credential !');
    }
    
    if (result.data?.requireTLS === true) {
      console.log('✅ RequireTLS est activé !');
    } else {
      console.log('❌ RequireTLS n\'est PAS activé !');
    }
    
    if (result.data?.disableStartTls === true) {
      console.log('✅ DisableStartTls est activé (SSL direct) !');
    } else {
      console.log('❌ DisableStartTls n\'est PAS activé !');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    return null;
  }
}

// Test de mise à jour d'un credential existant avec SSL/TLS
async function updateCredentialWithSSL(credentialId) {
  console.log(`\n🔧 Mise à jour du credential ${credentialId} avec SSL/TLS forcé...`);
  
  const updateData = {
    name: `UPDATED-SSL-FORCED-${Date.now()}`,
    type: 'smtp',
    data: {
      user: 'updated-ssl@heleam.com',
      password: 'updated-ssl-password',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      disableStartTls: true,
      // Paramètres SSL/TLS supplémentaires pour forcer l'activation
      tls: {
        rejectUnauthorized: false,
        secureProtocol: 'TLSv1_2_method'
      },
      ssl: {
        rejectUnauthorized: false
      },
      requireTLS: true,
      // Forcer SSL/TLS au niveau de la connexion
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 30000
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
    console.log('✅ Credential mis à jour avec SSL/TLS forcé:');
    console.log('  - Secure:', result.data?.secure);
    console.log('  - Port:', result.data?.port);
    console.log('  - DisableStartTls:', result.data?.disableStartTls);
    console.log('  - TLS:', result.data?.tls);
    console.log('  - SSL:', result.data?.ssl);
    console.log('  - RequireTLS:', result.data?.requireTLS);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    return null;
  }
}

// Menu principal
async function main() {
  console.log('🚀 Test de la correction SSL/TLS\n');
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Options disponibles:');
    console.log('  node test-ssl-fix.js create     # Créer un credential avec SSL/TLS forcé');
    console.log('  node test-ssl-fix.js update <id> # Mettre à jour un credential avec SSL/TLS');
    console.log('  node test-ssl-fix.js all        # Tous les tests');
    console.log('');
    console.log('Exemples:');
    console.log('  node test-ssl-fix.js create');
    console.log('  node test-ssl-fix.js update 12345');
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'create':
      const cred = await testSSLFix();
      if (cred) {
        console.log('\n💡 ID du credential créé:', cred.id);
        console.log('💡 Utilisez: node test-ssl-fix.js update', cred.id);
      }
      break;
      
    case 'update':
      if (args[1]) {
        await updateCredentialWithSSL(args[1]);
      } else {
        console.error('❌ ID du credential requis pour la commande update');
      }
      break;
      
    case 'all':
      const credential = await testSSLFix();
      if (credential) {
        await updateCredentialWithSSL(credential.id);
      }
      break;
      
    default:
      console.error('❌ Commande inconnue:', command);
  }
}

main();
