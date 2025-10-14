const http = require('http');

async function debugFrontendId() {
  try {
    console.log('🔍 Debug de l\'ID envoyé par le frontend...');
    
    // 1. Connexion avec testuser@automivy.com
    console.log('1️⃣ Connexion testuser@automivy.com...');
    const loginData = JSON.stringify({
      email: 'testuser@automivy.com',
      password: 'test123'
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
                
                console.log('📋 Détails des workflows:');
                workflows.workflows.forEach((workflow, index) => {
                  console.log(`  ${index + 1}. ID: "${workflow.id}" (Type: ${typeof workflow.id}, Length: ${workflow.id?.length})`);
                  console.log(`     Name: "${workflow.name}"`);
                  console.log(`     Description: "${workflow.description || 'N/A'}"`);
                  
                  // Vérifier si c'est un UUID valide
                  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                  const isValidUUID = uuidRegex.test(workflow.id);
                  console.log(`     UUID valide: ${isValidUUID}`);
                  console.log('');
                });
                
                if (workflows.workflows.length > 0) {
                  const workflow = workflows.workflows[0];
                  console.log('🎯 Workflow sélectionné pour test:');
                  console.log('  ID:', workflow.id);
                  console.log('  Type:', typeof workflow.id);
                  console.log('  Length:', workflow.id?.length);
                  
                  // Test de l'analyse avec cet ID
                  console.log('3️⃣ Test analyse avec cet ID...');
                  const analyzeData = JSON.stringify({
                    workflowId: workflow.id
                  });
                  
                  console.log('📤 Données envoyées:', analyzeData);
                  
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
                      } else {
                        console.log('❌ Erreur - Status:', analyzeRes.statusCode);
                        console.log('❌ Erreur - Response:', analyzeResponse);
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

debugFrontendId();
