// Script pour créer les credentials Google manquants pour un utilisateur
// Utilise le credential google_drive existant pour créer les autres services

// Charger le .env depuis la racine du projet
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const db = require('../database');
const config = require('../config');

const userId = '8c210030-7d0a-48ee-97d2-b74564b1efef';

async function createMissingCredentials() {
  console.log('🔧 Création des credentials Google manquants...\n');
  
  try {
    // Récupérer le credential google_drive existant pour avoir les tokens
    const driveCredResult = await db.query(
      'SELECT * FROM oauth_credentials WHERE user_id = $1 AND provider = $2 ORDER BY created_at DESC LIMIT 1',
      [userId, 'google_drive']
    );
    
    if (driveCredResult.rows.length === 0) {
      console.log('❌ Aucun credential google_drive trouvé');
      process.exit(1);
    }
    
    const driveCred = driveCredResult.rows[0];
    console.log('✅ Credential google_drive trouvé:', driveCred.n8n_credential_id);
    console.log('   Email:', driveCred.email);
    console.log('   Type encrypted_data:', typeof driveCred.encrypted_data);
    
    // Parse les tokens (peut être déjà un objet ou un string JSON)
    let tokens;
    if (typeof driveCred.encrypted_data === 'string') {
      tokens = JSON.parse(driveCred.encrypted_data);
    } else if (typeof driveCred.encrypted_data === 'object') {
      tokens = driveCred.encrypted_data;
    } else {
      console.log('❌ Format de encrypted_data invalide');
      process.exit(1);
    }
    console.log('   Tokens:', tokens ? 'présents' : 'manquants');
    const email = driveCred.email;
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    const clientId = process.env.GOOGLE_CLIENT_ID || config.google?.clientId;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.google?.clientSecret;
    
    if (!clientId || !clientSecret) {
      console.log('❌ GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET requis');
      process.exit(1);
    }
    
    // Liste des credentials à créer
    const missingCredentials = [
      { provider: 'google_docs', type: 'googleDocsOAuth2Api', name: `Google Docs - ${email} - ${userId.substring(0, 8)}` },
      { provider: 'google_calendar', type: 'googleCalendarOAuth2Api', name: `Google Calendar - ${email} - ${userId.substring(0, 8)}` },
      { provider: 'google_ads', type: 'googleAdsOAuth2Api', name: `Google Ads - ${email} - ${userId.substring(0, 8)}` },
      { provider: 'google_tasks', type: 'googleTasksOAuth2Api', name: `Google Tasks - ${email} - ${userId.substring(0, 8)}` },
      { provider: 'google_slides', type: 'googleSlidesOAuth2Api', name: `Google Slides - ${email} - ${userId.substring(0, 8)}` }
    ];
    
    for (const cred of missingCredentials) {
      // Vérifier si le credential existe déjà
      const existingResult = await db.query(
        'SELECT * FROM oauth_credentials WHERE user_id = $1 AND provider = $2 ORDER BY created_at DESC LIMIT 1',
        [userId, cred.provider]
      );
      
      if (existingResult.rows.length > 0) {
        console.log(`⏭️  ${cred.provider} existe déjà (ID: ${existingResult.rows[0].n8n_credential_id})`);
        continue;
      }
      
      console.log(`\n🔄 Création de ${cred.provider}...`);
      
      // Créer le credential dans n8n
      const credentialData = {
        name: cred.name,
        type: cred.type,
        data: {
          clientId: clientId,
          clientSecret: clientSecret,
          serverUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          sendAdditionalBodyProperties: false,
          additionalBodyProperties: '',
          allowedDomains: '',
          oauthTokenData: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_type: tokens.token_type || 'Bearer',
            expires_in: tokens.expires_in,
            scope: tokens.scope,
            expiry_date: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null
          }
        }
      };
      
      const createResponse = await fetch(`${n8nUrl}/api/v1/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': n8nApiKey,
        },
        body: JSON.stringify(credentialData),
      });
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.log(`❌ Erreur création ${cred.provider} dans n8n:`, errorText);
        continue;
      }
      
      const n8nCred = await createResponse.json();
      console.log(`   ✅ Credential n8n créé: ${n8nCred.id}`);
      
      // Sauvegarder dans la base de données
      await db.createOAuthCredential(
        userId,
        cred.provider,
        JSON.stringify(tokens),
        n8nCred.id,
        email,
        tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
      );
      console.log(`   ✅ Credential sauvegardé en base de données`);
    }
    
    console.log('\n✅ Création des credentials terminée!');
    console.log('\n📝 Redéployez maintenant le workflow "test mcp" pour appliquer les credentials.');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
  
  process.exit();
}

createMissingCredentials();

