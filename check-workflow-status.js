import fetch from 'node-fetch';

async function checkWorkflowStatus() {
  console.log('🧪 [Test] Vérification du statut du workflow...');
  
  try {
    // Vérifier le workflow dans n8n
    console.log('🔧 [Test] Vérification workflow n8n: kwp2N4WsxEck3MRM');
    const n8nResponse = await fetch('http://localhost:5678/api/v1/workflows/kwp2N4WsxEck3MRM', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': 'your-api-key-here' // Remplace par ta vraie clé API
      }
    });
    
    console.log('📋 [Test] Réponse n8n:', n8nResponse.status, n8nResponse.statusText);
    
    if (n8nResponse.ok) {
      const workflow = await n8nResponse.json();
      console.log('✅ [Test] Workflow trouvé dans n8n:');
      console.log('  - ID:', workflow.id);
      console.log('  - Nom:', workflow.name);
      console.log('  - Actif:', workflow.active);
      console.log('  - Créé:', workflow.createdAt);
      console.log('  - Mis à jour:', workflow.updatedAt);
      
      // Vérifier les nœuds
      if (workflow.nodes) {
        console.log('  - Nombre de nœuds:', workflow.nodes.length);
        
        // Chercher le nœud Send email
        const emailNode = workflow.nodes.find(node => 
          node.type === 'n8n-nodes-base.emailSend' || 
          node.name?.toLowerCase().includes('email') ||
          node.name?.toLowerCase().includes('send')
        );
        
        if (emailNode) {
          console.log('  - Nœud email trouvé:', emailNode.name);
          console.log('  - Type:', emailNode.type);
          console.log('  - Credentials:', emailNode.credentials);
          console.log('  - Parameters:', emailNode.parameters);
        } else {
          console.log('  - Aucun nœud email trouvé');
        }
      }
    } else {
      const error = await n8nResponse.text();
      console.log('❌ [Test] Erreur n8n:', error);
    }
    
  } catch (error) {
    console.error('❌ [Test] Erreur:', error);
  }
  
  console.log('🎉 [Test] Vérification terminée !');
}

checkWorkflowStatus();
