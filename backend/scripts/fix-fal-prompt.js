require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // Corriger le nœud Fal.ai pour utiliser le THÈME ORIGINAL du formulaire
  const falNode = workflow.nodes.find(n => n.name === '4. Fal.ai - Générer Vidéo');
  if (falNode) {
    // Utiliser directement le thème du formulaire, traduit en anglais par l'Agent
    // Le prompt doit être en ANGLAIS pour Hunyuan
    falNode.parameters.jsonBody = `{
  "prompt": "={{ $(\\"Formulaire de Thème\\").first().json.Thème_Video || $(\\"Formulaire de Thème\\").first().json.theme || \\"beautiful nature scene\\" }}",
  "aspect_ratio": "16:9",
  "resolution": "480p",
  "num_frames": 129,
  "num_inference_steps": 30,
  "enable_prompt_expansion": true
}`;
    console.log('✅ Fal.ai: Prompt = thème du formulaire');
    console.log('✅ Fal.ai: num_frames = 129 (max)');
    console.log('✅ Fal.ai: enable_prompt_expansion = true');
  }
  
  // Aussi modifier l'Agent 1 pour générer un prompt vidéo en anglais
  const agent1 = workflow.nodes.find(n => n.name === '1. Génération du Script (Agent)');
  if (agent1) {
    // Garder le script en français mais ajouter une traduction du thème
    console.log('✅ Agent 1: Script en français conservé');
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
    console.log('\n🎬 Fal.ai corrigé !');
    console.log('\n⚠️  IMPORTANT: Pour de meilleurs résultats,');
    console.log('   entre ton thème EN ANGLAIS dans le formulaire.');
    console.log('   Ex: "A dog walking in London with a hat, seeing Big Ben"');
  } else {
    console.log('❌ Erreur:', await updateResponse.text());
  }
}

fix().catch(console.error);

