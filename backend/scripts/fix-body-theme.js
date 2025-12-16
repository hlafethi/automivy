require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // 1. Corriger l'Agent 1 - Script de narration
  const agent1 = workflow.nodes.find(n => n.name === '1. Génération du Script (Agent)');
  if (agent1) {
    agent1.parameters.text = `RÉPONDS UNIQUEMENT EN FRANÇAIS.

Génère un script de narration DÉTAILLÉ en français sur ce thème : {{ $json.body.theme || $json.body.Thème_Video || $json.theme || $json.Thème_Video || "la nature" }}

Le script DOIT OBLIGATOIREMENT :
- Être en FRANÇAIS (pas d'anglais)
- Faire MINIMUM 150 mots et MAXIMUM 200 mots
- Avoir une introduction accrocheuse
- Développer 2-3 points clés avec des détails
- Avoir une conclusion mémorable
- Ne contenir QUE le texte à lire (pas d'indications scéniques)

Écris le script maintenant EN FRANÇAIS :`;
    console.log('✅ Agent 1: utilise body.theme');
  }
  
  // 2. Corriger Fal.ai - Génération vidéo
  const falNode = workflow.nodes.find(n => n.name === '4. Fal.ai - Générer Vidéo');
  if (falNode) {
    // Utiliser body.theme pour le prompt vidéo
    const jsonBody = `={"prompt": "{{ $('Formulaire de Thème').first().json.body.theme || $('Formulaire de Thème').first().json.body.Thème_Video || $('Formulaire de Thème').first().json.theme || 'beautiful nature landscape' }}", "aspect_ratio": "16:9", "resolution": "480p", "num_frames": 121, "num_inference_steps": 28, "enable_prompt_expansion": true}`;
    falNode.parameters.jsonBody = jsonBody;
    console.log('✅ Fal.ai: utilise body.theme');
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
  
  console.log(updateResponse.ok ? '\n🎬 Corrigé ! Le thème sera maintenant lu correctement.' : '❌ Erreur: ' + await updateResponse.text());
}

fix().catch(console.error);

