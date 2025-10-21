import fetch from 'node-fetch';

// Test direct de l'API /deploy
async function testDeployAPIDirect() {
  console.log('🧪 [Test] Test direct API /deploy...');
  
  // 1. Connexion pour obtenir un token
  console.log('🔧 [Test] Connexion...');
  const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@heleam.com',
      password: 'user123'
    })
  });
  
  if (!loginResponse.ok) {
    throw new Error(`Erreur connexion: ${loginResponse.status}`);
  }
  
  const loginResult = await loginResponse.json();
  const token = loginResult.token;
  console.log('✅ [Test] Token obtenu');
  
  // 2. Récupérer les workflows
  console.log('🔧 [Test] Récupération des workflows...');
  const workflowsResponse = await fetch('http://localhost:3004/api/smart-deploy/workflows', {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!workflowsResponse.ok) {
    throw new Error(`Erreur workflows: ${workflowsResponse.status}`);
  }
  
  const workflowsResult = await workflowsResponse.json();
  const firstWorkflow = workflowsResult.workflows[0];
  console.log('✅ [Test] Workflow sélectionné:', firstWorkflow.name);
  
  // 3. Test direct de l'API /deploy
  console.log('🔧 [Test] Test direct API /deploy...');
  
  const deployData = {
    workflowId: firstWorkflow.id,
    credentials: {
      email: 'user@heleam.com',
      smtpEmail: 'user@heleam.com',
      smtpPassword: 'user_password',
      smtpServer: 'smtp.gmail.com',
      smtpPort: '465',
      imapPassword: 'user_password',
      imapServer: 'imap.gmail.com',
      imapPort: '993'
    }
  };
  
  console.log('📋 [Test] Données de déploiement:', JSON.stringify(deployData, null, 2));
  
  const deployResponse = await fetch('http://localhost:3004/api/smart-deploy/deploy', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(deployData)
  });
  
  console.log('📋 [Test] Réponse déploiement:', deployResponse.status, deployResponse.statusText);
  
  if (deployResponse.ok) {
    const deployResult = await deployResponse.json();
    console.log('✅ [Test] Déploiement réussi !');
    console.log('📋 [Test] Résultat:', JSON.stringify(deployResult, null, 2));
  } else {
    const errorText = await deployResponse.text();
    console.log('❌ [Test] Erreur déploiement:', errorText);
  }
  
  console.log('🎉 [Test] Test terminé !');
}

// Exécution du test
async function runTest() {
  try {
    await testDeployAPIDirect();
  } catch (error) {
    console.error('❌ [Test] Échec du test:', error);
    process.exit(1);
  }
}

runTest();
