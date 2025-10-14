const fetch = require('node-fetch');

async function testAnalyzeDirect() {
  try {
    console.log('🔍 Test direct de l\'analyse...');
    
    const response = await fetch('http://localhost:3004/api/smart-deploy/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAxIiwiZW1haWwiOiJhZG1pbkBhdXRvbWl2eS5jb20iLCJyb2xlIjoiYWRtaW4ifSwiaWF0IjoxNzYwNDI4NDQxLCJleHAiOjE3NjA1MTQ4NDF9.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q'
      },
      body: JSON.stringify({
        workflowId: '77a79f77-188c-45df-a799-bdaaf06acaeb'
      })
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const result = await response.text();
    console.log('Response:', result);
    
    if (response.ok) {
      const data = JSON.parse(result);
      console.log('✅ Analyse réussie!');
      console.log('- Workflow:', data.workflow);
      console.log('- Credentials requis:', data.requiredCredentials?.length || 0);
    } else {
      console.log('❌ Erreur analyse');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testAnalyzeDirect();
