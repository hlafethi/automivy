// Test du webhook PDF avec des données simulées
import fetch from 'node-fetch';

async function testPDFWebhook() {
  try {
    console.log('🧪 Test du webhook PDF...');
    
    // Données de test simulées
    const testData = {
      token: 'deploy_1760538851337_t83hhqsyj',
      template: 'template-test',
      clientName: 'Jean Dupont',
      clientEmail: 'jean.dupont@exemple.com',
      files: [
        {
          fileName: 'devis-assurance-1.pdf',
          fileData: 'JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoyNTAgNzAwIFRkCihUZXN0IFBERiBGaWxlKSBUagoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYKMDAwMDAwMDAwOSAwMDAwMCBuCjAwMDAwMDAwNTggMDAwMDAgbgowMDAwMDAwMTE1IDAwMDAwIG4KMDAwMDAwMDE3MiAwMDAwMCBuCjAwMDAwMDAyNDcgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjM0NQolJUVPRg==', // PDF de test en base64
          fileSize: 1024
        }
      ]
    };
    
    console.log('📋 Données de test:', {
      clientName: testData.clientName,
      clientEmail: testData.clientEmail,
      filesCount: testData.files.length
    });
    
    // Test avec le webhook n8n (si disponible)
    const n8nWebhookUrl = 'http://localhost:5678/webhook/pdf-upload-analysis';
    
    try {
      console.log('🔗 Test du webhook n8n...');
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Webhook n8n fonctionne !');
        console.log('📧 Résultat:', result);
      } else {
        console.log('⚠️ Webhook n8n non disponible, test avec API simulée');
        await testWithSimulatedAPI(testData);
      }
    } catch (error) {
      console.log('⚠️ Webhook n8n non accessible, test avec API simulée');
      await testWithSimulatedAPI(testData);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

async function testWithSimulatedAPI(testData) {
  console.log('🔄 Test avec API simulée...');
  
  // Simuler le traitement PDF
  console.log('📄 Simulation du traitement OCR...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simuler l'analyse IA
  console.log('🤖 Simulation de l\'analyse IA...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Simuler l'envoi d'email
  console.log('📧 Simulation de l\'envoi d\'email...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('✅ Test simulé terminé !');
  console.log('📧 Email de devoir de conseil envoyé à:', testData.clientEmail);
  console.log('📋 Contenu simulé:');
  console.log(`
    DEVOIR DE CONSEIL ASSURANCE
    ==========================
    
    Client: ${testData.clientName}
    Email: ${testData.clientEmail}
    Date: ${new Date().toLocaleDateString('fr-FR')}
    
    ANALYSE DES DEVIS:
    - Devis 1: Assurance complémentaire santé
    - Prime mensuelle: 45€
    - Garanties: Hospitalisation, Optique, Dentaire
    - Recommandation: Offre adaptée aux besoins
    
    POINTS DE VIGILANCE:
    - Vérifier les délais de carence
    - Comparer les plafonds de remboursement
    - Analyser les exclusions
    
    RECOMMANDATION:
    Cette offre semble adaptée à votre profil.
    Contactez-nous pour finaliser votre souscription.
  `);
}

// Exécuter le test
testPDFWebhook();
