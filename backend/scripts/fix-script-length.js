require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // Trouver l'Agent qui génère le script
  const agentNode = workflow.nodes.find(n => n.name === '1. Génération du Script (Agent)');
  
  if (agentNode) {
    // Nouveau prompt demandant un script plus long (150-200 mots = ~1 minute)
    agentNode.parameters.text = `RÉPONDS UNIQUEMENT EN FRANÇAIS.

Génère un script de narration DÉTAILLÉ en français sur ce thème : {{ $json.Thème_Video || $json.theme || "la technologie" }}

Le script DOIT OBLIGATOIREMENT :
- Être en FRANÇAIS (pas d'anglais)
- Faire MINIMUM 150 mots et MAXIMUM 200 mots (C'EST CRUCIAL pour avoir une vidéo d'au moins 1 minute)
- Avoir une introduction accrocheuse
- Développer 2-3 points clés avec des détails
- Avoir une conclusion mémorable
- Être captivant et informatif
- Ne contenir QUE le texte à lire (pas d'indications scéniques)

IMPORTANT : Si le script fait moins de 150 mots, la vidéo sera trop courte !

Écris le script maintenant EN FRANÇAIS :`;
    
    console.log('✅ Prompt Agent mis à jour (150-200 mots)');
  } else {
    console.log('❌ Agent non trouvé');
    return;
  }
  
  // Optionnel: réduire la vitesse TTS pour allonger l'audio
  const ttsNode = workflow.nodes.find(n => n.name === '3. Synthèse Vocale TTS via API');
  if (ttsNode && ttsNode.parameters.jsonBody) {
    // Réduire la vitesse à 0.85 pour un débit plus lent
    ttsNode.parameters.jsonBody = ttsNode.parameters.jsonBody.replace('"speed":0.9', '"speed":0.85');
    console.log('✅ TTS vitesse réduite à 0.85');
  }
  
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
  
  console.log(updateResponse.ok ? '\n🎬 Workflow mis à jour ! La vidéo devrait maintenant durer ~1 minute' : '❌ Erreur: ' + await updateResponse.text());
}

fix().catch(console.error);

