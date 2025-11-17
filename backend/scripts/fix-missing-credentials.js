/**
 * Script pour diagnostiquer et corriger les workflows avec des credentials manquants
 * Usage: node backend/scripts/fix-missing-credentials.js [workflowId]
 */

const fetch = require('node-fetch');
const db = require('../database');
const config = require('../config');
const { createImapCredential } = require('../services/credentialInjector');

const n8nUrl = config.n8n.url;
const n8nApiKey = config.n8n.apiKey;

async function checkCredentialExists(credentialId) {
  try {
    const response = await fetch(`${n8nUrl}/api/v1/credentials/${credentialId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function getWorkflowFromN8n(workflowId) {
  const response = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': n8nApiKey
    }
  });
  
  if (!response.ok) {
    throw new Error(`Erreur récupération workflow: ${response.status}`);
  }
  
  return await response.json();
}

async function updateWorkflowInN8n(workflowId, workflow) {
  const response = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': n8nApiKey
    },
    body: JSON.stringify({
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {}
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur mise à jour workflow: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

async function fixWorkflowCredentials(workflowId) {
  console.log(`\n🔍 [FixCredentials] Analyse du workflow ${workflowId}...`);
  
  // 1. Récupérer le workflow depuis n8n
  const workflow = await getWorkflowFromN8n(workflowId);
  console.log(`✅ [FixCredentials] Workflow récupéré: ${workflow.name}`);
  
  // 2. Récupérer les credentials stockés en BDD
  const userWorkflow = await db.query(
    'SELECT * FROM user_workflows WHERE n8n_workflow_id = $1',
    [workflowId]
  );
  
  if (userWorkflow.rows.length === 0) {
    console.error(`❌ [FixCredentials] Aucun workflow utilisateur trouvé pour ${workflowId}`);
    return;
  }
  
  const userWorkflowId = userWorkflow.rows[0].id;
  const userId = userWorkflow.rows[0].user_id;
  
  console.log(`✅ [FixCredentials] Workflow utilisateur trouvé: ${userWorkflowId} (user: ${userId})`);
  
  // 3. Récupérer les credentials stockés
  const storedCredentials = await db.getWorkflowCredentials(userWorkflowId);
  console.log(`✅ [FixCredentials] ${storedCredentials.length} credential(s) stocké(s) en BDD`);
  
  // 4. Vérifier les credentials IMAP dans le workflow
  const imapNodes = workflow.nodes?.filter(n => 
    n.type === 'n8n-nodes-imap.imap' || n.type === 'n8n-nodes-base.emailReadImap'
  );
  
  if (!imapNodes || imapNodes.length === 0) {
    console.log(`⚠️ [FixCredentials] Aucun nœud IMAP trouvé dans le workflow`);
    return;
  }
  
  console.log(`✅ [FixCredentials] ${imapNodes.length} nœud(s) IMAP trouvé(s)`);
  
  let needsUpdate = false;
  const missingCredentials = [];
  
  for (const node of imapNodes) {
    const imapCred = node.credentials?.imapApi || node.credentials?.imap;
    
    if (!imapCred || !imapCred.id) {
      console.error(`❌ [FixCredentials] ${node.name}: Aucun credential IMAP assigné`);
      missingCredentials.push({ node, type: 'missing' });
      needsUpdate = true;
      continue;
    }
    
    const exists = await checkCredentialExists(imapCred.id);
    
    if (!exists) {
      console.error(`❌ [FixCredentials] ${node.name}: Credential IMAP ${imapCred.id} n'existe pas dans n8n`);
      missingCredentials.push({ node, credential: imapCred, type: 'not_found' });
      needsUpdate = true;
    } else {
      console.log(`✅ [FixCredentials] ${node.name}: Credential IMAP ${imapCred.id} existe`);
    }
  }
  
  if (!needsUpdate) {
    console.log(`✅ [FixCredentials] Tous les credentials sont valides`);
    return;
  }
  
  // 5. Recréer les credentials manquants
  console.log(`\n🔧 [FixCredentials] Recréation des credentials manquants...`);
  
  // Récupérer les informations utilisateur depuis la BDD
  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (user.rows.length === 0) {
    console.error(`❌ [FixCredentials] Utilisateur ${userId} non trouvé`);
    return;
  }
  
  const userEmail = user.rows[0].email;
  console.log(`✅ [FixCredentials] Utilisateur trouvé: ${userEmail}`);
  
  // Pour chaque credential manquant, on doit recréer
  // Mais on n'a pas les informations IMAP (password, server, etc.)
  // Il faudrait les demander à l'utilisateur ou les stocker quelque part
  
  console.log(`\n⚠️ [FixCredentials] ATTENTION: Pour recréer les credentials, il faut:`);
  console.log(`  1. Les informations IMAP de l'utilisateur (email, password, server)`);
  console.log(`  2. Redéployer le workflow avec ces informations`);
  console.log(`\n💡 Solution: Redéployer le workflow depuis l'interface utilisateur`);
  
  // TODO: Si on a les infos IMAP stockées quelque part, on peut les recréer automatiquement
}

async function main() {
  const workflowId = process.argv[2];
  
  if (!workflowId) {
    console.error('Usage: node fix-missing-credentials.js <workflowId>');
    console.error('Exemple: node fix-missing-credentials.js c1bd6bd6-8c210030');
    process.exit(1);
  }
  
  try {
    await fixWorkflowCredentials(workflowId);
  } catch (error) {
    console.error('❌ [FixCredentials] Erreur:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixWorkflowCredentials };

