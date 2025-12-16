require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // Corriger le nœud Fal.ai
  const falNode = workflow.nodes.find(n => n.name === '4. Fal.ai - Générer Vidéo');
  if (falNode) {
    // num_frames max = 121
    // Utiliser le thème du formulaire DIRECTEMENT
    falNode.parameters.jsonBody = JSON.stringify({
      prompt: "={{ $('Formulaire de Thème').first().json.Thème_Video || $('Formulaire de Thème').first().json.theme || 'beautiful nature landscape' }}",
      aspect_ratio: "16:9",
      resolution: "480p",
      num_frames: 121,
      num_inference_steps: 28,
      enable_prompt_expansion: true
    });
    console.log('✅ Fal.ai: num_frames = 121 (max autorisé)');
    console.log('✅ Fal.ai: prompt = thème du formulaire');
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
  
  console.log(updateResponse.ok ? '\n✅ Corrigé !' : '❌ Erreur: ' + await updateResponse.text());
}

fix().catch(console.error);

