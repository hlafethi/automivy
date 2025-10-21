import fetch from 'node-fetch';

// Test avec la structure correcte pour n8n
async function testCredentialWithCorrectStructure() {
  console.log('🔍 Test avec la structure correcte pour n8n...');
  
  // Structure correcte : les données SMTP doivent être à la racine, pas dans "data"
  const credentialData = {
    name: `TEST-SMTP-FIXED-${Date.now()}`,
    type: 'smtp',
    user: 'test@heleam.com',
    password: 'test-password',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    disableStartTls: true
  };
  
  console.log('📤 Structure correcte envoyée à n8n:');
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
    console.log('  - Secure:', result.secure);
    console.log('  - Port:', result.port);
    console.log('  - Host:', result.host);
    
    if (result.secure === true) {
      console.log('✅ SSL/TLS est activé dans le credential !');
    } else {
      console.log('❌ SSL/TLS n\'est PAS activé dans le credential !');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    return null;
  }
}

// Test de mise à jour d'un credential existant
async function updateExistingCredential(credentialId) {
  console.log(`\n🔧 Mise à jour du credential ${credentialId}...`);
  
  const updateData = {
    name: `UPDATED-SMTP-${Date.now()}`,
    type: 'smtp',
    user: 'updated@heleam.com',
    password: 'updated-password',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    disableStartTls: true
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
    console.log('  - Secure:', result.secure);
    console.log('  - Port:', result.port);
    console.log('  - DisableStartTls:', result.disableStartTls);
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
  }
}

// Test de création avec différentes structures
async function testDifferentStructures() {
  console.log('\n🔍 Test de différentes structures de données...');
  
  const structures = [
    {
      name: 'Structure 1 - Données à la racine',
      data: {
        name: `TEST-STRUCT-1-${Date.now()}`,
        type: 'smtp',
        user: 'test1@heleam.com',
        password: 'test1',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true
      }
    },
    {
      name: 'Structure 2 - Avec data wrapper',
      data: {
        name: `TEST-STRUCT-2-${Date.now()}`,
        type: 'smtp',
        data: {
          user: 'test2@heleam.com',
          password: 'test2',
          host: 'smtp.gmail.com',
          port: 465,
          secure: true
        }
      }
    },
    {
      name: 'Structure 3 - Données SMTP spécifiques',
      data: {
        name: `TEST-STRUCT-3-${Date.now()}`,
        type: 'smtp',
        smtpUser: 'test3@heleam.com',
        smtpPassword: 'test3',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true
      }
    }
  ];
  
  for (const structure of structures) {
    console.log(`\n📤 Test: ${structure.name}`);
    console.log('Données:', JSON.stringify(structure.data, null, 2));
    
    try {
      const response = await fetch('http://localhost:3004/api/n8n/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(structure.data)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Succès:', result.id);
        console.log('  - Secure:', result.secure);
        console.log('  - Port:', result.port);
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
  console.log('🚀 Tests de structures de credentials pour n8n\n');
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Options disponibles:');
    console.log('  node test-credential-fixed.js create     # Créer un credential avec structure correcte');
    console.log('  node test-credential-fixed.js structures # Tester différentes structures');
    console.log('  node test-credential-fixed.js update <id> # Mettre à jour un credential');
    console.log('');
    console.log('Exemples:');
    console.log('  node test-credential-fixed.js create');
    console.log('  node test-credential-fixed.js structures');
    console.log('  node test-credential-fixed.js update 12345');
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'create':
      await testCredentialWithCorrectStructure();
      break;
      
    case 'structures':
      await testDifferentStructures();
      break;
      
    case 'update':
      if (args[1]) {
        await updateExistingCredential(args[1]);
      } else {
        console.error('❌ ID du credential requis pour la commande update');
      }
      break;
      
    default:
      console.error('❌ Commande inconnue:', command);
  }
}

main();
