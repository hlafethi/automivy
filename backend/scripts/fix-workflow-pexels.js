/**
 * Configuration du workflow avec Pexels (vidéos gratuites) + français
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const N8N_URL = process.env.N8N_URL || 'https://n8n.globalsaas.eu';
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'Xb6hbe8zHzQhH6Uk';
const PEXELS_API_KEY = 'lcd8RPwfMtCIlH14fTFaszqSLrRnn7YtQv95Rc5g3K91P9UuayZihOsX';

async function fixWorkflow() {
  console.log('='.repeat(60));
  console.log('🎬 Configuration Pexels + Français');
  console.log('='.repeat(60));
  
  const response = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // 1. FORCER le français dans l'Agent 1
  const agent1 = workflow.nodes.find(n => n.name === '1. Génération du Script (Agent)');
  if (agent1) {
    agent1.parameters.text = `RÉPONDS UNIQUEMENT EN FRANÇAIS.

Génère un script de narration en français sur ce thème : {{ $json.Thème_Video || $json.theme || "la technologie" }}

Le script DOIT :
- Être en FRANÇAIS (pas d'anglais)
- Faire entre 50 et 80 mots
- Être captivant et informatif
- Ne contenir QUE le texte à lire (pas d'indications)

Écris le script maintenant EN FRANÇAIS :`;

    agent1.parameters.options = {
      systemMessage: "Tu es un rédacteur français. Tu réponds TOUJOURS et UNIQUEMENT en français. Tu génères des scripts de narration courts et captivants.",
      maxIterations: 5
    };
    console.log('\n✅ Agent 1 - FORCÉ en français (50-80 mots)');
  }
  
  // 2. Modifier le nœud 4 pour utiliser Pexels (vidéos gratuites)
  const mediaNode = workflow.nodes.find(n => n.name.includes('Récupération') && n.name.includes('Média'));
  if (mediaNode) {
    mediaNode.name = '4. Pexels Video';
    mediaNode.parameters = {
      method: 'GET',
      url: '=https://api.pexels.com/videos/search?query={{ encodeURIComponent($json.output.substring(0, 50)) }}&per_page=1&orientation=landscape',
      authentication: 'none',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          { name: 'Authorization', value: PEXELS_API_KEY }
        ]
      },
      options: {}
    };
    console.log('✅ Nœud 4 - Pexels API configuré');
  }
  
  // 3. Trouver les positions pour les nouveaux nœuds
  const node4Position = mediaNode?.position || [900, 300];
  
  // 4. Ajouter un nœud pour télécharger la vidéo Pexels
  const downloadVideoNode = {
    id: `download_pexels_${Date.now()}`,
    name: '4b. Télécharger Vidéo Pexels',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [node4Position[0] + 200, node4Position[1]],
    parameters: {
      method: 'GET',
      url: '={{ $json.videos[0]?.video_files?.find(f => f.quality === "sd" || f.quality === "hd")?.link || $json.videos[0]?.video_files[0]?.link }}',
      authentication: 'none',
      options: {
        response: {
          response: {
            responseFormat: 'file'
          }
        }
      }
    }
  };
  
  // 5. Ajouter un nœud pour écrire la vidéo sur le disque
  const writeVideoNode = {
    id: `write_pexels_${Date.now()}`,
    name: '4c. Écrire Vidéo',
    type: 'n8n-nodes-base.writeBinaryFile',
    typeVersion: 1,
    position: [node4Position[0] + 400, node4Position[1]],
    parameters: {
      fileName: '=/tmp/pexels_{{ $now.toMillis() }}.mp4',
      dataPropertyName: 'data'
    }
  };
  
  // Ajouter les nouveaux nœuds
  workflow.nodes.push(downloadVideoNode);
  workflow.nodes.push(writeVideoNode);
  console.log('✅ Nœuds téléchargement vidéo ajoutés');
  
  // 6. Modifier FFmpeg pour utiliser la vidéo Pexels comme fond
  const ffmpegNode = workflow.nodes.find(n => n.name === '5b. FFmpeg Montage');
  if (ffmpegNode) {
    // Utiliser la vidéo Pexels + audio TTS
    ffmpegNode.parameters.command = `=VIDEO="{{ $('4c. Écrire Vidéo').item.json.fileName }}"; AUDIO="{{ $json.fileName }}"; OUTPUT="/tmp/output_{{ $now.toMillis() }}.mp4"; ffmpeg -y -i "$VIDEO" -i "$AUDIO" -c:v libx264 -preset ultrafast -c:a aac -b:a 192k -shortest -map 0:v:0 -map 1:a:0 "$OUTPUT" && echo "$OUTPUT"`;
    console.log('✅ FFmpeg - Utilise vidéo Pexels + audio TTS');
  }
  
  // 7. Mettre à jour les connexions
  // Pexels (4) → Télécharger (4b) → Écrire (4c)
  workflow.connections['4. Pexels Video'] = {
    main: [[{ node: '4b. Télécharger Vidéo Pexels', type: 'main', index: 0 }]]
  };
  workflow.connections['4b. Télécharger Vidéo Pexels'] = {
    main: [[{ node: '4c. Écrire Vidéo', type: 'main', index: 0 }]]
  };
  // Ne pas connecter 4c à 5a (ils tournent en parallèle)
  workflow.connections['4c. Écrire Vidéo'] = {
    main: [[]]
  };
  
  // Supprimer l'ancienne connexion du nœud média
  delete workflow.connections['4. Récupération & Téléchargement Médias (Sub-WF)'];
  
  console.log('✅ Connexions mises à jour');
  
  // 8. Mettre à jour le workflow
  console.log('\n📤 Mise à jour du workflow...');
  
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
    console.log('\n' + '='.repeat(60));
    console.log('✅ WORKFLOW CONFIGURÉ AVEC PEXELS !');
    console.log('='.repeat(60));
    console.log('\n🎬 Nouveau flux :');
    console.log('   Formulaire → Agent (FR) → TTS + Pexels Video');
    console.log('                              ↓');
    console.log('   Audio + Vidéo Pexels → FFmpeg → Upload → Email');
    console.log('\n🚀 Relancez le workflow !');
  } else {
    const err = await updateResponse.text();
    console.log('\n❌ Erreur:', err);
  }
}

fixWorkflow();

