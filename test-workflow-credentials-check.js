import fetch from 'node-fetch';

async function testWorkflowCredentialsCheck() {
  try {
    console.log('🔍 Vérification des credentials dans le workflow...');
    
    // Se connecter en tant qu'admin
    console.log('1️⃣ Connexion admin...');
    const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@automivy.com',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('   Status:', loginResponse.status);
    console.log('   User:', loginData.user?.email);
    
    if (!loginData.token) {
      console.log('❌ Pas de token, impossible de tester');
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('');
    console.log('2️⃣ Récupération du workflow depuis n8n...');
    
    // Récupérer le workflow depuis n8n
    const workflowResponse = await fetch('http://localhost:3004/api/n8n/workflows/xv1JlgmAATRrVOq2', {
      method: 'GET',
      headers
    });
    
    const workflowData = await workflowResponse.json();
    console.log('   Status:', workflowResponse.status);
    
    if (workflowResponse.status === 200) {
      console.log('✅ Workflow récupéré !');
      console.log('   Nom:', workflowData.name);
      console.log('   Nœuds:', workflowData.nodes?.length || 0);
      
      // Analyser les nœuds et leurs credentials
      console.log('');
      console.log('3️⃣ Analyse des credentials des nœuds...');
      
      workflowData.nodes?.forEach((node, index) => {
        console.log(`   ${index + 1}. ${node.name} (${node.type})`);
        if (node.credentials && Object.keys(node.credentials).length > 0) {
          console.log(`      ✅ Credentials configurés:`, Object.keys(node.credentials));
          Object.entries(node.credentials).forEach(([key, cred]) => {
            console.log(`         - ${key}: ${cred.name} (ID: ${cred.id})`);
          });
        } else {
          console.log(`      ❌ Aucun credential configuré`);
        }
      });
      
      // Vérifier spécifiquement les nœuds LLM/AI
      const aiNodes = workflowData.nodes?.filter(node => 
        node.type?.includes('openAi') || 
        node.name?.toLowerCase().includes('ai') ||
        node.name?.toLowerCase().includes('llm') ||
        node.name?.toLowerCase().includes('openrouter')
      );
      
      console.log('');
      console.log('4️⃣ Nœuds LLM/AI trouvés:', aiNodes?.length || 0);
      aiNodes?.forEach((node, index) => {
        console.log(`   ${index + 1}. ${node.name}`);
        if (node.credentials?.openAiApi) {
          console.log(`      ✅ Credential OpenRouter configuré: ${node.credentials.openAiApi.name}`);
        } else {
          console.log(`      ❌ Credential OpenRouter manquant`);
        }
      });
      
    } else {
      console.log('❌ Erreur récupération workflow:', workflowData);
    }
    
    console.log('');
    console.log('🎉 Vérification terminée !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testWorkflowCredentialsCheck();
