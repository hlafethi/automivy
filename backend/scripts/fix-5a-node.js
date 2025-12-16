/**
 * Correction spécifique du nœud 5a. Écrire Audio
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const N8N_URL = process.env.N8N_URL || 'https://n8n.globalsaas.eu';
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'Xb6hbe8zHzQhH6Uk';

async function fixNode5a() {
  console.log('🔧 Correction du nœud 5a. Écrire Audio\n');
  
  const response = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // Trouver le nœud 5a
  const node5a = workflow.nodes.find(n => n.name === '5a. Écrire Audio');
  
  if (!node5a) {
    console.log('❌ Nœud 5a non trouvé!');
    return;
  }
  
  console.log('Paramètres actuels:', JSON.stringify(node5a.parameters, null, 2));
  
  // Dans n8n WriteBinaryFile v1, le dataPropertyName peut être dans différents endroits
  // Essayons la configuration correcte selon la doc n8n
  node5a.parameters = {
    fileName: '=/tmp/audio_{{ $now.toMillis() }}.mp3',
    dataPropertyName: 'data'
  };
  
  // Aussi, vérifions la typeVersion
  console.log('\nType actuel:', node5a.type, 'v' + node5a.typeVersion);
  
  // Mettre à jour
  console.log('\nNouvelle configuration:', JSON.stringify(node5a.parameters, null, 2));
  
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
    console.log('\n✅ Mise à jour réussie!');
    
    // Vérifier que ça a bien été sauvé
    const verifyResponse = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    const verifyWf = await verifyResponse.json();
    const verifyNode = verifyWf.nodes.find(n => n.name === '5a. Écrire Audio');
    console.log('\nVérification - paramètres sauvegardés:', JSON.stringify(verifyNode.parameters, null, 2));
  } else {
    const err = await updateResponse.text();
    console.log('\n❌ Erreur:', err);
  }
}

fixNode5a();

