require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // Trouver les nœuds
  const mergeNode = workflow.nodes.find(n => n.name === '5. Merge Audio+Vidéo');
  const ffmpegNode = workflow.nodes.find(n => n.name === '5b. FFmpeg Montage');
  
  if (!mergeNode) {
    console.log('Nœud Merge non trouvé');
    return;
  }
  if (!ffmpegNode) {
    console.log('Nœud FFmpeg non trouvé');
    return;
  }
  
  console.log('Nœuds trouvés: Merge et FFmpeg');
  
  // Supprimer l'ancien nœud Combiner s'il existe
  const existingCombine = workflow.nodes.findIndex(n => n.name === '5a. Combiner Chemins');
  if (existingCombine >= 0) {
    workflow.nodes.splice(existingCombine, 1);
    console.log('Ancien nœud Combine supprimé');
  }
  
  // Créer un nœud Code pour fusionner les chemins
  const combineNode = {
    id: 'combine_paths_' + Date.now(),
    name: '5a. Combiner Chemins',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [mergeNode.position[0] + 200, mergeNode.position[1]],
    parameters: {
      jsCode: `// Récupère les items du merge (audio et vidéo)
const items = $input.all();
let audioPath = '';
let videoPath = '';

for (const item of items) {
  const fileName = item.json.fileName || '';
  // Cherche le fichier audio (.mp3)
  if (fileName.endsWith('.mp3')) {
    audioPath = fileName;
  }
  // Cherche le fichier vidéo (.mp4)
  if (fileName.endsWith('.mp4')) {
    videoPath = fileName;
  }
}

console.log('Audio:', audioPath);
console.log('Video:', videoPath);

// Retourne un seul item avec les deux chemins
return [{
  json: {
    audioPath,
    videoPath,
    outputPath: '/tmp/final_' + Date.now() + '.mp4'
  }
}];`
    }
  };
  
  // Ajouter le nœud Combine
  workflow.nodes.push(combineNode);
  console.log('Nœud Combine créé');
  
  // Mettre à jour FFmpeg pour utiliser les nouveaux chemins
  ffmpegNode.parameters.command = '=ffmpeg -y -stream_loop -1 -i "{{ $json.videoPath }}" -i "{{ $json.audioPath }}" -c:v libx264 -preset ultrafast -c:a aac -b:a 192k -shortest -map 0:v:0 -map 1:a:0 "{{ $json.outputPath }}" && echo "{{ $json.outputPath }}"';
  
  // Décaler FFmpeg
  ffmpegNode.position = [combineNode.position[0] + 280, combineNode.position[1]];
  console.log('FFmpeg mis à jour');
  
  // Mettre à jour les connexions
  workflow.connections['5. Merge Audio+Vidéo'] = {
    main: [[{ node: '5a. Combiner Chemins', type: 'main', index: 0 }]]
  };
  workflow.connections['5a. Combiner Chemins'] = {
    main: [[{ node: '5b. FFmpeg Montage', type: 'main', index: 0 }]]
  };
  console.log('Connexions mises à jour');
  
  // Sauvegarder
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
    console.log('\n✅ Workflow mis à jour avec succès!');
  } else {
    console.log('\n❌ Erreur:', await updateResponse.text());
  }
}

fix().catch(console.error);

