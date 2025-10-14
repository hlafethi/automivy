const http = require('http');

async function testBackendStatus() {
  try {
    console.log('🔍 Test du statut du backend...');
    
    const options = {
      hostname: 'localhost',
      port: 3004,
      path: '/api/smart-deploy/workflows',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAxIiwiZW1haWwiOiJhZG1pbkBhdXRvbWl2eS5jb20iLCJyb2xlIjoiYWRtaW4ifSwiaWF0IjoxNzYwNDI4NDQxLCJleHAiOjE3NjA1MTQ4NDF9.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q'
      }
    };
    
    const req = http.request(options, (res) => {
      console.log('📡 Status:', res.statusCode);
      console.log('📡 Headers:', res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📡 Response:', data);
        
        if (res.statusCode === 200) {
          console.log('✅ Backend fonctionne - route /workflows OK');
        } else if (res.statusCode === 403) {
          console.log('❌ Token expiré - besoin de nouveau token');
        } else {
          console.log('❌ Problème backend - status:', res.statusCode);
        }
        
        process.exit(0);
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Erreur connexion backend:', error);
      console.log('💡 Le backend n\'est peut-être pas démarré');
      process.exit(1);
    });
    
    req.end();
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testBackendStatus();
