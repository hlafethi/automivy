/**
 * Correction de la commande FFmpeg
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const N8N_URL = process.env.N8N_URL || 'https://n8n.globalsaas.eu';
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'Xb6hbe8zHzQhH6Uk';

async function fixFFmpeg() {
  console.log('🔧 Correction de la commande FFmpeg\n');
  
  const response = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  const ffmpegNode = workflow.nodes.find(n => n.name === '5b. FFmpeg Montage');
  
  if (!ffmpegNode) {
    console.log('❌ Nœud FFmpeg non trouvé!');
    return;
  }
  
  console.log('Commande actuelle:', ffmpegNode.parameters?.command?.substring(0, 100) + '...');
  
  // Nouvelle commande FFmpeg - sans masquer les erreurs pour le debug
  // Utilise une variable shell pour le timestamp
  const newCommand = `=AUDIO="{{ $json.fileName }}"; OUTPUT="/tmp/output_{{ $now.toMillis() }}.mp4"; ffmpeg -y -f lavfi -i color=c=black:s=1920x1080:d=60 -i "$AUDIO" -c:v libx264 -preset ultrafast -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "$OUTPUT" && echo "$OUTPUT"`;
  
  ffmpegNode.parameters = {
    command: newCommand
  };
  
  console.log('\nNouvelle commande:', newCommand.substring(0, 100) + '...');
  
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
    console.log('\n✅ Commande FFmpeg mise à jour!');
  } else {
    const err = await updateResponse.text();
    console.log('\n❌ Erreur:', err);
  }
}

fixFFmpeg();

