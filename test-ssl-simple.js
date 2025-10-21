import fetch from 'node-fetch';

// Test avec structure SSL/TLS simplifiée
async function testSimpleSSL() {
  console.log('🔍 Test avec structure SSL/TLS simplifiée...');
  
  const credentialData = {
    name: `SIMPLE-SSL-TEST-${Date.now()}`,
    type: 'smtp',
    data: {
      user: 'simple-ssl@heleam.com',
      password: 'simple-ssl-password',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      disableStartTls: true
    }
  };
  
  console.log('📤 Structure SSL/TLS simplifiée:');
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
    
    // Vérifier si SSL/TLS est activé
    if (result.data?.secure === true) {
      console.log('✅ SSL/TLS est activé dans le credential !');
    } else {
      console.log('❌ SSL/TLS n\'est PAS activé dans le credential !');
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

// Test avec port 587 (STARTTLS)
async function testSTARTTLS() {
  console.log('\n🔍 Test avec port 587 (STARTTLS)...');
  
  const credentialData = {
    name: `STARTTLS-TEST-${Date.now()}`,
    type: 'smtp',
    data: {
      user: 'starttls@heleam.com',
      password: 'starttls-password',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true
    }
  };
  
  console.log('📤 Structure STARTTLS:');
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
    console.log('✅ Credential STARTTLS créé:');
    console.log('  - ID:', result.id);
    console.log('  - Secure:', result.data?.secure);
    console.log('  - Port:', result.data?.port);
    console.log('  - RequireTLS:', result.data?.requireTLS);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur lors du test STARTTLS:', error);
    return null;
  }
}

// Menu principal
async function main() {
  console.log('🚀 Test SSL/TLS simplifié\n');
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Options disponibles:');
    console.log('  node test-ssl-simple.js ssl       # Test SSL (port 465)');
    console.log('  node test-ssl-simple.js starttls # Test STARTTLS (port 587)');
    console.log('  node test-ssl-simple.js all      # Tous les tests');
    console.log('');
    console.log('Exemples:');
    console.log('  node test-ssl-simple.js ssl');
    console.log('  node test-ssl-simple.js all');
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'ssl':
      await testSimpleSSL();
      break;
      
    case 'starttls':
      await testSTARTTLS();
      break;
      
    case 'all':
      await testSimpleSSL();
      await testSTARTTLS();
      break;
      
    default:
      console.error('❌ Commande inconnue:', command);
  }
}

main();
