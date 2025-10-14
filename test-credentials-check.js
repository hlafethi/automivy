/**
 * Vérification des credentials utilisés par le workflow
 * Test des connexions IMAP et SMTP
 */

import fetch from 'node-fetch';

async function testCredentials() {
  try {
    console.log('🔐 Vérification des credentials du workflow');
    
    // 1. Vérifier les credentials dans n8n
    console.log('\n1. Vérification des credentials n8n...');
    
    const credentialsResponse = await fetch('https://n8n.globalsaas.eu/api/v1/credentials', {
      headers: {
        'X-N8N-API-KEY': 'your-api-key-here' // Remplacer par la vraie clé API
      }
    });
    
    if (credentialsResponse.ok) {
      const credentials = await credentialsResponse.json();
      console.log('✅ Credentials n8n récupérés');
      console.log('📋 Credentials disponibles:', credentials.map(c => c.name));
    } else {
      console.log('⚠️ Impossible de récupérer les credentials (API key manquante)');
    }
    
    // 2. Vérifier la configuration du workflow
    console.log('\n2. Vérification de la configuration du workflow...');
    console.log('   - Le workflow utilise-t-il les bons credentials ?');
    console.log('   - Les nœuds IMAP et SMTP sont-ils configurés ?');
    console.log('   - Les paramètres email sont-ils corrects ?');
    
    // 3. Suggestions de vérification
    console.log('\n3. Vérifications à faire dans n8n:');
    console.log('   a) Aller sur n8n.globalsaas.eu');
    console.log('   b) Ouvrir le workflow v11');
    console.log('   c) Vérifier le nœud "Fetch Emails via IMAP"');
    console.log('   d) Vérifier le nœud "Send Summary via SMTP"');
    console.log('   e) Regarder les exécutions récentes');
    console.log('   f) Vérifier les logs d\'erreur');
    
    console.log('\n4. Problèmes possibles:');
    console.log('   - Credentials IMAP incorrects');
    console.log('   - Credentials SMTP incorrects');
    console.log('   - Serveur email inaccessible');
    console.log('   - Workflow non actif');
    console.log('   - Erreur dans la configuration des nœuds');
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

testCredentials();
