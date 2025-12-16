require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // 1. Modifier l'Agent 2 pour générer un terme de recherche Pexels
  const agent2 = workflow.nodes.find(n => n.name === '2. Découpage Visuel (Agent)');
  if (agent2) {
    agent2.parameters.text = `Analyse le script suivant et génère des termes de recherche pour trouver des vidéos sur Pexels.

Script à analyser :
{{ $json.output }}

Instructions IMPORTANTES :
1. Identifie les éléments visuels principaux du script (lieux, animaux, objets, actions)
2. Génère UN terme de recherche en ANGLAIS, simple et efficace pour Pexels
3. Le terme doit être COURT (1-3 mots max) et GÉNÉRIQUE pour avoir des résultats
4. Exemples de bons termes: "dog walking", "london city", "cat eating", "big ben"

Format de sortie OBLIGATOIRE (JSON) :
{"searchTerm": "mot-clé en anglais", "prompts": [{"prompt": "description 1"}, {"prompt": "description 2"}]}

Génère maintenant le JSON :`;
    console.log('✅ Agent 2 mis à jour pour générer un searchTerm');
  }
  
  // 2. Modifier la recherche Pexels pour utiliser le searchTerm
  const pexelsNode = workflow.nodes.find(n => n.name === '4. Pexels Video');
  if (pexelsNode) {
    // Extraire le searchTerm du JSON généré par l'Agent 2
    // Si pas de searchTerm, utiliser le thème du formulaire traduit
    pexelsNode.parameters.url = '=https://api.pexels.com/videos/search?query={{ encodeURIComponent((JSON.parse($json.output || "{}")).searchTerm || $("Formulaire de Thème").first().json.Thème_Video?.split(" ").slice(0,2).join(" ") || "nature") }}&per_page=5&orientation=landscape';
    console.log('✅ Pexels: utilise searchTerm ou thème du formulaire');
  }
  
  // 3. Améliorer la sélection de vidéo (prendre une vidéo plus longue)
  const downloadNode = workflow.nodes.find(n => n.name === '4b. Télécharger Vidéo Pexels');
  if (downloadNode) {
    // Prendre la vidéo la plus longue parmi les résultats, en qualité SD/HD
    downloadNode.parameters.url = '={{ (() => { const videos = $json.videos || []; const best = videos.sort((a,b) => (b.duration || 0) - (a.duration || 0))[0]; if (!best) return ""; const file = best.video_files?.find(f => f.quality === "hd") || best.video_files?.find(f => f.quality === "sd") || best.video_files?.[0]; return file?.link || ""; })() }}';
    console.log('✅ Téléchargement: sélectionne la vidéo la plus longue');
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
  
  console.log(updateResponse.ok ? '\n🎬 Recherche Pexels corrigée !' : '❌ Erreur: ' + await updateResponse.text());
}

fix().catch(console.error);

