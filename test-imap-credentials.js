/**
 * Test des credentials IMAP dans n8n
 * Vérifie si les credentials sont correctement configurés
 */

import fetch from 'node-fetch';

async function testImapCredentials() {
  try {
    console.log('🔧 Test des credentials IMAP dans n8n');
    
    // 1. Connexion admin
    console.log('\n1. Connexion admin...');
    const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@automivy.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const { token } = await loginResponse.json();
    console.log('✅ Connexion admin réussie');
    
    // 2. Lister les credentials dans n8n
    console.log('\n2. Liste des credentials n8n...');
    const credentialsResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!credentialsResponse.ok) {
      throw new Error(`Credentials fetch failed: ${credentialsResponse.status}`);
    }
    
    const credentials = await credentialsResponse.json();
    console.log(`📊 ${credentials.length} credentials trouvés:`);
    
    credentials.forEach((cred, index) => {
      console.log(`\n${index + 1}. Credential:`);
      console.log(`   ID: ${cred.id}`);
      console.log(`   Name: ${cred.name}`);
      console.log(`   Type: ${cred.type}`);
      console.log(`   Created: ${cred.createdAt}`);
    });
    
    // 3. Vérifier les credentials IMAP spécifiquement
    const imapCredentials = credentials.filter(cred => cred.type === 'imap');
    console.log(`\n📧 ${imapCredentials.length} credentials IMAP trouvés:`);
    
    imapCredentials.forEach((cred, index) => {
      console.log(`\n${index + 1}. IMAP Credential:`);
      console.log(`   ID: ${cred.id}`);
      console.log(`   Name: ${cred.name}`);
      console.log(`   Type: ${cred.type}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testImapCredentials();
