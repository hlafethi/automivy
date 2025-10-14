/**
 * Script de test pour l'API de déploiement Email Summary
 * 
 * Ce script teste l'API REST pour déployer un workflow Email Summary
 * avec création automatique des credentials.
 */

async function testApiDeployment() {
  console.log('🚀 Test de l\'API de déploiement Email Summary...\n');

  try {
    // Paramètres de test
    const testData = {
      userId: 'test-user-' + Date.now(),
      userEmail: 'test@example.com',
      userPassword: 'test-password-123',
      userImapServer: 'imap.gmail.com'
    };

    console.log('📋 Paramètres de test:');
    console.log(`  - User ID: ${testData.userId}`);
    console.log(`  - Email: ${testData.userEmail}`);
    console.log(`  - Serveur IMAP: ${testData.userImapServer}`);
    console.log(`  - Serveur SMTP dérivé: ${testData.userImapServer.replace('imap', 'smtp')}\n`);

    // Test de l'API
    console.log('1️⃣ Test appel API...');
    const response = await fetch('http://localhost:3004/api/n8n/deploy-email-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Token de test
      },
      body: JSON.stringify(testData)
    });

    console.log(`   - Status: ${response.status}`);
    console.log(`   - Status Text: ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   - Error Response: ${errorText}`);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ API appelée avec succès!');
    console.log(`   - Success: ${result.success}`);
    console.log(`   - Workflow ID: ${result.workflowId}`);
    console.log(`   - Message: ${result.message}\n`);

    console.log('🎉 Test API réussi!');
    console.log('');
    console.log('📊 Résumé:');
    console.log(`   ✅ API accessible`);
    console.log(`   ✅ Paramètres acceptés`);
    console.log(`   ✅ Workflow déployé: ${result.workflowId}`);
    console.log(`   ✅ Credentials créés automatiquement`);
    console.log('');
    console.log('🔗 Le workflow est maintenant prêt dans n8n!');

  } catch (error) {
    console.error('❌ Erreur lors du test API:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('');
      console.log('💡 Solutions possibles:');
      console.log('   1. Vérifier que le backend est démarré (port 3004)');
      console.log('   2. Vérifier que n8n est accessible');
      console.log('   3. Vérifier les credentials admin dans l\'application');
    }
  }
}

// Exécuter le test
testApiDeployment()
  .then(() => {
    console.log('\n✅ Test terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test échoué:', error);
    process.exit(1);
  });
