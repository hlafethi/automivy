import fetch from 'node-fetch';

async function testWorkflowsList() {
  try {
    console.log('🔍 Test de récupération des workflows...');
    
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
    console.log('2️⃣ Récupération des workflows...');
    
    const workflowsResponse = await fetch('http://localhost:3004/api/workflows', {
      method: 'GET',
      headers
    });
    
    console.log('   Status:', workflowsResponse.status);
    
    if (workflowsResponse.ok) {
      const workflows = await workflowsResponse.json();
      console.log('✅ Workflows récupérés !');
      console.log('   Nombre:', workflows.length);
      
      workflows.forEach((workflow, index) => {
        console.log(`   ${index + 1}. ${workflow.name} (ID: ${workflow.id})`);
        console.log(`      n8n_workflow_id: ${workflow.n8n_workflow_id}`);
        console.log(`      created_at: ${workflow.created_at}`);
      });
    } else {
      const error = await workflowsResponse.text();
      console.log('❌ Erreur récupération workflows:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testWorkflowsList();
