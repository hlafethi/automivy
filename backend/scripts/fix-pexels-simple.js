require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // Simplifier le nœud Pexels - utiliser le thème directement
  const pexelsNode = workflow.nodes.find(n => n.name === '4. Pexels Video');
  if (pexelsNode) {
    // Extraire les 2-3 premiers mots du thème comme terme de recherche
    // Fallback sur "nature city" si le thème est vide
    pexelsNode.parameters.url = '=https://api.pexels.com/videos/search?query={{ encodeURIComponent($("Formulaire de Thème").first().json.Thème_Video?.split(" ").slice(0,3).join(" ") || $("Formulaire de Thème").first().json.theme?.split(" ").slice(0,3).join(" ") || "nature city") }}&per_page=5&orientation=landscape';
    console.log('✅ Pexels: utilise directement le thème du formulaire');
  }
  
  // Simplifier aussi l'Agent 2 - pas besoin de JSON complexe
  const agent2 = workflow.nodes.find(n => n.name === '2. Découpage Visuel (Agent)');
  if (agent2) {
    agent2.parameters.text = `Tu es un assistant créatif. Analyse le script suivant et génère des descriptions visuelles.

Script :
{{ $json.output }}

Génère 3 descriptions d'images courtes en ANGLAIS (pour la recherche de vidéos stock).
Chaque description doit être de 2-4 mots maximum.

Exemple de format :
- dog walking street
- city skyline sunset
- people talking cafe

Tes descriptions :`;
    console.log('✅ Agent 2 simplifié');
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
  
  console.log(updateResponse.ok ? '\n🎬 Pexels simplifié !' : '❌ Erreur: ' + await updateResponse.text());
}

fix().catch(console.error);

