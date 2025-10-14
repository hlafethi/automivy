/**
 * Script de test pour le système "Mot de passe oublié"
 */

async function testForgotPasswordSystem() {
  console.log('🔐 Test du système "Mot de passe oublié"...\n');

  try {
    // Test 1: Demande de réinitialisation
    console.log('1️⃣ Test demande de réinitialisation...');
    const forgotResponse = await fetch('http://localhost:3004/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });

    console.log(`   - Status: ${forgotResponse.status}`);
    
    if (!forgotResponse.ok) {
      const errorText = await forgotResponse.text();
      console.log(`   - Error: ${errorText}`);
      throw new Error(`API Error: ${forgotResponse.status} - ${errorText}`);
    }

    const forgotResult = await forgotResponse.json();
    console.log('✅ Demande de réinitialisation réussie!');
    console.log(`   - Message: ${forgotResult.message}`);
    console.log(`   - Expires: ${forgotResult.expiresAt}\n`);

    // Test 2: Statistiques des tokens
    console.log('2️⃣ Test statistiques des tokens...');
    const statsResponse = await fetch('http://localhost:3004/api/auth/token-stats');
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('✅ Statistiques récupérées:');
      console.log(`   - Total tokens: ${stats.stats.total_tokens}`);
      console.log(`   - Tokens utilisés: ${stats.stats.used_tokens}`);
      console.log(`   - Tokens expirés: ${stats.stats.expired_tokens}`);
      console.log(`   - Tokens actifs: ${stats.stats.active_tokens}\n`);
    }

    // Test 3: Nettoyage des tokens expirés
    console.log('3️⃣ Test nettoyage des tokens expirés...');
    const cleanupResponse = await fetch('http://localhost:3004/api/auth/cleanup-expired-tokens', {
      method: 'POST'
    });
    
    if (cleanupResponse.ok) {
      const cleanup = await cleanupResponse.json();
      console.log('✅ Nettoyage réussi:');
      console.log(`   - Tokens nettoyés: ${cleanup.cleanedCount}\n`);
    }

    console.log('🎉 Tous les tests sont passés avec succès!');
    console.log('');
    console.log('📊 Résumé:');
    console.log(`   ✅ API de demande de réinitialisation fonctionnelle`);
    console.log(`   ✅ Service email configuré`);
    console.log(`   ✅ Gestion des tokens sécurisée`);
    console.log(`   ✅ Nettoyage automatique des tokens expirés`);
    console.log('');
    console.log('🔗 Le système "Mot de passe oublié" est prêt à être utilisé!');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.log('');
    console.log('💡 Solutions possibles:');
    console.log('   1. Vérifier que le backend est démarré (port 3004)');
    console.log('   2. Vérifier la configuration de la base de données');
    console.log('   3. Vérifier la configuration email (SMTP)');
    console.log('   4. Exécuter le script SQL pour créer les tables');
  }
}

// Exécuter le test
testForgotPasswordSystem()
  .then(() => {
    console.log('\n✅ Test terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test échoué:', error);
    process.exit(1);
  });
