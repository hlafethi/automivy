// Script pour trouver l'ID réel du credential "Header Auth account 2" dans n8n

const config = require('../config');

async function findHeaderAuthCredential() {
  console.log('🔍 [FindCredential] Recherche du credential "Header Auth account 2"...\n');
  
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  try {
    // Récupérer tous les workflows pour trouver le credential
    console.log('📋 [FindCredential] Récupération des workflows...');
    const workflowsResponse = await fetch(`${n8nUrl}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey
      }
    });
    
    if (!workflowsResponse.ok) {
      throw new Error(`Erreur récupération workflows: ${workflowsResponse.status}`);
    }
    
    const workflows = await workflowsResponse.json();
    const workflowsList = Array.isArray(workflows) ? workflows : (workflows.data || workflows.workflows || []);
    
    console.log(`✅ [FindCredential] ${workflowsList.length} workflow(s) trouvé(s)\n`);
    
    // Chercher le credential "Header Auth account 2" dans tous les workflows
    const foundCredentials = new Map();
    
    for (const workflow of workflowsList) {
      if (!workflow.nodes || !Array.isArray(workflow.nodes)) continue;
      
      for (const node of workflow.nodes) {
        if (!node.credentials) continue;
        
        // Chercher dans httpHeaderAuth
        if (node.credentials.httpHeaderAuth && node.credentials.httpHeaderAuth.id) {
          const credId = node.credentials.httpHeaderAuth.id;
          const credName = node.credentials.httpHeaderAuth.name || '';
          
          if (credName.toLowerCase().includes('header auth account 2') || 
              credName.toLowerCase().includes('header auth')) {
            if (!foundCredentials.has(credId)) {
              foundCredentials.set(credId, {
                id: credId,
                name: credName,
                type: 'httpHeaderAuth',
                foundIn: workflow.name,
                nodeName: node.name
              });
            }
          }
        }
        
        // Chercher dans openRouterApi
        if (node.credentials.openRouterApi && node.credentials.openRouterApi.id) {
          const credId = node.credentials.openRouterApi.id;
          const credName = node.credentials.openRouterApi.name || '';
          
          if (credName.toLowerCase().includes('header auth account 2') || 
              credName.toLowerCase().includes('openrouter')) {
            if (!foundCredentials.has(credId)) {
              foundCredentials.set(credId, {
                id: credId,
                name: credName,
                type: 'openRouterApi',
                foundIn: workflow.name,
                nodeName: node.name
              });
            }
          }
        }
      }
    }
    
    console.log(`\n📊 [FindCredential] Credentials trouvés: ${foundCredentials.size}\n`);
    
    if (foundCredentials.size === 0) {
      console.log('⚠️ [FindCredential] Aucun credential "Header Auth account 2" trouvé dans les workflows.');
      console.log('💡 [FindCredential] Le credential existe peut-être mais n\'est pas encore utilisé dans un workflow.');
      console.log('💡 [FindCredential] Vérifiez manuellement dans n8n l\'ID du credential "Header Auth account 2".\n');
    } else {
      console.log('✅ [FindCredential] Credentials "Header Auth account 2" trouvés:\n');
      foundCredentials.forEach((cred, id) => {
        console.log(`  ID: ${cred.id}`);
        console.log(`  Nom: ${cred.name}`);
        console.log(`  Type: ${cred.type}`);
        console.log(`  Trouvé dans workflow: ${cred.foundIn}`);
        console.log(`  Nœud: ${cred.nodeName}`);
        console.log('');
      });
      
      // Afficher l'ID à utiliser
      const firstCred = Array.from(foundCredentials.values())[0];
      console.log('💡 [FindCredential] ID à utiliser dans .env:');
      console.log(`   OPENROUTER_USER_CREDENTIAL_ID=${firstCred.id}`);
      console.log(`   OPENROUTER_USER_CREDENTIAL_NAME="${firstCred.name}"`);
    }
    
  } catch (error) {
    console.error('❌ [FindCredential] Erreur:', error.message);
    console.error('❌ [FindCredential] Stack:', error.stack);
  }
}

findHeaderAuthCredential();

