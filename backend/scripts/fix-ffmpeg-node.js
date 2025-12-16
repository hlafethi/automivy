/**
 * Script pour corriger le nœud FFmpeg dans les workflows n8n
 * 
 * Utilise les nœuds natifs n8n:
 * - Write Binary File (pour écrire l'audio)
 * - Execute Command (pour exécuter FFmpeg)
 * - Read Binary File (pour lire la vidéo créée)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const N8N_URL = process.env.N8N_URL || 'https://n8n.globalsaas.eu';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function findAndFixFFmpegWorkflows() {
  console.log('='.repeat(60));
  console.log('🔧 Correction des nœuds FFmpeg dans les workflows n8n');
  console.log('='.repeat(60));
  
  if (!N8N_API_KEY) {
    console.error('❌ N8N_API_KEY non définie');
    process.exit(1);
  }
  
  try {
    // Récupérer tous les workflows
    console.log('\n📋 Récupération des workflows...');
    const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }
    
    const result = await response.json();
    const workflows = result.data || result.workflows || result;
    
    console.log(`📊 ${workflows.length} workflow(s) trouvé(s)`);
    
    let fixedCount = 0;
    
    for (const workflow of workflows) {
      // Récupérer le workflow complet
      const fullWorkflowResponse = await fetch(`${N8N_URL}/api/v1/workflows/${workflow.id}`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
      });
      
      if (!fullWorkflowResponse.ok) continue;
      
      const fullWorkflow = await fullWorkflowResponse.json();
      
      if (!fullWorkflow.nodes) continue;
      
      // Chercher les nœuds FFmpeg problématiques ou les nœuds "5a. Écrire Audio" mal configurés
      let needsUpdate = false;
      const updatedNodes = [];
      const newConnections = JSON.parse(JSON.stringify(fullWorkflow.connections || {}));
      
      // Trouver le nœud source (TTS) et le nœud FFmpeg
      let ttsNodeName = null;
      let ffmpegNodeIndex = -1;
      let ffmpegNodeName = null;
      let originalFFmpegOutputConnections = null;
      
      for (let i = 0; i < fullWorkflow.nodes.length; i++) {
        const node = fullWorkflow.nodes[i];
        
        // Identifier le nœud TTS (source audio)
        if (node.name?.toLowerCase().includes('tts') || 
            node.name?.toLowerCase().includes('synthèse') ||
            node.name?.toLowerCase().includes('vocale') ||
            node.name?.toLowerCase().includes('audio')) {
          if (node.type !== 'n8n-nodes-base.writeBinaryFile') {
            ttsNodeName = node.name;
          }
        }
        
        // Identifier le nœud FFmpeg problématique
        const isProblematicFFmpegNode = 
          (node.type === 'n8n-nodes-base.executeCommand' && 
           (node.parameters?.command?.includes('{{$file') || 
            node.name?.toLowerCase().includes('ffmpeg') ||
            node.name?.toLowerCase().includes('montage'))) ||
          (node.type === 'n8n-nodes-base.code' && 
           (node.parameters?.jsCode?.includes('child_process') ||
            node.parameters?.jsCode?.includes('execSync'))) ||
          // Aussi corriger si le nœud "5a. Écrire Audio" existe déjà mais est mal configuré
          (node.name === '5a. Écrire Audio');
        
        if (isProblematicFFmpegNode) {
          ffmpegNodeIndex = i;
          ffmpegNodeName = node.name;
          // Sauvegarder les connexions sortantes du nœud FFmpeg original
          if (newConnections[node.name]) {
            originalFFmpegOutputConnections = newConnections[node.name];
          }
        }
      }
      
      // Si pas de TTS trouvé, chercher le nœud qui se connecte au FFmpeg
      if (!ttsNodeName && ffmpegNodeName) {
        for (const [sourceName, connections] of Object.entries(newConnections)) {
          if (connections.main) {
            for (const outputArray of connections.main) {
              for (const conn of outputArray) {
                if (conn.node === ffmpegNodeName || conn.node === '5a. Écrire Audio') {
                  ttsNodeName = sourceName;
                  console.log(`   📍 Nœud source trouvé: "${ttsNodeName}"`);
                  break;
                }
              }
            }
          }
        }
      }
      
      if (ffmpegNodeIndex === -1) {
        // Pas de nœud FFmpeg problématique
        continue;
      }
      
      console.log(`\n🔍 Workflow "${workflow.name}"`);
      console.log(`   - Nœud source (TTS): "${ttsNodeName}"`);
      console.log(`   - Nœud FFmpeg: "${ffmpegNodeName}"`);
      
      needsUpdate = true;
      
      // Reconstruire la liste des nœuds
      for (let i = 0; i < fullWorkflow.nodes.length; i++) {
        const node = fullWorkflow.nodes[i];
        
        // Supprimer les anciens nœuds de correction (5a, 5b, 5c)
        if (node.name === '5a. Écrire Audio' || 
            node.name === '5b. FFmpeg Montage' || 
            node.name === '5c. Lire Vidéo') {
          continue; // Ne pas ajouter ces nœuds
        }
        
        // Si c'est le nœud FFmpeg original, le remplacer par la chaîne de 3 nœuds
        if (i === ffmpegNodeIndex) {
          const basePosition = node.position || [800, 300];
          
          // 1. Write Binary File - Écrire l'audio
          const writeAudioNode = {
            id: `write_audio_${Date.now()}`,
            name: '5a. Écrire Audio',
            type: 'n8n-nodes-base.writeBinaryFile',
            typeVersion: 1,
            position: [basePosition[0], basePosition[1]],
            parameters: {
              fileName: '=/tmp/audio_{{ $now.toMillis() }}.mp3',
              dataPropertyName: 'data'
            }
          };
          
          // 2. Execute Command - FFmpeg (créer une vidéo avec fond noir + audio)
          const ffmpegNode = {
            id: `ffmpeg_${Date.now()}`,
            name: '5b. FFmpeg Montage',
            type: 'n8n-nodes-base.executeCommand',
            typeVersion: 1,
            position: [basePosition[0] + 250, basePosition[1]],
            parameters: {
              command: 'ffmpeg -y -f lavfi -i color=c=black:s=1920x1080:d=60 -i "{{ $json.fileName }}" -c:v libx264 -preset ultrafast -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "/tmp/output_{{ $now.toMillis() }}.mp4" 2>&1 && echo "OUTPUT_FILE:/tmp/output_{{ $now.toMillis() }}.mp4"'
            }
          };
          
          // 3. Read Binary File - Lire la vidéo créée
          const readVideoNode = {
            id: `read_video_${Date.now()}`,
            name: '5c. Lire Vidéo',
            type: 'n8n-nodes-base.readBinaryFile',
            typeVersion: 1,
            position: [basePosition[0] + 500, basePosition[1]],
            parameters: {
              filePath: '={{ $json.stdout.split("OUTPUT_FILE:")[1]?.trim() || "/tmp/output.mp4" }}',
              dataPropertyName: 'video'
            }
          };
          
          updatedNodes.push(writeAudioNode, ffmpegNode, readVideoNode);
          
        } else {
          // Nettoyer et garder le nœud
          const allowedProperties = [
            'id', 'name', 'type', 'typeVersion', 'position', 'parameters', 
            'credentials', 'disabled', 'notes', 'notesInFlow', 'webhookId',
            'alwaysOutputData', 'continueOnFail', 'executeOnce', 'retryOnFail',
            'maxTries', 'waitBetweenTries', 'onError'
          ];
          
          const cleanedNode = {};
          for (const key of allowedProperties) {
            if (node[key] !== undefined) {
              cleanedNode[key] = node[key];
            }
          }
          updatedNodes.push(cleanedNode);
        }
      }
      
      // Mettre à jour les connexions
      // 1. Supprimer les anciennes connexions des nœuds FFmpeg
      delete newConnections[ffmpegNodeName];
      delete newConnections['5a. Écrire Audio'];
      delete newConnections['5b. FFmpeg Montage'];
      delete newConnections['5c. Lire Vidéo'];
      
      // 2. Rediriger les connexions du nœud source vers "5a. Écrire Audio"
      if (ttsNodeName && newConnections[ttsNodeName]) {
        // Remplacer les connexions vers le nœud FFmpeg par "5a. Écrire Audio"
        if (newConnections[ttsNodeName].main) {
          for (const outputArray of newConnections[ttsNodeName].main) {
            for (const conn of outputArray) {
              if (conn.node === ffmpegNodeName || conn.node === '5a. Écrire Audio') {
                conn.node = '5a. Écrire Audio';
              }
            }
          }
        }
      }
      
      // 3. Ajouter les connexions internes de la chaîne
      newConnections['5a. Écrire Audio'] = {
        main: [[{ node: '5b. FFmpeg Montage', type: 'main', index: 0 }]]
      };
      newConnections['5b. FFmpeg Montage'] = {
        main: [[{ node: '5c. Lire Vidéo', type: 'main', index: 0 }]]
      };
      
      // 4. Transférer les connexions sortantes vers "5c. Lire Vidéo"
      if (originalFFmpegOutputConnections) {
        newConnections['5c. Lire Vidéo'] = originalFFmpegOutputConnections;
      }
      
      console.log(`   📝 Mise à jour du workflow (${updatedNodes.length} nœuds)...`);
      console.log(`   📝 Connexions: ${ttsNodeName} → 5a → 5b → 5c`);
      
      const workflowUpdate = {
        name: fullWorkflow.name,
        nodes: updatedNodes,
        connections: newConnections,
        settings: fullWorkflow.settings,
        staticData: fullWorkflow.staticData
      };
      
      const updateResponse = await fetch(`${N8N_URL}/api/v1/workflows/${workflow.id}`, {
        method: 'PUT',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowUpdate)
      });
      
      if (updateResponse.ok) {
        console.log(`   ✅ Workflow mis à jour avec succès!`);
        fixedCount++;
      } else {
        const errorText = await updateResponse.text();
        console.log(`   ❌ Erreur lors de la mise à jour: ${errorText}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ ${fixedCount} workflow(s) corrigé(s)`);
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

findAndFixFFmpegWorkflows();
