require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // Corriger le noeud 4b - utiliser response_url directement
  const node4b = workflow.nodes.find(n => n.name === '4b. Fal.ai - Récupérer Résultat');
  if (node4b) {
    // Utiliser la response_url retournée par le noeud 4
    node4b.parameters.url = '={{ $("4. Fal.ai - Générer Vidéo").first().json.response_url }}';
    console.log('✅ 4b: URL = response_url');
  }
  
  // Vérifier aussi le noeud 4c pour télécharger la vidéo
  const node4c = workflow.nodes.find(n => n.name === '4c. Télécharger Vidéo IA');
  if (node4c) {
    // L'URL de la vidéo est dans video.url du résultat
    node4c.parameters.url = '={{ $json.video?.url }}';
    console.log('✅ 4c: URL = video.url');
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
  
  console.log(updateResponse.ok ? '\n✅ URLs corrigées !' : '❌ Erreur: ' + await updateResponse.text());
}

fix().catch(console.error);

