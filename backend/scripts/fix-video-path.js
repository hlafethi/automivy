require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // Trouver le nœud "5a. Combiner Chemins"
  const combineNode = workflow.nodes.find(n => n.name === '5a. Combiner Chemins');
  if (combineNode) {
    // Corriger le code pour récupérer les chemins correctement
    combineNode.parameters.jsCode = `// Récupère les items du merge (audio et vidéo combinée)
const items = $input.all();
let audioPath = '';
let videoPath = '';

for (const item of items) {
  // Cherche le fichier audio (.mp3)
  const fileName = item.json.fileName || '';
  if (fileName.endsWith('.mp3')) {
    audioPath = fileName;
  }
  // Cherche la vidéo combinée (output de FFmpeg Combiner via stdout)
  if (item.json.stdout) {
    videoPath = item.json.stdout.trim();
  }
  // Ou cherche dans outputPath
  if (item.json.outputPath) {
    videoPath = item.json.outputPath;
  }
}

console.log('Audio:', audioPath);
console.log('Video:', videoPath);

const outputPath = '/tmp/final_' + Date.now() + '.mp4';

return [{
  json: {
    audioPath,
    videoPath,
    outputPath
  }
}];`;
    console.log('✅ 5a. Combiner Chemins corrigé');
  }
  
  // Vérifier les connexions du Merge
  // Le Merge doit recevoir :
  // - Input 0 : Audio (de 5a. Écrire Audio)
  // - Input 1 : Vidéo (de 4h. Lire Vidéo Combinée)
  
  // Vérifier que 4h envoie bien au Merge
  const node4h = workflow.nodes.find(n => n.name === '4h. Lire Vidéo Combinée');
  if (node4h) {
    // Vérifier la connexion
    console.log('✅ 4h. Lire Vidéo Combinée trouvé');
  }
  
  // S'assurer que le Merge reçoit la vidéo via la sortie de 4g (FFmpeg Combiner)
  // car 4h lit le fichier mais la sortie de 4g contient le chemin
  
  // Modifier la connexion : 4g -> Merge (au lieu de 4h -> Merge)
  // Car on a besoin du chemin (stdout) pas du binaire
  workflow.connections['4g. FFmpeg Combiner'] = {
    main: [[
      { node: '4h. Lire Vidéo Combinée', type: 'main', index: 0 },
      { node: '5. Merge Audio+Vidéo', type: 'main', index: 1 }
    ]]
  };
  console.log('✅ 4g connecté au Merge (pour le chemin vidéo)');
  
  // Supprimer l'ancienne connexion 4h -> Merge
  if (workflow.connections['4h. Lire Vidéo Combinée']) {
    workflow.connections['4h. Lire Vidéo Combinée'] = {
      main: [[{ node: '5c. Lire Vidéo', type: 'main', index: 0 }]]
    };
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
  
  console.log(updateResponse.ok ? '\n✅ Workflow corrigé !' : '❌ Erreur: ' + await updateResponse.text());
}

fix().catch(console.error);

