/**
 * Script pour réparer le workflow de Production Vidéo
 * Ajoute les nœuds FFmpeg manquants entre TTS/Médias et Upload
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const N8N_URL = process.env.N8N_URL || 'https://n8n.globalsaas.eu';
const N8N_API_KEY = process.env.N8N_API_KEY;

async function repairVideoWorkflow() {
  console.log('='.repeat(60));
  console.log('🔧 Réparation du workflow Production Vidéo');
  console.log('='.repeat(60));
  
  if (!N8N_API_KEY) {
    console.error('❌ N8N_API_KEY non définie');
    process.exit(1);
  }
  
  try {
    // Récupérer les workflows
    console.log('\n📋 Récupération des workflows...');
    const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    
    const result = await response.json();
    const workflows = result.data || result.workflows || result;
    
    // Trouver le workflow "Production Vidéo IA - user@heleam.com"
    const videoWorkflow = workflows.find(w => 
      w.name.includes('Production Vidéo IA') && w.name.includes('user@heleam.com')
    );
    
    if (!videoWorkflow) {
      console.error('❌ Workflow "Production Vidéo IA - user@heleam.com" non trouvé');
      return;
    }
    
    console.log(`\n🔍 Workflow trouvé: "${videoWorkflow.name}" (ID: ${videoWorkflow.id})`);
    
    // Récupérer le workflow complet
    const fullResponse = await fetch(`${N8N_URL}/api/v1/workflows/${videoWorkflow.id}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    const fullWorkflow = await fullResponse.json();
    
    console.log(`\n📊 État actuel:`);
    console.log(`   - Nombre de nœuds: ${fullWorkflow.nodes?.length || 0}`);
    fullWorkflow.nodes?.forEach(n => {
      console.log(`     • ${n.name} (${n.type})`);
    });
    
    // Analyser les nœuds existants
    const existingNodes = fullWorkflow.nodes || [];
    const existingConnections = fullWorkflow.connections || {};
    
    // Trouver les nœuds clés
    const ttsNode = existingNodes.find(n => n.name?.includes('Synthèse Vocale') || n.name?.includes('TTS'));
    const mediaNode = existingNodes.find(n => n.name?.includes('Récupération') && n.name?.includes('Média'));
    const uploadNode = existingNodes.find(n => n.name?.includes('Upload') || n.name?.includes('Google Drive'));
    const emailNode = existingNodes.find(n => n.name?.includes('Email') || n.name?.includes('Notification'));
    
    console.log(`\n📍 Nœuds identifiés:`);
    console.log(`   - TTS: ${ttsNode?.name || 'NON TROUVÉ'}`);
    console.log(`   - Médias: ${mediaNode?.name || 'NON TROUVÉ'}`);
    console.log(`   - Upload: ${uploadNode?.name || 'NON TROUVÉ'}`);
    console.log(`   - Email: ${emailNode?.name || 'NON TROUVÉ'}`);
    
    // Vérifier si les nœuds FFmpeg existent déjà
    const hasFFmpegNodes = existingNodes.some(n => 
      n.name?.includes('FFmpeg') || n.name?.includes('Écrire Audio') || n.name?.includes('Montage')
    );
    
    if (hasFFmpegNodes) {
      console.log('\n⚠️  Des nœuds FFmpeg existent déjà. Vérification...');
    }
    
    // Calculer les positions pour les nouveaux nœuds
    let baseX = 1000;
    let baseY = 200;
    
    if (ttsNode?.position) {
      baseX = ttsNode.position[0] + 200;
      baseY = ttsNode.position[1] + 150;
    }
    
    // Créer les nœuds FFmpeg s'ils n'existent pas
    const newNodes = [...existingNodes.filter(n => 
      !n.name?.includes('Écrire Audio') && 
      !n.name?.includes('FFmpeg') && 
      !n.name?.includes('Lire Vidéo') &&
      n.name !== '5a. Écrire Audio' &&
      n.name !== '5b. FFmpeg Montage' &&
      n.name !== '5c. Lire Vidéo'
    )];
    
    // Nœud 5a: Écrire le fichier audio
    const writeAudioNode = {
      id: `write_audio_${Date.now()}`,
      name: '5a. Écrire Audio',
      type: 'n8n-nodes-base.writeBinaryFile',
      typeVersion: 1,
      position: [baseX, baseY],
      parameters: {
        fileName: '=/tmp/audio_{{ $now.toMillis() }}.mp3',
        dataPropertyName: 'data'
      }
    };
    
    // Nœud 5b: Exécuter FFmpeg
    const ffmpegNode = {
      id: `ffmpeg_${Date.now()}`,
      name: '5b. FFmpeg Montage',
      type: 'n8n-nodes-base.executeCommand',
      typeVersion: 1,
      position: [baseX + 200, baseY],
      parameters: {
        command: 'AUDIO_FILE="{{ $json.fileName }}"; OUTPUT_FILE="/tmp/output_{{ $now.toMillis() }}.mp4"; ffmpeg -y -f lavfi -i color=c=black:s=1920x1080:d=60 -i "$AUDIO_FILE" -c:v libx264 -preset ultrafast -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "$OUTPUT_FILE" 2>/dev/null && echo "$OUTPUT_FILE"'
      }
    };
    
    // Nœud 5c: Lire la vidéo créée
    const readVideoNode = {
      id: `read_video_${Date.now()}`,
      name: '5c. Lire Vidéo',
      type: 'n8n-nodes-base.readBinaryFile',
      typeVersion: 1,
      position: [baseX + 400, baseY],
      parameters: {
        filePath: '={{ $json.stdout.trim() }}',
        dataPropertyName: 'video'
      }
    };
    
    newNodes.push(writeAudioNode, ffmpegNode, readVideoNode);
    
    // Reconstruire les connexions
    const newConnections = {};
    
    // Copier les connexions existantes sauf celles liées aux nœuds supprimés
    for (const [sourceName, connections] of Object.entries(existingConnections)) {
      if (sourceName.includes('Écrire Audio') || 
          sourceName.includes('FFmpeg') || 
          sourceName.includes('Lire Vidéo')) {
        continue;
      }
      
      // Filtrer les connexions vers des nœuds supprimés
      const filteredMain = [];
      if (connections.main) {
        for (const outputArray of connections.main) {
          const filteredOutput = outputArray.filter(conn => 
            !conn.node?.includes('Écrire Audio') && 
            !conn.node?.includes('FFmpeg') && 
            !conn.node?.includes('Lire Vidéo')
          );
          filteredMain.push(filteredOutput);
        }
      }
      
      if (filteredMain.some(arr => arr.length > 0)) {
        newConnections[sourceName] = { main: filteredMain };
      }
    }
    
    // Connexion: TTS → 5a. Écrire Audio
    if (ttsNode) {
      newConnections[ttsNode.name] = {
        main: [[{ node: '5a. Écrire Audio', type: 'main', index: 0 }]]
      };
    }
    
    // Connexions internes FFmpeg
    newConnections['5a. Écrire Audio'] = {
      main: [[{ node: '5b. FFmpeg Montage', type: 'main', index: 0 }]]
    };
    newConnections['5b. FFmpeg Montage'] = {
      main: [[{ node: '5c. Lire Vidéo', type: 'main', index: 0 }]]
    };
    
    // Connexion: 5c. Lire Vidéo → Upload Google Drive
    if (uploadNode) {
      newConnections['5c. Lire Vidéo'] = {
        main: [[{ node: uploadNode.name, type: 'main', index: 0 }]]
      };
    }
    
    // Connexion: Upload → Email
    if (uploadNode && emailNode) {
      newConnections[uploadNode.name] = {
        main: [[{ node: emailNode.name, type: 'main', index: 0 }]]
      };
    }
    
    console.log(`\n📝 Nouvelle structure:`);
    console.log(`   - ${newNodes.length} nœuds`);
    newNodes.forEach(n => console.log(`     • ${n.name}`));
    
    console.log(`\n🔗 Nouvelles connexions:`);
    for (const [src, conn] of Object.entries(newConnections)) {
      const targets = conn.main?.flat().map(c => c.node).join(', ') || 'aucune';
      console.log(`   ${src} → ${targets}`);
    }
    
    // Mettre à jour le workflow
    console.log('\n📤 Mise à jour du workflow...');
    
    const updateResponse = await fetch(`${N8N_URL}/api/v1/workflows/${videoWorkflow.id}`, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: fullWorkflow.name,
        nodes: newNodes,
        connections: newConnections,
        settings: fullWorkflow.settings,
        staticData: fullWorkflow.staticData
      })
    });
    
    if (updateResponse.ok) {
      console.log('\n✅ Workflow réparé avec succès!');
      console.log('\n📋 Structure finale:');
      console.log('   Formulaire → Agent Script → Agent Visuel → TTS + Médias');
      console.log('                                              ↓');
      console.log('   5a. Écrire Audio → 5b. FFmpeg → 5c. Lire Vidéo');
      console.log('                                              ↓');
      console.log('                                   Upload Google Drive → Email');
    } else {
      const errorText = await updateResponse.text();
      console.error(`\n❌ Erreur: ${errorText}`);
    }
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

repairVideoWorkflow();

