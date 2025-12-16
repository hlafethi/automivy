/**
 * Correction finale du workflow Production Vidéo
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const N8N_URL = process.env.N8N_URL || 'https://n8n.globalsaas.eu';
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'Xb6hbe8zHzQhH6Uk';

async function fixWorkflow() {
  console.log('='.repeat(60));
  console.log('🔧 Correction finale du workflow Production Vidéo');
  console.log('='.repeat(60));
  
  try {
    console.log('\n📋 Récupération du workflow actuel...');
    
    const response = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    const workflow = await response.json();
    
    console.log(`\n📊 Workflow: ${workflow.name}`);
    console.log(`   ${workflow.nodes.length} nœuds`);
    
    // Corriger le nœud 5a - Écrire Audio
    const writeNode = workflow.nodes.find(n => n.name === '5a. Écrire Audio');
    if (writeNode) {
      writeNode.parameters = {
        fileName: '=/tmp/audio_{{ $now.toMillis() }}.mp3',
        dataPropertyName: 'data',
        options: {}
      };
      console.log('\n✅ 5a. Écrire Audio - corrigé');
      console.log('   dataPropertyName: "data"');
    }
    
    // Corriger le nœud 5b - FFmpeg
    // IMPORTANT: La commande doit commencer par = pour activer les expressions
    const ffmpegNode = workflow.nodes.find(n => n.name === '5b. FFmpeg Montage');
    if (ffmpegNode) {
      // Commande FFmpeg avec expressions n8n
      const ffmpegCommand = '=ffmpeg -y -f lavfi -i color=c=black:s=1920x1080:d=60 -i "{{ $json.fileName }}" -c:v libx264 -preset ultrafast -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "/tmp/output_{{ $now.toMillis() }}.mp4" 2>/dev/null && echo "/tmp/output_{{ $now.toMillis() }}.mp4"';
      
      ffmpegNode.parameters = {
        command: ffmpegCommand
      };
      console.log('\n✅ 5b. FFmpeg Montage - corrigé');
      console.log('   Commande avec expressions n8n (préfixe =)');
    }
    
    // Corriger le nœud 5c - Lire Vidéo
    const readNode = workflow.nodes.find(n => n.name === '5c. Lire Vidéo');
    if (readNode) {
      readNode.parameters = {
        filePath: '={{ $json.stdout.trim() }}',
        dataPropertyName: 'video',
        options: {}
      };
      console.log('\n✅ 5c. Lire Vidéo - corrigé');
    }
    
    // Vérifier les connexions - s'assurer que TTS → 5a
    const connections = workflow.connections;
    
    // Vérifier que 3. TTS → 5a. Écrire Audio
    const ttsConnections = connections['3. Synthèse Vocale TTS via API'];
    if (ttsConnections) {
      console.log('\n📍 Connexion TTS → 5a:', JSON.stringify(ttsConnections.main[0]));
    }
    
    // S'assurer que Médias ne se connecte PAS à 5a
    const mediaConnections = connections['4. Récupération & Téléchargement Médias (Sub-WF)'];
    if (mediaConnections && mediaConnections.main && mediaConnections.main[0]) {
      const connectsTo5a = mediaConnections.main[0].some(c => c.node === '5a. Écrire Audio');
      if (connectsTo5a) {
        console.log('\n⚠️  Suppression connexion Médias → 5a (incorrecte)');
        mediaConnections.main[0] = mediaConnections.main[0].filter(c => c.node !== '5a. Écrire Audio');
      }
    }
    
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
      console.log('\n✅ Workflow mis à jour avec succès!');
      console.log('\n📋 Flux corrigé:');
      console.log('   TTS → 5a. Écrire Audio → 5b. FFmpeg → 5c. Lire Vidéo → Upload');
    } else {
      const err = await updateResponse.text();
      console.log('\n❌ Erreur:', err);
    }
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  }
}

fixWorkflow();

