// Script de test pour le workflow PDF
const https = require('https');
const http = require('http');

// Configuration
const N8N_WEBHOOK_URL = 'https://votre-n8n-instance.com/webhook/analyze-insurance-quotes';
const TEST_PDF_URL = 'https://exemple.com/devis-assurance.pdf'; // Remplacez par un vrai PDF

// Données de test
const testData = {
  fileUrl: TEST_PDF_URL,
  // Optionnel : ajoutez d'autres paramètres
  clientName: "Test Client",
  analysisType: "comprehensive"
};

// Fonction pour envoyer la requête
function testWorkflow() {
  console.log('🚀 Test du workflow PDF...');
  console.log('📄 PDF URL:', testData.fileUrl);
  console.log('🔗 Webhook URL:', N8N_WEBHOOK_URL);
  
  const postData = JSON.stringify(testData);
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(N8N_WEBHOOK_URL, options, (res) => {
    console.log('📊 Status Code:', res.statusCode);
    console.log('📋 Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ Réponse du workflow:');
      console.log(data);
      
      if (res.statusCode === 200) {
        console.log('🎉 Workflow exécuté avec succès !');
        console.log('📧 Vérifiez votre email pour le devoir de conseil.');
      } else {
        console.log('❌ Erreur dans l\'exécution du workflow');
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Erreur de connexion:', error.message);
  });
  
  req.write(postData);
  req.end();
}

// Exécuter le test
testWorkflow();
