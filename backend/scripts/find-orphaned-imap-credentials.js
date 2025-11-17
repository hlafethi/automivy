// Script pour trouver les credentials IMAP orphelins dans n8n
const config = require('../config');

const userEmail = 'fetline2016@gmail.com'; // Email Gmail de l'utilisateur
const userIdShort = '8c210030'; // userIdShort de l'utilisateur

async function findOrphanedCredentials() {
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  try {
    console.log('🔍 Récupération de tous les credentials via le proxy backend...');
    const credentialsResponse = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!credentialsResponse.ok) {
      console.error(`❌ Erreur récupération credentials: ${credentialsResponse.status}`);
      process.exit(1);
    }
    
    const credentialsData = await credentialsResponse.json();
    const allCredentials = Array.isArray(credentialsData) ? credentialsData : (credentialsData.data || []);
    
    console.log(`✅ ${allCredentials.length} credential(s) trouvé(s) dans n8n\n`);
    
    // Filtrer les credentials IMAP qui pourraient appartenir à cet utilisateur
    const imapCredentials = allCredentials.filter(cred => 
      cred.type === 'imap' || 
      (cred.name && cred.name.toLowerCase().includes('imap'))
    );
    
    console.log(`📋 ${imapCredentials.length} credential(s) IMAP trouvé(s)\n`);
    
    // Identifier ceux qui pourraient appartenir à l'utilisateur
    const userImapCredentials = imapCredentials.filter(cred => {
      const credNameLower = (cred.name || '').toLowerCase();
      return credNameLower.includes(userIdShort.toLowerCase()) ||
             credNameLower.includes(userEmail.toLowerCase()) ||
             credNameLower.includes('fetline2016');
    });
    
    console.log(`🔍 ${userImapCredentials.length} credential(s) IMAP potentiellement orphelin(s):\n`);
    
    userImapCredentials.forEach((cred, index) => {
      console.log(`${index + 1}. ${cred.name} (${cred.id})`);
      console.log(`   - Type: ${cred.type}`);
      console.log(`   - Contient userIdShort: ${cred.name?.toLowerCase().includes(userIdShort.toLowerCase())}`);
      console.log(`   - Contient email: ${cred.name?.toLowerCase().includes(userEmail.toLowerCase()) || cred.name?.toLowerCase().includes('fetline2016')}`);
      console.log('');
    });
    
    if (userImapCredentials.length > 0) {
      console.log(`\n⚠️  Ces credentials IMAP pourraient être orphelins et devraient être supprimés.`);
      console.log(`   Ils ne sont pas stockés dans la base de données car le workflow a été déployé avant l'implémentation du stockage.`);
    } else {
      console.log(`\n✅ Aucun credential IMAP orphelin trouvé.`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

findOrphanedCredentials();

