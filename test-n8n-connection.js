import fetch from 'node-fetch';

async function testN8nConnection() {
  try {
    console.log('🔍 Test de connexion à n8n...');
    
    const n8nUrl = 'https://n8n.globalsaas.eu';
    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiNmM3ZmUyNy1kNGY4LTQxYTktOTI3OS1kYzVjMmNhZWVmNDciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU5MzAzOTM2fQ.nejAxVx_Yv-Cz6TwJbEUvZufsNlSNl9Bw7psRb3JPzA';
    
    const response = await fetch(`${n8nUrl}/api/v1/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': apiKey,
      },
      body: JSON.stringify({})
    });
    
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Connexion n8n réussie !');
      console.log('Credentials trouvés:', data.length);
      data.forEach(cred => {
        console.log(`  - ${cred.name} (${cred.type}) [ID: ${cred.id}]`);
      });
    } else {
      const errorText = await response.text();
      console.log('❌ Erreur n8n:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Erreur connexion:', error.message);
  }
}

testN8nConnection();
