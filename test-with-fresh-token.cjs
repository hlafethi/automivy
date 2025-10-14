const http = require('http');

async function testWithFreshToken() {
  try {
    console.log('🔍 Test avec un nouveau token...');
    
    // 1. Se connecter pour obtenir un nouveau token
    console.log('1️⃣ Connexion pour obtenir un nouveau token...');
    
    const loginData = JSON.stringify({
      email: 'admin@automivy.com',
      password: 'admin123'
    });
    
    const loginOptions = {
      hostname: 'localhost',
      port: 3004,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    const loginReq = http.request(loginOptions, (loginRes) => {
      let loginData = '';
      loginRes.on('data', (chunk) => {
        loginData += chunk;
      });
      
      loginRes.on('end', () => {
        console.log('📡 Login Status:', loginRes.statusCode);
        
        if (loginRes.statusCode === 200) {
          const loginResult = JSON.parse(loginData);
          const token = loginResult.token;
          console.log('✅ Token obtenu:', token.substring(0, 50) + '...');
          
          // 2. Tester l'analyse avec le nouveau token
          console.log('2️⃣ Test de l\'analyse avec le nouveau token...');
          
          const analyzeData = JSON.stringify({
            workflowId: '77a79f77-188c-45df-a799-bdaaf06acaeb'
          });
          
          const analyzeOptions = {
            hostname: 'localhost',
            port: 3004,
            path: '/api/smart-deploy/analyze',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(analyzeData),
              'Authorization': `Bearer ${token}`
            }
          };
          
          const analyzeReq = http.request(analyzeOptions, (analyzeRes) => {
            let analyzeResponse = '';
            analyzeRes.on('data', (chunk) => {
              analyzeResponse += chunk;
            });
            
            analyzeRes.on('end', () => {
              console.log('📡 Analyze Status:', analyzeRes.statusCode);
              console.log('📡 Analyze Response:', analyzeResponse);
              
              if (analyzeRes.statusCode === 200) {
                console.log('✅ Analyse réussie !');
                const result = JSON.parse(analyzeResponse);
                console.log('- Workflow:', result.workflow);
                console.log('- Credentials requis:', result.requiredCredentials?.length || 0);
              } else {
                console.log('❌ Analyse échouée');
              }
              
              process.exit(0);
            });
          });
          
          analyzeReq.on('error', (error) => {
            console.error('❌ Erreur analyse:', error);
            process.exit(1);
          });
          
          analyzeReq.write(analyzeData);
          analyzeReq.end();
          
        } else {
          console.log('❌ Échec de la connexion');
          console.log('Response:', loginData);
          process.exit(1);
        }
      });
    });
    
    loginReq.on('error', (error) => {
      console.error('❌ Erreur login:', error);
      process.exit(1);
    });
    
    loginReq.write(loginData);
    loginReq.end();
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testWithFreshToken();
