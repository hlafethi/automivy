import fetch from 'node-fetch';

// Déployer et vérifier immédiatement
async function deployAndCheck() {
  console.log('🧪 [Test] Déploiement et vérification immédiate...');
  
  // 1. Connexion
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
    throw new Error(`Erreur analyse: ${analyzeResponse.status}`);
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
  
  const deployResponse = await fetch('http://localhost:3004/api/smart-deploy/deploy', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(deployData)
  });
  
  if (!deployResponse.ok) {
    const errorText = await deployResponse.text();
    throw new Error(`Erreur déploiement: ${deployResponse.status} - ${errorText}`);
  }
  
  const deployResult = await deployResponse.json();
  console.log('✅ [Test] Déploiement réussi !');
  console.log('📋 [Test] Résultat:', deployResult);
  
  const n8nWorkflowId = deployResult.workflow.n8n_workflow_id;
  console.log('📋 [Test] ID workflow n8n:', n8nWorkflowId);
  
  // 5. Vérifier immédiatement le workflow
  console.log('🔧 [Test] Vérification du workflow...');
  
  const workflowResponse = await fetch(`http://localhost:3004/api/n8n/workflows/${n8nWorkflowId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!workflowResponse.ok) {
    throw new Error(`Erreur récupération workflow: ${workflowResponse.status}`);
  }
  
  const workflow = await workflowResponse.json();
  console.log('📋 [Test] Workflow vérifié:');
  console.log('  - ID:', workflow.id);
  console.log('  - Name:', workflow.name);
  console.log('  - Active:', workflow.active);
  
  // Vérifier les credentials du nœud Send Email
  const sendEmailNode = workflow.nodes.find(node => 
    node.type === 'n8n-nodes-base.emailSend' || 
    node.name?.toLowerCase().includes('send') ||
    node.name?.toLowerCase().includes('email')
  );
  
  if (sendEmailNode) {
    console.log('📋 [Test] Nœud Send Email trouvé:');
    console.log('  - Name:', sendEmailNode.name);
    console.log('  - Type:', sendEmailNode.type);
    console.log('  - Credentials:', sendEmailNode.credentials);
    
    if (sendEmailNode.credentials?.smtp) {
      console.log('📋 [Test] Credential SMTP:');
      console.log('  - ID:', sendEmailNode.credentials.smtp.id);
      console.log('  - Name:', sendEmailNode.credentials.smtp.name);
      
      // Récupérer les détails du credential SMTP
      const credentialResponse = await fetch(`http://localhost:3004/api/n8n/credentials/${sendEmailNode.credentials.smtp.id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (credentialResponse.ok) {
        const credential = await credentialResponse.json();
        console.log('📋 [Test] Détails credential SMTP:');
        console.log('  - ID:', credential.id);
        console.log('  - Name:', credential.name);
        console.log('  - Type:', credential.type);
        console.log('  - Host:', credential.data?.host);
        console.log('  - Port:', credential.data?.port);
        console.log('  - Secure:', credential.data?.secure);
        console.log('  - User:', credential.data?.user);
        
        if (credential.data?.secure === true) {
          console.log('✅ [Test] SSL/TLS est activé (secure: true)');
        } else {
          console.log('❌ [Test] SSL/TLS n\'est pas activé');
        }
      } else {
        console.log('⚠️ [Test] Impossible de récupérer les détails du credential');
      }
    } else {
      console.log('❌ [Test] Aucun credential SMTP trouvé dans le nœud');
    }
  } else {
    console.log('❌ [Test] Aucun nœud Send Email trouvé');
  }
  
  console.log('🎉 [Test] Déploiement et vérification terminés !');
}

// Exécution du test
async function runTest() {
  try {
    await deployAndCheck();
  } catch (error) {
    console.error('❌ [Test] Échec du test:', error);
    process.exit(1);
  }
}

runTest();
