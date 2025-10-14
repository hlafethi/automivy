const http = require('http');

async function testBackendSimple() {
  try {
    console.log('🔍 Test simple du backend...');
    
    const options = {
      hostname: 'localhost',
      port: 3004,
      path: '/api/smart-deploy/workflows',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAxIiwiZW1haWwiOiJhZG1pbkBhdXRvbWl2eS5jb20iLCJyb2xlIjoiYWRtaW4ifSwiaWF0IjoxNzYwNDI4NDQxLCJleHAiOjE3NjA1MTQ4NDF9.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q'
      }
    };
    
    const req = http.request(options, (res) => {
      console.log('Status:', res.statusCode);
      console.log('Headers:', res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response:', data);
        process.exit(0);
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Erreur requête:', error);
      process.exit(1);
    });
    
    req.end();
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testBackendSimple();
