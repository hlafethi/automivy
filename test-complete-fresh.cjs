const http = require('http');

async function testCompleteFresh() {
  try {
    console.log('🚀 Test complet avec token frais...');
    
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
          console.log('✅ Token frais obtenu');
          
          // 2. Test de la route /workflows
          console.log('2️⃣ Test route /workflows...');
          const workflowsOptions = {
            hostname: 'localhost',
            port: 3004,
            path: '/api/smart-deploy/workflows',
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          };
          
          const workflowsReq = http.request(workflowsOptions, (workflowsRes) => {
            let workflowsResponse = '';
            workflowsRes.on('data', (chunk) => {
              workflowsResponse += chunk;
            });
            
            workflowsRes.on('end', () => {
              console.log('📡 Workflows Status:', workflowsRes.statusCode);
              
              if (workflowsRes.statusCode === 200) {
                const workflows = JSON.parse(workflowsResponse);
                console.log('✅ Workflows récupérés:', workflows.workflows.length);
                
                if (workflows.workflows.length > 0) {
                  const workflow = workflows.workflows[0];
                  console.log('📋 Workflow sélectionné:', workflow.name, '(ID:', workflow.id, ')');
                  
                  // 3. Test de l'analyse
                  console.log('3️⃣ Test analyse...');
                  const analyzeData = JSON.stringify({
                    workflowId: workflow.id
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
                        console.log('🎉 SUCCÈS ! L\'analyse fonctionne !');
                        const result = JSON.parse(analyzeResponse);
                        console.log('- Workflow:', result.workflow);
                        console.log('- Credentials requis:', result.requiredCredentials?.length || 0);
                      } else {
                        console.log('❌ Analyse échouée - Status:', analyzeRes.statusCode);
                        console.log('❌ Erreur:', analyzeResponse);
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
                  console.log('❌ Aucun workflow disponible');
                  process.exit(1);
                }
              } else {
                console.log('❌ Échec récupération workflows - Status:', workflowsRes.statusCode);
                console.log('❌ Erreur:', workflowsResponse);
                process.exit(1);
              }
            });
          });
          
          workflowsReq.on('error', (error) => {
            console.error('❌ Erreur workflows:', error);
            process.exit(1);
          });
          
          workflowsReq.end();
          
        } else {
          console.log('❌ Échec connexion - Status:', loginRes.statusCode);
          console.log('❌ Erreur:', loginResponse);
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

testCompleteFresh();
