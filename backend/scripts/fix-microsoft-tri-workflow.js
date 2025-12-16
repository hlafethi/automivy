/**
 * Script pour diagnostiquer et proposer des corrections pour le workflow Microsoft Tri
 * Usage: node backend/scripts/fix-microsoft-tri-workflow.js <n8nWorkflowId>
 */

const fetch = require('node-fetch');
const config = require('../config');

async function fixMicrosoftTriWorkflow(n8nWorkflowId) {
  console.log('🔧 Diagnostic et corrections pour le workflow Microsoft Tri:', n8nWorkflowId);
  console.log('');

  try {
    // 1. Récupérer le workflow depuis n8n
    console.log('1️⃣ Récupération du workflow depuis n8n...');
    const workflowResponse = await fetch(`${config.n8n.url}/api/v1/workflows/${n8nWorkflowId}`, {
      headers: { 'X-N8N-API-KEY': config.n8n.apiKey }
    });

    if (!workflowResponse.ok) {
      console.error(`❌ Erreur ${workflowResponse.status}: Impossible de récupérer le workflow`);
      return;
    }

    const workflow = await workflowResponse.json();
    console.log(`✅ Workflow récupéré: "${workflow.name}"`);
    console.log('');

    // 2. Trouver les nœuds problématiques
    console.log('2️⃣ Analyse des nœuds problématiques...');
    
    const createFolderNode = workflow.nodes?.find(n => 
      n.type === 'n8n-nodes-base.microsoftOutlook' && 
      n.parameters?.resource === 'folder' && 
      n.parameters?.operation === 'create'
    );
    
    const moveMessageNode = workflow.nodes?.find(n => 
      n.type === 'n8n-nodes-base.microsoftOutlook' && 
      n.parameters?.resource === 'message' && 
      n.parameters?.operation === 'move'
    );
    
    console.log('');

    // 3. Analyser le nœud "Create a folder"
    if (createFolderNode) {
      console.log('3️⃣ Analyse du nœud "Create a folder"...');
      console.log(`   - Nom: "${createFolderNode.name}"`);
      console.log(`   - Name (paramètre): ${createFolderNode.parameters?.name || 'NON CONFIGURÉ'}`);
      console.log(`   - Parent Folder: ${createFolderNode.parameters?.folderId || 'NON CONFIGURÉ'}`);
      console.log('');
      
      console.log('   💡 PROBLÈME: Le dossier existe déjà');
      console.log('   💡 SOLUTION 1: Ajouter une gestion d\'erreur dans n8n');
      console.log('      - Ouvrez le nœud "Create a folder"');
      console.log('      - Allez dans l\'onglet "Settings"');
      console.log('      - Activez "Continue On Fail" ou "On Error" → "Continue"');
      console.log('      - Cela permettra au workflow de continuer même si le dossier existe déjà');
      console.log('');
      console.log('   💡 SOLUTION 2: Vérifier l\'existence avant de créer');
      console.log('      - Ajoutez un nœud "Get Folders" avant "Create a folder"');
      console.log('      - Utilisez un nœud "IF" pour vérifier si le dossier existe');
      console.log('      - Créez le dossier seulement s\'il n\'existe pas');
      console.log('');
    } else {
      console.log('   ⚠️  Nœud "Create a folder" non trouvé');
      console.log('');
    }

    // 4. Analyser le nœud "Move a message"
    if (moveMessageNode) {
      console.log('4️⃣ Analyse du nœud "Move a message"...');
      console.log(`   - Nom: "${moveMessageNode.name}"`);
      console.log(`   - Message ID: ${moveMessageNode.parameters?.messageId || 'NON CONFIGURÉ'}`);
      console.log(`   - Destination Folder ID: ${moveMessageNode.parameters?.destinationFolderId || 'NON CONFIGURÉ'}`);
      console.log('');
      
      // Vérifier les connexions pour voir d'où vient destinationFolderId
      const moveNodeConnections = workflow.connections?.[moveMessageNode.name];
      console.log('   - Connexions entrantes:');
      if (moveNodeConnections && Object.keys(moveNodeConnections).length > 0) {
        Object.keys(moveNodeConnections).forEach(inputKey => {
          const connections = moveNodeConnections[inputKey];
          if (connections && connections.length > 0) {
            connections.forEach(connection => {
              if (connection && connection.length > 0) {
                connection.forEach(conn => {
                  if (conn.node) {
                    const sourceNode = workflow.nodes?.find(n => n.name === conn.node);
                    console.log(`      → Depuis "${conn.node}" (${sourceNode?.type || 'unknown'})`);
                  }
                });
              }
            });
          }
        });
      } else {
        console.log('      ❌ Aucune connexion entrante trouvée');
      }
      console.log('');
      
      console.log('   💡 PROBLÈME: destinationFolderId est undefined');
      console.log('   💡 CAUSE: Le nœud "Create a folder" doit retourner l\'ID du dossier créé');
      console.log('   💡 SOLUTION:');
      console.log('      1. Vérifiez que le nœud "Create a folder" est bien connecté AVANT "Move a message"');
      console.log('      2. Dans le nœud "Move a message", configurez "Destination Folder" avec:');
      console.log('         - Mode: "By ID"');
      console.log('         - Expression: {{ $json.id }} ou {{ $json.folderId }}');
      console.log('         (Utilisez la sortie du nœud "Create a folder")');
      console.log('      3. Si "Create a folder" retourne l\'ID dans un champ différent, ajustez l\'expression');
      console.log('');
      
      // Vérifier si Create a folder est connecté à Move a message
      const createFolderConnections = workflow.connections?.[createFolderNode?.name];
      let isConnectedToMove = false;
      if (createFolderConnections) {
        Object.keys(createFolderConnections).forEach(outputKey => {
          const connections = createFolderConnections[outputKey];
          if (connections && connections.length > 0) {
            connections.forEach(connection => {
              if (connection && connection.length > 0) {
                connection.forEach(conn => {
                  if (conn.node === moveMessageNode.name) {
                    isConnectedToMove = true;
                  }
                });
              }
            });
          }
        });
      }
      
      if (isConnectedToMove) {
        console.log('   ✅ "Create a folder" est connecté à "Move a message"');
        console.log('   💡 Vérifiez que l\'expression dans "Move a message" utilise le bon champ');
        console.log('      - Ouvrez "Move a message"');
        console.log('      - Cliquez sur "Destination Folder"');
        console.log('      - Activez le mode Expression ({{ }})');
        console.log('      - Essayez: {{ $json.id }} ou {{ $("Create a folder").item.json.id }}');
        console.log('');
      } else {
        console.log('   ❌ "Create a folder" N\'EST PAS connecté à "Move a message"');
        console.log('   💡 SOLUTION: Connectez "Create a folder" à "Move a message" dans n8n');
        console.log('');
      }
    } else {
      console.log('   ⚠️  Nœud "Move a message" non trouvé');
      console.log('');
    }

    // 5. Résumé des corrections à faire
    console.log('📊 RÉSUMÉ DES CORRECTIONS À FAIRE:');
    console.log('');
    console.log('1. Nœud "Create a folder":');
    console.log('   - Activez "Continue On Fail" dans Settings pour ignorer l\'erreur si le dossier existe');
    console.log('   - OU ajoutez une vérification avant de créer');
    console.log('');
    console.log('2. Nœud "Move a message":');
    console.log('   - Vérifiez que "Create a folder" est connecté avant');
    console.log('   - Configurez "Destination Folder" avec l\'expression: {{ $json.id }}');
    console.log('   - OU utilisez: {{ $("Create a folder").item.json.id }}');
    console.log('');
    console.log('3. Après corrections:');
    console.log('   - Sauvegardez chaque nœud');
    console.log('   - Sauvegardez le workflow');
    console.log('   - Réessayez l\'exécution');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
    console.error(error.stack);
  }
}

// Exécuter le script
const n8nWorkflowId = process.argv[2];

if (!n8nWorkflowId) {
  console.error('❌ Usage: node backend/scripts/fix-microsoft-tri-workflow.js <n8nWorkflowId>');
  process.exit(1);
}

fixMicrosoftTriWorkflow(n8nWorkflowId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });

