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
    // MAX: 129 frames = ~5.4 secondes à 24fps
    // 30 inference steps pour meilleure qualité
    const jsonBody = `={"prompt": "{{ $('Formulaire de Thème').first().json.body.theme || 'beautiful nature landscape' }}", "aspect_ratio": "16:9", "resolution": "480p", "num_frames": 129, "num_inference_steps": 30, "enable_prompt_expansion": true}`;
    
    falNode.parameters.jsonBody = jsonBody;
    console.log('✅ Fal.ai configuré:');
    console.log('   - num_frames: 129 (MAXIMUM)');
    console.log('   - num_inference_steps: 30');
    console.log('   - Durée attendue: ~5 secondes');
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
  
  console.log(updateResponse.ok ? '\n✅ OK!' : '❌ Erreur: ' + await updateResponse.text());
}

fix().catch(console.error);

