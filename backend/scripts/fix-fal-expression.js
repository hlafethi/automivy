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
    // Le jsonBody doit être une expression n8n complète avec = au début
    // Les expressions {{ }} sont évaluées par n8n
    const jsonBody = `={"prompt": "{{ $('Formulaire de Thème').first().json.Thème_Video || $('Formulaire de Thème').first().json.theme || 'beautiful nature landscape' }}", "aspect_ratio": "16:9", "resolution": "480p", "num_frames": 121, "num_inference_steps": 28, "enable_prompt_expansion": true}`;
    
    falNode.parameters.jsonBody = jsonBody;
    console.log('✅ jsonBody avec expression n8n');
    console.log('Aperçu:', jsonBody.substring(0, 100) + '...');
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

