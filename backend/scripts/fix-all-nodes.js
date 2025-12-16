require('dotenv').config({ path: '../../.env' });
const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

async function fix() {
  const response = await fetch(`${N8N_URL}/api/v1/workflows/Xb6hbe8zHzQhH6Uk`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  const workflow = await response.json();
  
  console.log('🔍 Analyse de tous les nœuds...\n');
  
  // Vérifier chaque nœud
  workflow.nodes.forEach((node, index) => {
    const issues = [];
    
    // Vérifier les propriétés obligatoires
    if (node.disabled === undefined) {
      node.disabled = false;
      issues.push('disabled manquant');
    }
    
    if (!node.id) {
      node.id = 'node_' + Date.now() + '_' + index;
      issues.push('id manquant');
    }
    
    if (!node.position || !Array.isArray(node.position)) {
      node.position = [100 + index * 200, 300];
      issues.push('position manquante');
    }
    
    if (!node.type) {
      issues.push('⚠️ TYPE MANQUANT');
    }
    
    if (!node.typeVersion) {
      // Définir des versions par défaut selon le type
      if (node.type === 'n8n-nodes-base.httpRequest') node.typeVersion = 4.2;
      else if (node.type === 'n8n-nodes-base.code') node.typeVersion = 2;
      else if (node.type === 'n8n-nodes-base.wait') node.typeVersion = 1.1;
      else if (node.type === 'n8n-nodes-base.merge') node.typeVersion = 3;
      else if (node.type === 'n8n-nodes-base.writeBinaryFile') node.typeVersion = 1;
      else if (node.type === 'n8n-nodes-base.readBinaryFile') node.typeVersion = 1;
      else if (node.type === 'n8n-nodes-base.executeCommand') node.typeVersion = 1;
      else node.typeVersion = 1;
      issues.push('typeVersion manquant');
    }
    
    if (!node.parameters) {
      node.parameters = {};
      issues.push('parameters manquant');
    }
    
    if (issues.length > 0) {
      console.log(`❌ ${node.name}: ${issues.join(', ')}`);
    } else {
      console.log(`✅ ${node.name}`);
    }
  });
  
  // Vérifier les connexions - supprimer celles qui pointent vers des nœuds inexistants
  console.log('\n🔗 Vérification des connexions...');
  const nodeNames = workflow.nodes.map(n => n.name);
  const invalidConnections = [];
  
  Object.keys(workflow.connections).forEach(sourceName => {
    if (!nodeNames.includes(sourceName)) {
      invalidConnections.push(sourceName);
      console.log(`❌ Connexion source invalide: ${sourceName}`);
    } else {
      const conn = workflow.connections[sourceName];
      if (conn.main) {
        conn.main.forEach((outputs, outputIndex) => {
          if (outputs) {
            const validOutputs = outputs.filter(output => {
              if (!nodeNames.includes(output.node)) {
                console.log(`❌ Connexion cible invalide: ${sourceName} -> ${output.node}`);
                return false;
              }
              return true;
            });
            conn.main[outputIndex] = validOutputs;
          }
        });
      }
    }
  });
  
  // Supprimer les connexions sources invalides
  invalidConnections.forEach(name => {
    delete workflow.connections[name];
  });
  
  console.log('\n💾 Sauvegarde...');
  
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
    console.log('\n✅ Workflow réparé !');
  } else {
    const error = await updateResponse.text();
    console.log('\n❌ Erreur:', error);
  }
}

fix().catch(console.error);

