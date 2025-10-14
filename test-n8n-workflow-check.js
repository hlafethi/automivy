import fetch from 'node-fetch';

async function testN8nWorkflowCheck() {
  try {
    console.log('🔍 Vérification du workflow dans n8n...');
    
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
    
    if (!loginData.token) {
      console.log('❌ Pas de token, impossible de tester');
      return;
    }
    
    const headers = {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('');
    console.log('2️⃣ Vérification du workflow dans n8n...');
    
    // Vérifier si le workflow existe encore dans n8n
    const n8nWorkflowId = 'uQrtCpsy9MM4iqlD'; // ID du workflow supprimé
    const n8nResponse = await fetch(`http://localhost:3004/api/n8n/workflows/${n8nWorkflowId}`, {
      method: 'GET',
      headers
    });
    
    console.log('   Status n8n:', n8nResponse.status);
    
    if (n8nResponse.status === 404) {
      console.log('✅ Workflow supprimé de n8n avec succès !');
    } else if (n8nResponse.ok) {
      const workflowData = await n8nResponse.json();
      console.log('❌ Workflow encore présent dans n8n !');
      console.log('   Nom:', workflowData.name);
      console.log('   ID:', workflowData.id);
    } else {
      const error = await n8nResponse.text();
      console.log('❌ Erreur vérification n8n:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testN8nWorkflowCheck();
