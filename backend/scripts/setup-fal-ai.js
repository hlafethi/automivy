require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

const FAL_API_KEY = '13777423-431b-4e41-933e-48c5bca1e82b:04054536c644cbe87612f3a58a84aee0';

async function setupFalAI() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // Trouver les nœuds Pexels à remplacer
  const pexelsNode = workflow.nodes.find(n => n.name === '4. Pexels Video');
  const downloadNode = workflow.nodes.find(n => n.name === '4b. Télécharger Vidéo Pexels');
  const writeVideoNode = workflow.nodes.find(n => n.name === '4c. Écrire Vidéo');
  
  if (!pexelsNode) {
    console.log('❌ Nœud Pexels non trouvé');
    return;
  }
  
  // === NŒUD 4: Soumettre la requête à Fal.ai ===
  pexelsNode.name = '4. Fal.ai - Générer Vidéo';
  pexelsNode.parameters = {
    method: 'POST',
    url: 'https://queue.fal.run/fal-ai/hunyuan-video-v1.5/text-to-video',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'Authorization', value: `Key ${FAL_API_KEY}` },
        { name: 'Content-Type', value: 'application/json' }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `{
  "prompt": "={{ $json.output || $(\\"Formulaire de Thème\\").first().json.Thème_Video || \\"beautiful nature scene\\" }}",
  "aspect_ratio": "16:9",
  "resolution": "480p",
  "num_frames": 121,
  "num_inference_steps": 28
}`,
    options: {}
  };
  console.log('✅ Nœud 4: Fal.ai - Soumettre requête');
  
  // === NŒUD 4b: Attendre et récupérer le résultat ===
  if (downloadNode) {
    // Créer un nœud Wait avant
    const waitNode = {
      id: 'wait_fal_' + Date.now(),
      name: '4a. Attendre 60s',
      type: 'n8n-nodes-base.wait',
      typeVersion: 1.1,
      position: [pexelsNode.position[0] + 200, pexelsNode.position[1]],
      parameters: {
        amount: 60,
        unit: 'seconds'
      }
    };
    workflow.nodes.push(waitNode);
    console.log('✅ Nœud 4a: Wait 60 secondes');
    
    // Modifier 4b pour récupérer le résultat
    downloadNode.name = '4b. Fal.ai - Récupérer Résultat';
    downloadNode.position = [waitNode.position[0] + 200, waitNode.position[1]];
    downloadNode.parameters = {
      method: 'GET',
      url: '=https://queue.fal.run/fal-ai/hunyuan-video-v1.5/text-to-video/requests/{{ $("4. Fal.ai - Générer Vidéo").first().json.request_id }}',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Authorization', value: `Key ${FAL_API_KEY}` }
        ]
      },
      options: {}
    };
    console.log('✅ Nœud 4b: Récupérer résultat Fal.ai');
    
    // Ajouter un nœud pour télécharger la vidéo générée
    const downloadVideoNode = {
      id: 'download_video_' + Date.now(),
      name: '4c. Télécharger Vidéo IA',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [downloadNode.position[0] + 200, downloadNode.position[1]],
      parameters: {
        url: '={{ $json.video?.url || $json.result?.video?.url }}',
        options: {
          response: {
            response: {
              responseFormat: 'file'
            }
          }
        }
      }
    };
    
    // Supprimer l'ancien nœud 4c s'il existe et le remplacer
    const writeIdx = workflow.nodes.findIndex(n => n.name === '4c. Écrire Vidéo');
    if (writeIdx >= 0) {
      workflow.nodes.splice(writeIdx, 1);
    }
    workflow.nodes.push(downloadVideoNode);
    console.log('✅ Nœud 4c: Télécharger vidéo générée');
    
    // Nouveau nœud pour écrire la vidéo
    const writeNewVideoNode = {
      id: 'write_video_' + Date.now(),
      name: '4d. Écrire Vidéo IA',
      type: 'n8n-nodes-base.writeBinaryFile',
      typeVersion: 1,
      position: [downloadVideoNode.position[0] + 200, downloadVideoNode.position[1]],
      parameters: {
        fileName: '=/tmp/fal_video_{{ $now.toMillis() }}.mp4',
        options: {}
      }
    };
    workflow.nodes.push(writeNewVideoNode);
    console.log('✅ Nœud 4d: Écrire vidéo sur disque');
    
    // Mettre à jour les connexions
    workflow.connections['4. Fal.ai - Générer Vidéo'] = {
      main: [[{ node: '4a. Attendre 60s', type: 'main', index: 0 }]]
    };
    workflow.connections['4a. Attendre 60s'] = {
      main: [[{ node: '4b. Fal.ai - Récupérer Résultat', type: 'main', index: 0 }]]
    };
    workflow.connections['4b. Fal.ai - Récupérer Résultat'] = {
      main: [[{ node: '4c. Télécharger Vidéo IA', type: 'main', index: 0 }]]
    };
    workflow.connections['4c. Télécharger Vidéo IA'] = {
      main: [[{ node: '4d. Écrire Vidéo IA', type: 'main', index: 0 }]]
    };
    
    // Mettre à jour le Merge pour pointer vers le nouveau nœud
    workflow.connections['4d. Écrire Vidéo IA'] = {
      main: [[{ node: '5. Merge Audio+Vidéo', type: 'main', index: 1 }]]
    };
    
    // Supprimer les anciennes connexions Pexels
    delete workflow.connections['4. Pexels Video'];
    delete workflow.connections['4b. Télécharger Vidéo Pexels'];
    delete workflow.connections['4c. Écrire Vidéo'];
    
    console.log('✅ Connexions mises à jour');
  }
  
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
    console.log('\n🎬 Fal.ai Hunyuan Video intégré !');
    console.log('📝 La génération prendra ~60 secondes par vidéo');
  } else {
    console.log('❌ Erreur:', await updateResponse.text());
  }
}

setupFalAI().catch(console.error);

