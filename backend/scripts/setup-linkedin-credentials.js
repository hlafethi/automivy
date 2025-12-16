/**
 * Script pour configurer les credentials LinkedIn OAuth dans la base de données
 * 
 * Usage:
 *   node backend/scripts/setup-linkedin-credentials.js <client_id> <client_secret>
 * 
 * Ou avec variables d'environnement:
 *   LINKEDIN_CLIENT_ID=xxx LINKEDIN_CLIENT_SECRET=yyy node backend/scripts/setup-linkedin-credentials.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
const db = require('../database');

async function setupLinkedInCredentials() {
  try {
    // Récupérer les credentials depuis les arguments ou les variables d'environnement
    const clientId = process.argv[2] || process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.argv[3] || process.env.LINKEDIN_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('❌ Erreur: LINKEDIN_CLIENT_ID et LINKEDIN_CLIENT_SECRET sont requis');
      console.log('\nUsage:');
      console.log('  node backend/scripts/setup-linkedin-credentials.js <client_id> <client_secret>');
      console.log('\nOu définissez les variables d\'environnement:');
      console.log('  LINKEDIN_CLIENT_ID=xxx LINKEDIN_CLIENT_SECRET=yyy node backend/scripts/setup-linkedin-credentials.js');
      console.log('\nOu ajoutez-les dans backend/.env:');
      console.log('  LINKEDIN_CLIENT_ID=votre_client_id');
      console.log('  LINKEDIN_CLIENT_SECRET=votre_client_secret');
      process.exit(1);
    }
    
    console.log('🔧 Configuration des credentials LinkedIn OAuth...');
    console.log('  Client ID:', clientId.substring(0, 8) + '...');
    console.log('  Client Secret:', clientSecret.substring(0, 8) + '...');
    
    // Vérifier si un admin existe
    const adminUsers = await db.query(
      'SELECT id, email FROM users WHERE role = $1 OR role = $2 LIMIT 1',
      ['admin', 'super_admin']
    );
    
    if (adminUsers.rows.length === 0) {
      console.error('❌ Erreur: Aucun utilisateur admin trouvé. Créez d\'abord un utilisateur admin.');
      process.exit(1);
    }
    
    const adminUserId = adminUsers.rows[0].id;
    const adminEmail = adminUsers.rows[0].email;
    
    console.log('  Admin trouvé:', adminEmail);
    
    // Vérifier si les credentials existent déjà
    const existingCreds = await db.query(
      'SELECT id, service_name, is_active FROM admin_api_keys WHERE service_name = $1',
      ['linkedin_oauth']
    );
    
    if (existingCreds.rows.length > 0) {
      console.log('⚠️  Des credentials LinkedIn existent déjà. Mise à jour...');
      
      // Mettre à jour les credentials existants
      // Option 1: Stocker "client_id|client_secret" dans une seule entrée
      await db.query(
        'UPDATE admin_api_keys SET api_key = $1, is_active = $2, updated_at = NOW() WHERE service_name = $3',
        [`${clientId}|${clientSecret}`, true, 'linkedin_oauth']
      );
      
      console.log('✅ Credentials LinkedIn mis à jour avec succès');
    } else {
      console.log('📝 Création de nouveaux credentials LinkedIn...');
      
      // Créer les credentials
      // Option 1: Stocker "client_id|client_secret" dans une seule entrée
      await db.query(
        `INSERT INTO admin_api_keys (service_name, api_key, description, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'linkedin_oauth',
          `${clientId}|${clientSecret}`,
          'LinkedIn OAuth Credentials (Client ID et Client Secret)',
          true,
          adminUserId
        ]
      );
      
      console.log('✅ Credentials LinkedIn créés avec succès');
    }
    
    console.log('\n✅ Configuration terminée !');
    console.log('\n📋 Prochaines étapes:');
    console.log('  1. Vérifiez que votre app LinkedIn est configurée sur https://www.linkedin.com/developers/apps');
    console.log('  2. Ajoutez le Redirect URI dans votre app LinkedIn:');
    console.log('     - Dev: http://localhost:5173/oauth/callback');
    console.log('     - Prod: https://votre-domaine.com/oauth/callback');
    console.log('  3. Demandez les permissions suivantes dans votre app LinkedIn:');
    console.log('     - openid');
    console.log('     - profile');
    console.log('     - email');
    console.log('     - w_member_social (pour publier des posts)');
    console.log('  4. Testez la connexion LinkedIn depuis l\'interface utilisateur');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Exécuter le script
setupLinkedInCredentials();

