// Script de test pour le workflow PDF OCR
const https = require('https');
const http = require('http');

// Configuration - REMPLACEZ par vos vraies valeurs
const N8N_WEBHOOK_URL = 'https://votre-n8n-instance.com/webhook/pdf-ocr-analysis';
const TEST_PDF_URL = 'https://exemple.com/devis-assurance.pdf'; // Remplacez par un vrai PDF

// Données de test
const testData = {
  fileUrl: TEST_PDF_URL,
  clientName: "Test Client",
  analysisType: "comprehensive"
};

console.log('🚀 Test du workflow PDF OCR...');
console.log('📄 PDF URL:', testData.fileUrl);
console.log('🔗 Webhook URL:', N8N_WEBHOOK_URL);

// Fonction pour envoyer la requête
function testWorkflow() {
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
        console.log('🔍 Vérifiez les logs n8n pour plus de détails');
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Erreur de connexion:', error.message);
    console.log('🔍 Vérifiez que votre instance n8n est accessible');
  });
  
  req.write(postData);
  req.end();
}

// Exécuter le test
testWorkflow();
