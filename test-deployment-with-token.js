import fetch from 'node-fetch';

// Test du déploiement avec le token valide
async function testDeploymentWithToken() {
  console.log('🧪 [Test] Test déploiement avec token valide...');
  
  // 1. Se connecter pour obtenir un token
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
  console.log('✅ [Test] Token obtenu:', token.substring(0, 20) + '...');
  
  // 2. Récupérer les workflows disponibles
  console.log('🔧 [Test] Récupération des workflows...');
  
  const workflowsResponse = await fetch('http://localhost:3004/api/smart-deploy/workflows', {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!workflowsResponse.ok) {
    const errorText = await workflowsResponse.text();
    throw new Error(`Erreur workflows: ${workflowsResponse.status} - ${errorText}`);
  }
  
  const workflowsResult = await workflowsResponse.json();
  console.log('✅ [Test] Workflows disponibles:', workflowsResult.workflows.length);
  
  if (workflowsResult.workflows.length === 0) {
    console.log('⚠️ [Test] Aucun workflow disponible');
    return;
  }
  
  const firstWorkflow = workflowsResult.workflows[0];
  console.log('📋 [Test] Premier workflow:', firstWorkflow.name, '(ID:', firstWorkflow.id + ')');
  
  // 3. Analyser le workflow
  console.log('🔧 [Test] Analyse du workflow...');
  
  const analyzeResponse = await fetch('http://localhost:3004/api/smart-deploy/analyze', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ workflowId: firstWorkflow.id })
  });
  
  if (!analyzeResponse.ok) {
    const errorText = await analyzeResponse.text();
    throw new Error(`Erreur analyse: ${analyzeResponse.status} - ${errorText}`);
  }
  
  const analyzeResult = await analyzeResponse.json();
  console.log('✅ [Test] Workflow analysé:', analyzeResult.requiredCredentials.length, 'credentials requis');
  
  // 4. Déployer le workflow
  console.log('🔧 [Test] Déploiement du workflow...');
  
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
    await testDeploymentWithToken();
  } catch (error) {
    console.error('❌ [Test] Échec du test:', error);
    process.exit(1);
  }
}

runTest();
