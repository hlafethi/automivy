const http = require('http');

async function testAnalyzeError() {
  try {
    console.log('🔍 Test de l\'erreur d\'analyse...');
    
    // 1. Connexion pour obtenir un token frais
    console.log('1️⃣ Connexion...');
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
      let loginResponse = '';
      loginRes.on('data', (chunk) => {
        loginResponse += chunk;
      });
      
      loginRes.on('end', () => {
        console.log('📡 Login Status:', loginRes.statusCode);
        
        if (loginRes.statusCode === 200) {
          const loginResult = JSON.parse(loginResponse);
          const token = loginResult.token;
          console.log('✅ Token obtenu');
          
          // 2. Test direct de l'analyse
          console.log('2️⃣ Test analyse directe...');
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
              
              if (analyzeRes.statusCode === 500) {
                console.log('❌ Erreur 500 détectée');
                try {
                  const error = JSON.parse(analyzeResponse);
                  console.log('❌ Détails erreur:', error);
                } catch (e) {
                  console.log('❌ Erreur non-JSON:', analyzeResponse);
                }
              } else if (analyzeRes.statusCode === 200) {
                console.log('✅ Analyse réussie');
                const result = JSON.parse(analyzeResponse);
                console.log('- Workflow:', result.workflow);
                console.log('- Credentials:', result.requiredCredentials?.length || 0);
              }
              
              process.exit(0);
            });
          });
          
          analyzeReq.on('error', (error) => {
            console.error('❌ Erreur requête:', error);
            process.exit(1);
          });
          
          analyzeReq.write(analyzeData);
          analyzeReq.end();
          
        } else {
          console.log('❌ Échec connexion');
          console.log('Response:', loginResponse);
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

testAnalyzeError();
