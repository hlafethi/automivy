require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  // Nettoyer les connexions invalides
  console.log('🔧 Nettoyage des connexions...');
  
  // Supprimer la connexion vers l'ancien "4. Pexels Video"
  if (workflow.connections['2. Découpage Visuel (Agent)']) {
    const outputs = workflow.connections['2. Découpage Visuel (Agent)'].main[0];
    // Garder seulement les connexions vers des nœuds existants
    const validOutputs = outputs.filter(conn => {
      const nodeExists = workflow.nodes.some(n => n.name === conn.node);
      if (!nodeExists) {
        console.log('❌ Suppression connexion invalide vers:', conn.node);
      }
      return nodeExists;
    });
    workflow.connections['2. Découpage Visuel (Agent)'].main[0] = validOutputs;
  }
  
  // S'assurer que Agent 2 se connecte correctement
  // Agent 2 → TTS (audio) et Agent 2 → Fal.ai (vidéo)
  workflow.connections['2. Découpage Visuel (Agent)'] = {
    main: [[
      { node: '3. Synthèse Vocale TTS via API', type: 'main', index: 0 },
      { node: '4. Fal.ai - Générer Vidéo', type: 'main', index: 0 }
    ]]
  };
  console.log('✅ Agent 2 → TTS + Fal.ai');
  
  // Vérifier que tous les nœuds ont les bons paramètres
  workflow.nodes.forEach(node => {
    // S'assurer que disabled est défini
    if (node.disabled === undefined) {
      node.disabled = false;
    }
  });
  console.log('✅ Propriété disabled ajoutée à tous les nœuds');
  
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
  
  console.log(updateResponse.ok ? '\n✅ Workflow réparé !' : '❌ Erreur: ' + await updateResponse.text());
}

fix().catch(console.error);

