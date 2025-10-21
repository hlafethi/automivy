import fetch from 'node-fetch';

// Test avec structure aplatie (sans wrapper data)
async function testFlattenedStructure() {
  console.log('🔍 Test avec structure aplatie (sans wrapper data)...');
  
  const credentialData = {
    name: `FLATTENED-SSL-TEST-${Date.now()}`,
    type: 'smtp',
    user: 'flattened-ssl@heleam.com',
    password: 'flattened-ssl-password',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    disableStartTls: true
  };
  
  console.log('📤 Structure aplatie:');
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
    console.log('  - Secure:', result.secure);
    console.log('  - Port:', result.port);
    console.log('  - DisableStartTls:', result.disableStartTls);
    
    // Vérifier si SSL/TLS est activé
    if (result.secure === true) {
      console.log('✅ SSL/TLS est activé dans le credential !');
    } else {
      console.log('❌ SSL/TLS n\'est PAS activé dans le credential !');
    }
    
    if (result.disableStartTls === true) {
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

// Test avec structure hybride
async function testHybridStructure() {
  console.log('\n🔍 Test avec structure hybride...');
  
  const credentialData = {
    name: `HYBRID-SSL-TEST-${Date.now()}`,
    type: 'smtp',
    data: {
      user: 'hybrid-ssl@heleam.com',
      password: 'hybrid-ssl-password',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      disableStartTls: true
    },
    // Paramètres SSL/TLS à la racine aussi
    secure: true,
    port: 465,
    disableStartTls: true
  };
  
  console.log('📤 Structure hybride:');
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
    console.log('✅ Credential hybride créé:');
    console.log('  - ID:', result.id);
    console.log('  - Secure:', result.secure);
    console.log('  - Port:', result.port);
    console.log('  - DisableStartTls:', result.disableStartTls);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur lors du test hybride:', error);
    return null;
  }
}

// Test avec structure n8n native
async function testNativeN8nStructure() {
  console.log('\n🔍 Test avec structure n8n native...');
  
  const credentialData = {
    name: `NATIVE-SSL-TEST-${Date.now()}`,
    type: 'smtp',
    data: {
      user: 'native-ssl@heleam.com',
      password: 'native-ssl-password',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      disableStartTls: true
    }
  };
  
  console.log('📤 Structure n8n native:');
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
    console.log('✅ Credential n8n natif créé:');
    console.log('  - ID:', result.id);
    console.log('  - Data:', result.data);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur lors du test n8n natif:', error);
    return null;
  }
}

// Menu principal
async function main() {
  console.log('🚀 Test de structures aplaties pour n8n\n');
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Options disponibles:');
    console.log('  node test-flattened-structure.js flattened # Structure aplatie');
    console.log('  node test-flattened-structure.js hybrid   # Structure hybride');
    console.log('  node test-flattened-structure.js native   # Structure n8n native');
    console.log('  node test-flattened-structure.js all       # Tous les tests');
    console.log('');
    console.log('Exemples:');
    console.log('  node test-flattened-structure.js flattened');
    console.log('  node test-flattened-structure.js all');
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'flattened':
      await testFlattenedStructure();
      break;
      
    case 'hybrid':
      await testHybridStructure();
      break;
      
    case 'native':
      await testNativeN8nStructure();
      break;
      
    case 'all':
      await testFlattenedStructure();
      await testHybridStructure();
      await testNativeN8nStructure();
      break;
      
    default:
      console.error('❌ Commande inconnue:', command);
  }
}

main();
