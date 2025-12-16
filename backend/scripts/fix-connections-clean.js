/**
 * Nettoyer le workflow : supprimer Calculatrice + corriger connexions
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const N8N_URL = process.env.N8N_URL || 'https://n8n.globalsaas.eu';
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'Xb6hbe8zHzQhH6Uk';

async function fixWorkflow() {
  console.log('🧹 Nettoyage du workflow...\n');
  
  const response = await fetch(`${N8N_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  console.log('Nœuds avant:', workflow.nodes.length);
  
  // 1. Supprimer l'Outil Calculatrice
  workflow.nodes = workflow.nodes.filter(n => !n.name.includes('Calculatrice'));
  console.log('✅ Calculatrice supprimée');
  
  // 2. Supprimer les connexions de la Calculatrice
  delete workflow.connections['Outil Calculatrice'];
  
  // Retirer la calculatrice des connexions des agents
  for (const [nodeName, conn] of Object.entries(workflow.connections)) {
    if (conn.ai_tool) {
      conn.ai_tool = conn.ai_tool.map(arr => 
        arr.filter(c => !c.node.includes('Calculatrice'))
      );
    }
  }
  console.log('✅ Connexions Calculatrice supprimées');
  
  // 3. Corriger les connexions du flux Pexels
  // Agent 2 → TTS (3) + Pexels (4)
  workflow.connections['2. Découpage Visuel (Agent)'] = {
    main: [[
      { node: '3. Synthèse Vocale TTS via API', type: 'main', index: 0 },
      { node: '4. Pexels Video', type: 'main', index: 0 }
    ]]
  };
  
  // Pexels (4) → Télécharger (4b) → Écrire (4c)
  workflow.connections['4. Pexels Video'] = {
    main: [[{ node: '4b. Télécharger Vidéo Pexels', type: 'main', index: 0 }]]
  };
  workflow.connections['4b. Télécharger Vidéo Pexels'] = {
    main: [[{ node: '4c. Écrire Vidéo', type: 'main', index: 0 }]]
  };
  
  // TTS (3) → Écrire Audio (5a)
  workflow.connections['3. Synthèse Vocale TTS via API'] = {
    main: [[{ node: '5a. Écrire Audio', type: 'main', index: 0 }]]
  };
  
  // Écrire Audio (5a) → FFmpeg (5b)
  workflow.connections['5a. Écrire Audio'] = {
    main: [[{ node: '5b. FFmpeg Montage', type: 'main', index: 0 }]]
  };
  
  // Écrire Vidéo (4c) → FFmpeg (5b) aussi (merge)
  // Non, FFmpeg doit attendre les deux. On va utiliser une approche différente.
  // FFmpeg va chercher la vidéo avec $('4c. Écrire Vidéo')
  
  // 4c ne se connecte pas directement, FFmpeg accède via expression
  workflow.connections['4c. Écrire Vidéo'] = { main: [[]] };
  
  // FFmpeg (5b) → Lire Vidéo (5c)
  workflow.connections['5b. FFmpeg Montage'] = {
    main: [[{ node: '5c. Lire Vidéo', type: 'main', index: 0 }]]
  };
  
  // Lire Vidéo (5c) → Upload (6)
  workflow.connections['5c. Lire Vidéo'] = {
    main: [[{ node: '6. Upload Google Drive', type: 'main', index: 0 }]]
  };
  
  // Upload (6) → Email (7)
  workflow.connections['6. Upload Google Drive'] = {
    main: [[{ node: '7. Notification Email', type: 'main', index: 0 }]]
  };
  
  console.log('✅ Connexions corrigées');
  console.log('Nœuds après:', workflow.nodes.length);
  
  // Mettre à jour
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
    console.log('\n✅ Workflow nettoyé !');
    console.log('\n📋 Flux final :');
    console.log('   Formulaire → Agent 1 → Agent 2');
    console.log('                           ↓');
    console.log('              TTS (3) + Pexels (4)');
    console.log('                ↓           ↓');
    console.log('            5a Audio    4b→4c Vidéo');
    console.log('                ↓           ↓');
    console.log('              5b. FFmpeg (combine)');
    console.log('                    ↓');
    console.log('              5c → Upload → Email');
  } else {
    console.log('❌ Erreur:', await updateResponse.text());
  }
}

fixWorkflow();

