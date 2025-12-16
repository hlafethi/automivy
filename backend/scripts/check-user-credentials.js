// Script pour vérifier les credentials d'un utilisateur dans la base de données
const db = require('../database');

async function checkCredentials() {
  const userId = '8c210030-7d0a-48ee-97d2-b74564b1efef';
  
  console.log('🔍 Vérification des credentials pour user:', userId);
  console.log('');
  
  try {
    const result = await db.query(
      'SELECT provider, email, n8n_credential_id, created_at FROM oauth_credentials WHERE user_id = $1 ORDER BY provider',
      [userId]
    );
    
    console.log(`📋 ${result.rows.length} credential(s) trouvé(s) dans la base de données:\n`);
    
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.provider}`);
      console.log(`     Email: ${row.email}`);
      console.log(`     n8n ID: ${row.n8n_credential_id}`);
      console.log(`     Créé: ${row.created_at}`);
      console.log('');
    });
    
    // Vérifier quels providers sont manquants
    const expectedProviders = [
      'google_sheets', 'google_docs', 'google_drive', 'gmail',
      'google_calendar', 'google_ads', 'google_tasks', 'google_slides'
    ];
    
    const existingProviders = result.rows.map(r => r.provider);
    const missingProviders = expectedProviders.filter(p => !existingProviders.includes(p));
    
    if (missingProviders.length > 0) {
      console.log('❌ Providers MANQUANTS:');
      missingProviders.forEach(p => console.log(`   - ${p}`));
    } else {
      console.log('✅ Tous les providers Google sont présents!');
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  }
  
  process.exit();
}

checkCredentials();

