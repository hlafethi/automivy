import fetch from 'node-fetch';

// Test de conversion du port
async function testPortConversion() {
  console.log('🧪 [Test] Test conversion du port...');
  
  // Test avec différents formats de port
  const testConfigs = [
    { port: 465, name: "Port number 465" },
    { port: "465", name: "Port string 465" },
    { port: Number("465"), name: "Port Number(465)" },
    { port: parseInt("465"), name: "Port parseInt(465)" }
  ];
  
  for (const config of testConfigs) {
    console.log(`🔧 [Test] Test avec ${config.name}...`);
    
    const credentialData = {
      name: `SMTP-TEST-PORT-${Date.now()}`,
      type: "smtp",
      data: {
        host: "smtp.gmail.com",
        user: "test@example.com",
        password: "test_password",
        port: config.port,
        secure: true
      }
    };
    
    console.log('📤 [Test] Payload:', JSON.stringify(credentialData, null, 2));
    console.log('🔍 [Test] Port type:', typeof credentialData.data.port);
    console.log('🔍 [Test] Port value:', credentialData.data.port);
    
    try {
      const response = await fetch('http://localhost:3004/api/n8n/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialData)
      });
      
      console.log('📋 [Test] Réponse:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ [Test] Credential créé avec succès:', result.id);
        break; // Arrêter au premier succès
      } else {
        const errorText = await response.text();
        console.log('❌ [Test] Erreur:', errorText);
      }
      
    } catch (error) {
      console.log('❌ [Test] Exception:', error.message);
    }
    
    console.log('---');
  }
  
  console.log('🎉 [Test] Test conversion port terminé !');
}

// Exécution du test
async function runTest() {
  try {
    await testPortConversion();
  } catch (error) {
    console.error('❌ [Test] Échec du test:', error);
    process.exit(1);
  }
}

runTest();
