require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  const falNode = workflow.nodes.find(n => n.name === '4. Fal.ai - Générer Vidéo');
  if (falNode) {
    // Essayer TOUS les noms de champs possibles
    const jsonBody = `={"prompt": "{{ $('Formulaire de Thème').first().json.Thème_Video || $('Formulaire de Thème').first().json.theme || $('Formulaire de Thème').first().json.Theme || $('Formulaire de Thème').first().json.prompt || $('Formulaire de Thème').first().json.text || $('Formulaire de Thème').first().json.video || $('Formulaire de Thème').first().json.description || $('Formulaire de Thème').first().json.body?.Thème_Video || $('Formulaire de Thème').first().json.body?.theme || Object.values($('Formulaire de Thème').first().json.body || $('Formulaire de Thème').first().json)[0] || 'beautiful nature landscape' }}", "aspect_ratio": "16:9", "resolution": "480p", "num_frames": 121, "num_inference_steps": 28, "enable_prompt_expansion": true}`;
    
    falNode.parameters.jsonBody = jsonBody;
    console.log('✅ Prompt universel configuré');
    console.log('   Cherche: Thème_Video, theme, Theme, prompt, text, video, description, body.*');
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

