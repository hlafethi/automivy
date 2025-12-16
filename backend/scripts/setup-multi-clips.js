require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const FAL_KEY = '13777423-431b-4e41-933e-48c5bca1e82b:04054536c644cbe87612f3a58a84aee0';

async function setup() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // Trouver les positions des nœuds existants
  const falNode = workflow.nodes.find(n => n.name === '4. Fal.ai - Générer Vidéo');
  const baseX = falNode ? falNode.position[0] : 800;
  const baseY = falNode ? falNode.position[1] : 400;
  
  // Supprimer les anciens nœuds Fal.ai (4, 4a, 4b, 4c, 4d)
  const nodesToRemove = ['4. Fal.ai - Générer Vidéo', '4a. Attendre 300s', '4b. Fal.ai - Récupérer Résultat', '4c. Télécharger Vidéo IA', '4d. Écrire Vidéo IA'];
  workflow.nodes = workflow.nodes.filter(n => !nodesToRemove.includes(n.name));
  
  // Supprimer les connexions des anciens nœuds
  nodesToRemove.forEach(name => delete workflow.connections[name]);
  
  console.log('🗑️ Anciens nœuds Fal.ai supprimés');
  
  // === CRÉER LE NOUVEAU SYSTÈME MULTI-CLIPS ===
  
  // Nœud Code pour préparer 3 requêtes avec variations du prompt
  const prepareNode = {
    id: 'prepare_clips_' + Date.now(),
    name: '4. Préparer 3 Clips',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [baseX, baseY],
    parameters: {
      jsCode: `// Génère 3 variations du prompt pour 3 clips différents
const theme = $('Formulaire de Thème').first().json.body.theme || 'beautiful nature';

const clips = [
  { clipNumber: 1, prompt: theme + ", opening scene, establishing shot" },
  { clipNumber: 2, prompt: theme + ", middle scene, action moment" },
  { clipNumber: 3, prompt: theme + ", closing scene, final shot" }
];

return clips.map(c => ({ json: c }));`
    }
  };
  workflow.nodes.push(prepareNode);
  console.log('✅ Nœud 4. Préparer 3 Clips');
  
  // Nœud HTTP pour soumettre à Fal.ai (va s'exécuter 3 fois)
  const falSubmitNode = {
    id: 'fal_submit_' + Date.now(),
    name: '4a. Fal.ai Soumettre',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [baseX + 250, baseY],
    parameters: {
      method: 'POST',
      url: 'https://queue.fal.run/fal-ai/minimax/video-01',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Authorization', value: `Key ${FAL_KEY}` },
          { name: 'Content-Type', value: 'application/json' }
        ]
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={"prompt": "{{ $json.prompt }}", "prompt_optimizer": true}',
      options: {}
    }
  };
  workflow.nodes.push(falSubmitNode);
  console.log('✅ Nœud 4a. Fal.ai Soumettre');
  
  // Nœud Wait
  const waitNode = {
    id: 'wait_clips_' + Date.now(),
    name: '4b. Attendre 180s',
    type: 'n8n-nodes-base.wait',
    typeVersion: 1.1,
    position: [baseX + 500, baseY],
    parameters: {
      amount: 180,
      unit: 'seconds'
    }
  };
  workflow.nodes.push(waitNode);
  console.log('✅ Nœud 4b. Attendre 180s');
  
  // Nœud HTTP pour récupérer le résultat
  const falGetNode = {
    id: 'fal_get_' + Date.now(),
    name: '4c. Fal.ai Récupérer',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [baseX + 750, baseY],
    parameters: {
      method: 'GET',
      url: '={{ $json.response_url }}',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Authorization', value: `Key ${FAL_KEY}` }
        ]
      },
      options: {}
    }
  };
  workflow.nodes.push(falGetNode);
  console.log('✅ Nœud 4c. Fal.ai Récupérer');
  
  // Nœud HTTP pour télécharger les vidéos
  const downloadNode = {
    id: 'download_clips_' + Date.now(),
    name: '4d. Télécharger Clips',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [baseX + 1000, baseY],
    parameters: {
      url: '={{ $json.video?.url }}',
      options: {
        response: {
          response: {
            responseFormat: 'file'
          }
        }
      }
    }
  };
  workflow.nodes.push(downloadNode);
  console.log('✅ Nœud 4d. Télécharger Clips');
  
  // Nœud Code pour collecter et préparer FFmpeg
  const collectNode = {
    id: 'collect_clips_' + Date.now(),
    name: '4e. Collecter Clips',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [baseX + 1250, baseY],
    parameters: {
      jsCode: `// Collecte tous les clips téléchargés
const items = $input.all();
const clips = [];

for (let i = 0; i < items.length; i++) {
  const binaryData = items[i].binary?.data;
  if (binaryData) {
    clips.push({
      index: i,
      fileName: binaryData.fileName || 'clip_' + i + '.mp4'
    });
  }
}

// Retourne un seul item avec la liste des clips
return [{
  json: {
    clipCount: clips.length,
    clips: clips
  },
  binary: items.reduce((acc, item, idx) => {
    if (item.binary?.data) {
      acc['clip' + idx] = item.binary.data;
    }
    return acc;
  }, {})
}];`
    }
  };
  workflow.nodes.push(collectNode);
  console.log('✅ Nœud 4e. Collecter Clips');
  
  // Nœud Write pour écrire les clips
  const writeClipsNode = {
    id: 'write_clips_' + Date.now(),
    name: '4f. Écrire Clips',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [baseX + 1500, baseY],
    parameters: {
      jsCode: `// Écrit les clips et prépare la commande FFmpeg
const fs = require('fs');
const item = $input.first();
const timestamp = Date.now();
const clipPaths = [];

// Écrire chaque clip
for (let i = 0; i < 3; i++) {
  const binaryKey = 'clip' + i;
  if (item.binary && item.binary[binaryKey]) {
    const clipPath = '/tmp/clip_' + timestamp + '_' + i + '.mp4';
    const buffer = Buffer.from(item.binary[binaryKey].data, 'base64');
    fs.writeFileSync(clipPath, buffer);
    clipPaths.push(clipPath);
  }
}

// Créer le fichier liste pour FFmpeg
const listPath = '/tmp/clips_list_' + timestamp + '.txt';
const listContent = clipPaths.map(p => "file '" + p + "'").join('\\n');
fs.writeFileSync(listPath, listContent);

const outputPath = '/tmp/combined_' + timestamp + '.mp4';

return [{
  json: {
    listPath,
    outputPath,
    clipPaths,
    clipCount: clipPaths.length
  }
}];`
    }
  };
  workflow.nodes.push(writeClipsNode);
  console.log('✅ Nœud 4f. Écrire Clips');
  
  // Nœud Execute Command pour combiner avec FFmpeg
  const ffmpegCombineNode = {
    id: 'ffmpeg_combine_' + Date.now(),
    name: '4g. FFmpeg Combiner',
    type: 'n8n-nodes-base.executeCommand',
    typeVersion: 1,
    position: [baseX + 1750, baseY],
    parameters: {
      command: '=ffmpeg -y -f concat -safe 0 -i "{{ $json.listPath }}" -c copy "{{ $json.outputPath }}" && echo "{{ $json.outputPath }}"'
    }
  };
  workflow.nodes.push(ffmpegCombineNode);
  console.log('✅ Nœud 4g. FFmpeg Combiner');
  
  // Nœud Read pour lire la vidéo combinée
  const readCombinedNode = {
    id: 'read_combined_' + Date.now(),
    name: '4h. Lire Vidéo Combinée',
    type: 'n8n-nodes-base.readBinaryFile',
    typeVersion: 1,
    position: [baseX + 2000, baseY],
    parameters: {
      filePath: '={{ $json.stdout.trim() }}',
      dataPropertyName: 'video'
    }
  };
  workflow.nodes.push(readCombinedNode);
  console.log('✅ Nœud 4h. Lire Vidéo Combinée');
  
  // === CONNEXIONS ===
  
  // Agent 2 -> Préparer 3 Clips
  workflow.connections['2. Découpage Visuel (Agent)'] = {
    main: [[
      { node: '3. Synthèse Vocale TTS via API', type: 'main', index: 0 },
      { node: '4. Préparer 3 Clips', type: 'main', index: 0 }
    ]]
  };
  
  // Chaîne de génération des clips
  workflow.connections['4. Préparer 3 Clips'] = {
    main: [[{ node: '4a. Fal.ai Soumettre', type: 'main', index: 0 }]]
  };
  workflow.connections['4a. Fal.ai Soumettre'] = {
    main: [[{ node: '4b. Attendre 180s', type: 'main', index: 0 }]]
  };
  workflow.connections['4b. Attendre 180s'] = {
    main: [[{ node: '4c. Fal.ai Récupérer', type: 'main', index: 0 }]]
  };
  workflow.connections['4c. Fal.ai Récupérer'] = {
    main: [[{ node: '4d. Télécharger Clips', type: 'main', index: 0 }]]
  };
  workflow.connections['4d. Télécharger Clips'] = {
    main: [[{ node: '4e. Collecter Clips', type: 'main', index: 0 }]]
  };
  workflow.connections['4e. Collecter Clips'] = {
    main: [[{ node: '4f. Écrire Clips', type: 'main', index: 0 }]]
  };
  workflow.connections['4f. Écrire Clips'] = {
    main: [[{ node: '4g. FFmpeg Combiner', type: 'main', index: 0 }]]
  };
  workflow.connections['4g. FFmpeg Combiner'] = {
    main: [[{ node: '4h. Lire Vidéo Combinée', type: 'main', index: 0 }]]
  };
  
  // Vidéo combinée -> Merge avec Audio
  workflow.connections['4h. Lire Vidéo Combinée'] = {
    main: [[{ node: '5. Merge Audio+Vidéo', type: 'main', index: 1 }]]
  };
  
  console.log('✅ Connexions configurées');
  
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
    console.log('\n🎬 SYSTÈME MULTI-CLIPS CONFIGURÉ !');
    console.log('');
    console.log('Flux: Thème → 3 prompts → 3 vidéos Fal.ai → Combiner FFmpeg');
    console.log('Durée attendue: ~6-9 secondes (3 clips de 2-3 sec)');
    console.log('');
    console.log('⚠️ Note: Le workflow prendra ~9-10 minutes (3 x 3 min par clip)');
  } else {
    console.log('❌ Erreur:', await updateResponse.text());
  }
}

setup().catch(console.error);

