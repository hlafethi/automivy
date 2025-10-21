const fetch = require('node-fetch');

/**
 * Force SSL/TLS sur tous les credentials SMTP existants
 */
async function forceSSLOnAllSMTPCredentials() {
  console.log('🔧 Forçage SSL/TLS sur tous les credentials SMTP...');
  
  try {
    // 1. Récupérer tous les credentials
    const response = await fetch('http://localhost:3004/api/n8n/credentials');
    
    if (!response.ok) {
      console.error('❌ Erreur lors de la récupération des credentials');
      return;
    }
    
    const credentials = await response.json();
    console.log(`📋 ${credentials.length} credentials trouvés`);
    
    // 2. Filtrer les credentials SMTP
    const smtpCredentials = credentials.filter(cred => cred.type === 'smtp');
    console.log(`📧 ${smtpCredentials.length} credentials SMTP trouvés`);
    
    // 3. Mettre à jour chaque credential SMTP
    for (const cred of smtpCredentials) {
      console.log(`\n🔧 Mise à jour du credential: ${cred.name} (${cred.id})`);
      
      const updateData = {
        data: {
          ...cred.data, // Garder les données existantes
          secure: true,  // Forcer SSL/TLS
          port: 465,    // Port SSL natif
          disableStartTls: true // Désactiver STARTTLS
        }
      };
      
      try {
        const updateResponse = await fetch(`http://localhost:3004/api/n8n/credentials/${cred.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData)
        });
        
        if (!updateResponse.ok) {
          const error = await updateResponse.text();
          console.error(`❌ Erreur mise à jour ${cred.name}:`, error);
          continue;
        }
        
        const result = await updateResponse.json();
        console.log(`✅ ${cred.name} mis à jour:`);
        console.log(`  - Secure: ${result.data?.secure}`);
        console.log(`  - Port: ${result.data?.port}`);
        console.log(`  - DisableStartTls: ${result.data?.disableStartTls}`);
        
      } catch (error) {
        console.error(`❌ Erreur lors de la mise à jour de ${cred.name}:`, error);
      }
    }
    
    console.log('\n✅ Tous les credentials SMTP ont été mis à jour avec SSL/TLS');
    
  } catch (error) {
    console.error('❌ Erreur lors du forçage SSL:', error);
  }
}

/**
 * Crée un credential SMTP avec SSL/TLS forcé
 */
async function createSMTPCredentialWithSSL(userEmail, password, smtpHost) {
  console.log('🔧 Création d\'un credential SMTP avec SSL/TLS forcé...');
  
  const credentialData = {
    name: `SMTP-SSL-${Date.now()}`,
    type: 'smtp',
    data: {
      user: userEmail,
      password: password,
      host: smtpHost,
      port: 465,
      secure: true,
      disableStartTls: true,
      // Paramètres supplémentaires pour forcer SSL
      tls: {
        rejectUnauthorized: false
      },
      ssl: {
        rejectUnauthorized: false
      }
    }
  };
  
  console.log('📤 Données du credential:');
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
      console.error('❌ Erreur création credential:', error);
      return null;
    }
    
    const result = await response.json();
    console.log('✅ Credential créé:');
    console.log(`  - ID: ${result.id}`);
    console.log(`  - Name: ${result.name}`);
    console.log(`  - Secure: ${result.data?.secure}`);
    console.log(`  - Port: ${result.data?.port}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur lors de la création:', error);
    return null;
  }
}

/**
 * Vérifie et corrige un credential spécifique
 */
async function fixSpecificCredential(credentialId) {
  console.log(`🔧 Correction du credential ${credentialId}...`);
  
  try {
    // 1. Récupérer le credential
    const getResponse = await fetch(`http://localhost:3004/api/n8n/credentials/${credentialId}`);
    
    if (!getResponse.ok) {
      console.error('❌ Erreur lors de la récupération du credential');
      return;
    }
    
    const credential = await getResponse.json();
    console.log('📋 Credential actuel:');
    console.log(`  - Name: ${credential.name}`);
    console.log(`  - Type: ${credential.type}`);
    console.log(`  - Secure: ${credential.data?.secure}`);
    console.log(`  - Port: ${credential.data?.port}`);
    
    // 2. Mettre à jour avec SSL/TLS forcé
    const updateData = {
      data: {
        ...credential.data,
        secure: true,
        port: 465,
        disableStartTls: true,
        tls: {
          rejectUnauthorized: false
        },
        ssl: {
          rejectUnauthorized: false
        }
      }
    };
    
    const updateResponse = await fetch(`http://localhost:3004/api/n8n/credentials/${credentialId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('❌ Erreur lors de la mise à jour:', error);
      return;
    }
    
    const result = await updateResponse.json();
    console.log('✅ Credential corrigé:');
    console.log(`  - Secure: ${result.data?.secure}`);
    console.log(`  - Port: ${result.data?.port}`);
    console.log(`  - DisableStartTls: ${result.data?.disableStartTls}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  }
}

// Menu principal
async function main() {
  console.log('🚀 Script de forçage SSL/TLS sur les credentials SMTP\n');
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Options disponibles:');
    console.log('  node force-ssl-credentials.js all          # Forcer SSL sur tous les credentials SMTP');
    console.log('  node force-ssl-credentials.js create       # Créer un nouveau credential avec SSL');
    console.log('  node force-ssl-credentials.js fix <id>     # Corriger un credential spécifique');
    console.log('');
    console.log('Exemples:');
    console.log('  node force-ssl-credentials.js all');
    console.log('  node force-ssl-credentials.js create');
    console.log('  node force-ssl-credentials.js fix 12345');
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'all':
      await forceSSLOnAllSMTPCredentials();
      break;
      
    case 'create':
      await createSMTPCredentialWithSSL('test@heleam.com', 'test-password', 'smtp.gmail.com');
      break;
      
    case 'fix':
      if (args[1]) {
        await fixSpecificCredential(args[1]);
      } else {
        console.error('❌ ID du credential requis pour la commande fix');
      }
      break;
      
    default:
      console.error('❌ Commande inconnue:', command);
  }
}

main();
