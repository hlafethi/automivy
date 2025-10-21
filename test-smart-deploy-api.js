import fetch from 'node-fetch';

// Test de l'API smart-deploy/deploy complète
async function testSmartDeployAPI() {
  console.log('🧪 [Test] Test API smart-deploy/deploy...');
  
  // Simuler l'appel API comme le fait le frontend
  const deployData = {
    workflowId: 'test-workflow-id', // ID d'un template existant
    credentials: {
      email: 'user@example.com',
      smtpEmail: 'user@example.com',
      smtpPassword: 'user_password',
      smtpServer: 'smtp.gmail.com',
      smtpPort: '465',
      imapPassword: 'user_password',
      imapServer: 'imap.gmail.com',
      imapPort: '993'
    }
  };
  
  console.log('📋 [Test] Données de déploiement:', JSON.stringify(deployData, null, 2));
  
  try {
    // Appel à l'API smart-deploy/deploy
    const response = await fetch('http://localhost:3004/api/smart-deploy/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Token de test
      },
      body: JSON.stringify(deployData)
    });
    
    console.log('🔧 [Test] Réponse API:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ [Test] Déploiement réussi:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ [Test] Erreur déploiement:', errorText);
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur appel API:', error);
  }
  
  console.log('🎉 [Test] Test API terminé !');
}

// Exécution du test
async function runTest() {
  try {
    await testSmartDeployAPI();
  } catch (error) {
    console.error('❌ [Test] Échec du test:', error);
    process.exit(1);
  }
}

runTest();
