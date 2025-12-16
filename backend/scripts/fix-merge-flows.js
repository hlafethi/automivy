/**
 * Ajouter un nœud Merge pour synchroniser audio + vidéo avant FFmpeg
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const N8N_URL = process.env.N8N_URL || 'https://n8n.globalsaas.eu';
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'Xb6hbe8zHzQhH6Uk';

async function fixWorkflow() {
  console.log('🔗 Ajout du nœud Merge pour synchroniser audio + vidéo...\n');
  
  const response = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // Trouver les positions
  const node5a = workflow.nodes.find(n => n.name === '5a. Écrire Audio');
  const node4c = workflow.nodes.find(n => n.name === '4c. Écrire Vidéo');
  const nodeFfmpeg = workflow.nodes.find(n => n.name === '5b. FFmpeg Montage');
  
  // Position pour le nœud Merge (entre 5a/4c et FFmpeg)
  const mergePosition = [
    nodeFfmpeg ? nodeFfmpeg.position[0] - 150 : 1000,
    nodeFfmpeg ? nodeFfmpeg.position[1] : 250
  ];
  
  // Créer le nœud Merge
  const mergeNode = {
    id: `merge_${Date.now()}`,
    name: '5. Merge Audio+Vidéo',
    type: 'n8n-nodes-base.merge',
    typeVersion: 3,
    position: mergePosition,
    parameters: {
      mode: 'combine',
      combinationMode: 'mergeByPosition',
      options: {}
    }
  };
  
  // Ajouter le nœud Merge
  workflow.nodes.push(mergeNode);
  console.log('✅ Nœud Merge ajouté');
  
  // Mettre à jour les connexions
  // 5a (Audio) → Merge (input 0)
  workflow.connections['5a. Écrire Audio'] = {
    main: [[{ node: '5. Merge Audio+Vidéo', type: 'main', index: 0 }]]
  };
  
  // 4c (Vidéo) → Merge (input 1)
  workflow.connections['4c. Écrire Vidéo'] = {
    main: [[{ node: '5. Merge Audio+Vidéo', type: 'main', index: 1 }]]
  };
  
  // Merge → FFmpeg
  workflow.connections['5. Merge Audio+Vidéo'] = {
    main: [[{ node: '5b. FFmpeg Montage', type: 'main', index: 0 }]]
  };
  
  // Mettre à jour la commande FFmpeg pour accéder aux deux fichiers
  if (nodeFfmpeg) {
    // Après le merge, on a accès aux deux items
    // Item 0 = audio (de 5a), Item 1 = vidéo (de 4c)
    nodeFfmpeg.parameters.command = `=AUDIO="{{ $json.fileName }}"; VIDEO="{{ $('4c. Écrire Vidéo').item.json.fileName }}"; OUTPUT="/tmp/output_{{ $now.toMillis() }}.mp4"; ffmpeg -y -stream_loop -1 -i "$VIDEO" -i "$AUDIO" -c:v libx264 -preset ultrafast -c:a aac -b:a 192k -shortest -map 0:v:0 -map 1:a:0 "$OUTPUT" && echo "$OUTPUT"`;
    console.log('✅ FFmpeg mis à jour');
  }
  
  console.log('✅ Connexions mises à jour');
  
  // Mettre à jour
  const updateResponse = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
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
    console.log('\n✅ Workflow corrigé !');
    console.log('\n📋 Nouveau flux :');
    console.log('   TTS → 5a Audio ──┐');
    console.log('                    ├→ 5. Merge → FFmpeg → ...');
    console.log('   Pexels → 4b → 4c ┘');
  } else {
    console.log('❌ Erreur:', await updateResponse.text());
  }
}

fixWorkflow();

