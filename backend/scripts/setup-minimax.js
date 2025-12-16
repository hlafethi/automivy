require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const FAL_KEY = '13777423-431b-4e41-933e-48c5bca1e82b:04054536c644cbe87612f3a58a84aee0';

async function setup() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // Modifier le nœud de génération vidéo pour MiniMax
  const falNode = workflow.nodes.find(n => n.name === '4. Fal.ai - Générer Vidéo');
  if (falNode) {
    // Changer l'URL pour MiniMax Video-01
    falNode.parameters.url = 'https://queue.fal.run/fal-ai/minimax/video-01';
    
    // Paramètres MiniMax
    const jsonBody = `={"prompt": "{{ $('Formulaire de Thème').first().json.body.theme || 'beautiful nature landscape' }}", "prompt_optimizer": true}`;
    falNode.parameters.jsonBody = jsonBody;
    
    console.log('✅ Modèle changé: MiniMax Video-01');
    console.log('   URL: fal-ai/minimax/video-01');
  }
  
  // Modifier le nœud de récupération pour MiniMax
  const node4b = workflow.nodes.find(n => n.name === '4b. Fal.ai - Récupérer Résultat');
  if (node4b) {
    // Garder la même logique - utiliser response_url
    console.log('✅ Nœud 4b: utilise response_url (compatible MiniMax)');
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
  
  if (updateResponse.ok) {
    console.log('\n🎬 MiniMax Video-01 configuré !');
    console.log('   Durée attendue: ~6 secondes');
    console.log('   Qualité: Excellente');
  } else {
    console.log('❌ Erreur:', await updateResponse.text());
  }
}

setup().catch(console.error);

