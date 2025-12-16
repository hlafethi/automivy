require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  const emailNode = workflow.nodes.find(n => n.name === '7. Notification Email');
  if (emailNode) {
    // Utiliser .first() au lieu de .item pour éviter l'erreur "paired item"
    emailNode.parameters.toEmail = '={{ $("Formulaire de Thème").first().json.email || $("Formulaire de Thème").first().json.Email || "user@heleam.com" }}';
    console.log('Email: toEmail corrigé avec .first()');
  } else {
    console.log('Nœud Email non trouvé');
    return;
  }
  
  const updateResponse = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    method: 'PUT',
    headers: { 
      'X-N8N-API-KEY': N8N_API_KEY, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ 
      name: workflow.name, 
      nodes: workflow.nodes, 
      connections: workflow.connections, 
      settings: workflow.settings 
    })
  });
  
  console.log(updateResponse.ok ? '✅ OK!' : '❌ Erreur: ' + await updateResponse.text());
}

fix().catch(console.error);
