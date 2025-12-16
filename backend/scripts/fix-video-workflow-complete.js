/**
 * Correction complète du workflow Production Vidéo
 * - Agents en français
 * - Script plus long (5+ secondes de vidéo)
 * - Meilleure configuration TTS
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const N8N_URL = process.env.N8N_URL || 'https://n8n.globalsaas.eu';
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'Xb6hbe8zHzQhH6Uk';

async function fixWorkflow() {
  console.log('='.repeat(60));
  console.log('🎬 Correction complète du workflow Production Vidéo');
  console.log('='.repeat(60));
  
  const response = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // 1. Corriger l'Agent 1 - Génération du Script (en français, plus long)
  const agent1 = workflow.nodes.find(n => n.name === '1. Génération du Script (Agent)');
  if (agent1) {
    agent1.parameters.text = `Tu dois générer un script de narration EN FRANÇAIS sur le thème suivant : {{ $json.Thème_Video || $json.theme || $json.Theme || "l'intelligence artificielle" }}.

IMPORTANT :
- Le script doit être EN FRANÇAIS uniquement
- Le script doit faire MINIMUM 100 mots pour une vidéo d'au moins 30 secondes
- Structure : Introduction captivante, 2-3 points clés, conclusion mémorable
- Style : Dynamique, engageant, informatif
- Retourne UNIQUEMENT le texte de narration, sans indication de scène ni commentaire

Génère maintenant le script de narration en français :`;

    agent1.parameters.options = {
      systemMessage: "Tu es un expert en création de contenu vidéo francophone. Tu génères des scripts de narration captivants et informatifs EN FRANÇAIS. Tu retournes UNIQUEMENT le texte de la narration, sans aucune indication technique.",
      maxIterations: 10
    };
    console.log('\n✅ Agent 1 (Script) - Corrigé pour français + minimum 100 mots');
  }
  
  // 2. Corriger l'Agent 2 - Découpage Visuel (en français)
  const agent2 = workflow.nodes.find(n => n.name === '2. Découpage Visuel (Agent)');
  if (agent2) {
    agent2.parameters.text = `Prends le script suivant et génère des descriptions visuelles pour les images.

Script à traiter :
{{ $json.output }}

Instructions :
- Génère 3 à 5 descriptions d'images en anglais (pour DALL-E)
- Chaque description doit être concise et visuelle
- Format de sortie OBLIGATOIRE : un tableau JSON

Exemple de format attendu :
[{"prompt": "modern office with computers and natural light"}, {"prompt": "person working on laptop with coffee"}]

Génère maintenant le tableau JSON des prompts visuels :`;

    agent2.parameters.options = {
      systemMessage: "Tu es un expert en direction artistique vidéo. Tu génères des prompts visuels concis en anglais pour la génération d'images. Tu retournes UNIQUEMENT un tableau JSON valide.",
      maxIterations: 10
    };
    console.log('✅ Agent 2 (Visuel) - Corrigé');
  }
  
  // 3. Corriger le nœud TTS pour utiliser une voix et le français
  const ttsNode = workflow.nodes.find(n => n.name === '3. Synthèse Vocale TTS via API');
  if (ttsNode) {
    // S'assurer que le body JSON utilise le bon champ et la bonne voix
    ttsNode.parameters.jsonBody = JSON.stringify({
      model: "tts-1",
      input: "={{ $json.output }}",
      voice: "onyx",  // Voix plus grave et naturelle
      response_format: "mp3",
      speed: 0.9  // Légèrement plus lent pour être plus clair
    });
    console.log('✅ TTS - Voix "onyx" + vitesse 0.9');
  }
  
  // 4. Vérifier la commande FFmpeg (durée minimale de 60 secondes pour le fond)
  const ffmpegNode = workflow.nodes.find(n => n.name === '5b. FFmpeg Montage');
  if (ffmpegNode) {
    // Augmenter la durée du fond noir à 120 secondes pour être sûr
    const newCommand = `=AUDIO="{{ $json.fileName }}"; OUTPUT="/tmp/output_{{ $now.toMillis() }}.mp4"; ffmpeg -y -f lavfi -i color=c=black:s=1920x1080:d=120 -i "$AUDIO" -c:v libx264 -preset ultrafast -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "$OUTPUT" && echo "$OUTPUT"`;
    ffmpegNode.parameters.command = newCommand;
    console.log('✅ FFmpeg - Durée fond noir = 120s');
  }
  
  // Mettre à jour le workflow
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
    console.log('✅ WORKFLOW CORRIGÉ !');
    console.log('='.repeat(60));
    console.log('\nAméliorations :');
    console.log('  • Scripts générés en FRANÇAIS');
    console.log('  • Minimum 100 mots pour ~30 secondes de vidéo');
    console.log('  • Voix TTS "onyx" (plus naturelle)');
    console.log('  • Vitesse TTS 0.9 (plus claire)');
    console.log('\n🚀 Relancez le workflow !');
  } else {
    const err = await updateResponse.text();
    console.log('\n❌ Erreur:', err);
  }
}

fixWorkflow();

