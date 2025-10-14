import fetch from 'node-fetch';

async function testWorkflowDeletion() {
  try {
    console.log('🔍 Test de suppression de workflow...');
    
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
    console.log('2️⃣ Récupération des workflows existants...');
    
    const workflowsResponse = await fetch('http://localhost:3004/api/workflows', {
      method: 'GET',
      headers
    });
    
    console.log('   Status:', workflowsResponse.status);
    
    if (workflowsResponse.ok) {
      const workflows = await workflowsResponse.json();
      console.log('✅ Workflows récupérés !');
      console.log('   Nombre:', workflows.length);
      
      if (workflows.length > 0) {
        const workflowToDelete = workflows[0];
        console.log('');
        console.log('3️⃣ Suppression du workflow:', workflowToDelete.name);
        console.log('   ID:', workflowToDelete.id);
        console.log('   n8n_workflow_id:', workflowToDelete.n8n_workflow_id);
        
        const deleteResponse = await fetch(`http://localhost:3004/api/workflows/${workflowToDelete.id}`, {
          method: 'DELETE',
          headers
        });
        
        console.log('   Status suppression:', deleteResponse.status);
        
        if (deleteResponse.ok) {
          const deleteResult = await deleteResponse.json();
          console.log('✅ Workflow supprimé !');
          console.log('   Message:', deleteResult.message);
        } else {
          const error = await deleteResponse.text();
          console.log('❌ Erreur suppression:', error);
        }
      } else {
        console.log('ℹ️ Aucun workflow à supprimer');
      }
    } else {
      const error = await workflowsResponse.text();
      console.log('❌ Erreur récupération workflows:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testWorkflowDeletion();
