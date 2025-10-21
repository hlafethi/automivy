// Test direct de la route Smart Deploy
const http = require('http');

async function testSmartDeploy() {
  console.log('🧪 [Test] Test direct de la route Smart Deploy...');
  
  const testData = {
    workflowId: 'ee43abec-a741-49c3-83a6-610b2122170d',
    credentials: {
      smtpEmail: 'user@heleam.com',
      smtpPassword: 'motdepasse123',
      smtpServer: 'mail.heleam.com',
      smtpPort: 465
    }
  };
  
  console.log('📋 [Test] Données de test:', JSON.stringify(testData, null, 2));
  
  const postData = JSON.stringify(testData);
  
  const options = {
    hostname: 'localhost',
    port: 3004,
    path: '/api/smart-deploy/deploy',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhjMjEwMDMwLTdkMGEtNDhlZS05N2QyLWI3NDU2NGIxZWZlZiIsImVtYWlsIjoidXNlckBoZWxlYW0uY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjA2MTEwNzYsImV4cCI6MTc2MDY5NzQ3Nn0.VkWyukNlE6tAfOExUXR3I-pN939oIJFVJNKHVFNoyk4'
    }
  };
  
  try {
    console.log('🔄 [Test] Envoi de la requête...');
    
    const req = http.request(options, (res) => {
      console.log('📊 [Test] Status:', res.statusCode);
      console.log('📊 [Test] Headers:', res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ [Test] Succès:', data);
        } else {
          console.error('❌ [Test] Erreur:', res.statusCode, data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ [Test] Erreur de connexion:', error.message);
    });
    
    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('❌ [Test] Erreur:', error.message);
  }
}

// Exécuter le test
testSmartDeploy();
