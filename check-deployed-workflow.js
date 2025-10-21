import fetch from 'node-fetch';

// Vérifier le statut du workflow déployé
async function checkDeployedWorkflow() {
  console.log('🔍 [Check] Vérification du workflow déployé...');
  
  // ID du workflow déployé depuis les logs
  const workflowId = 'EH3X7Uq1fxxyi59X'; // Premier workflow déployé
  
  try {
    // Récupérer les détails du workflow
    const response = await fetch(`http://localhost:3004/api/n8n/workflows/${workflowId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur récupération workflow: ${response.status}`);
    }
    
    const workflow = await response.json();
    console.log('📋 [Check] Détails du workflow:');
    console.log('  - ID:', workflow.id);
    console.log('  - Name:', workflow.name);
    console.log('  - Active:', workflow.active);
    console.log('  - Created:', workflow.createdAt);
    
    // Vérifier les credentials du nœud Send Email
    const sendEmailNode = workflow.nodes.find(node => 
      node.type === 'n8n-nodes-base.emailSend' || 
      node.name?.toLowerCase().includes('send') ||
      node.name?.toLowerCase().includes('email')
    );
    
    if (sendEmailNode) {
      console.log('📋 [Check] Nœud Send Email trouvé:');
      console.log('  - Name:', sendEmailNode.name);
      console.log('  - Type:', sendEmailNode.type);
      console.log('  - Credentials:', sendEmailNode.credentials);
      
      if (sendEmailNode.credentials?.smtp) {
        console.log('📋 [Check] Credential SMTP:');
        console.log('  - ID:', sendEmailNode.credentials.smtp.id);
        console.log('  - Name:', sendEmailNode.credentials.smtp.name);
        
        // Récupérer les détails du credential SMTP
        const credentialResponse = await fetch(`http://localhost:3004/api/n8n/credentials/${sendEmailNode.credentials.smtp.id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (credentialResponse.ok) {
          const credential = await credentialResponse.json();
          console.log('📋 [Check] Détails credential SMTP:');
          console.log('  - ID:', credential.id);
          console.log('  - Name:', credential.name);
          console.log('  - Type:', credential.type);
          console.log('  - Host:', credential.data?.host);
          console.log('  - Port:', credential.data?.port);
          console.log('  - Secure:', credential.data?.secure);
          console.log('  - User:', credential.data?.user);
          
          if (credential.data?.secure === true) {
            console.log('✅ [Check] SSL/TLS est activé (secure: true)');
          } else {
            console.log('❌ [Check] SSL/TLS n\'est pas activé');
          }
        } else {
          console.log('⚠️ [Check] Impossible de récupérer les détails du credential');
        }
      } else {
        console.log('❌ [Check] Aucun credential SMTP trouvé dans le nœud');
      }
    } else {
      console.log('❌ [Check] Aucun nœud Send Email trouvé');
    }
    
  } catch (error) {
    console.error('❌ [Check] Erreur:', error.message);
  }
  
  console.log('🎉 [Check] Vérification terminée !');
}

// Exécution de la vérification
async function runCheck() {
  try {
    await checkDeployedWorkflow();
  } catch (error) {
    console.error('❌ [Check] Échec de la vérification:', error);
    process.exit(1);
  }
}

runCheck();
