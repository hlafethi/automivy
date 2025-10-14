const http = require('http');

async function testBackendLogs() {
  try {
    console.log('🔍 Test des logs du backend...');
    
    const postData = JSON.stringify({
      workflowId: '77a79f77-188c-45df-a799-bdaaf06acaeb'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3004,
      path: '/api/smart-deploy/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAxIiwiZW1haWwiOiJhZG1pbkBhdXRvbWl2eS5jb20iLCJyb2xlIjoiYWRtaW4ifSwiaWF0IjoxNzYwNDI4NDQxLCJleHAiOjE3NjA1MTQ4NDF9.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q'
      }
    };
    
    console.log('📡 Envoi de la requête...');
    console.log('📡 URL:', `http://${options.hostname}:${options.port}${options.path}`);
    console.log('📡 Body:', postData);
    
    const req = http.request(options, (res) => {
      console.log('📡 Status:', res.statusCode);
      console.log('📡 Headers:', res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📡 Response:', data);
        console.log('📡 Les logs du backend devraient apparaître ci-dessus');
        process.exit(0);
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Erreur requête:', error);
      process.exit(1);
    });
    
    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testBackendLogs();
