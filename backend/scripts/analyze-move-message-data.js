/**
 * Script pour analyser les données nécessaires pour le nœud "Move a message"
 * Usage: node backend/scripts/analyze-move-message-data.js <n8nWorkflowId>
 */

const fetch = require('node-fetch');
const config = require('../config');

async function analyzeMoveMessageData(n8nWorkflowId) {
  console.log('🔍 Analyse des données pour "Move a message":', n8nWorkflowId);
  console.log('');

  try {
    // 1. Récupérer le workflow depuis n8n
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

    // 2. Trouver les nœuds pertinents
    const moveMessageNode = workflow.nodes?.find(n => 
      n.type === 'n8n-nodes-base.microsoftOutlook' && 
      n.parameters?.resource === 'message' && 
      n.parameters?.operation === 'move'
    );
    
    const associerNode = workflow.nodes?.find(n => 
      n.name?.includes('Associer') || n.name?.includes('associer')
    );
    
    const createFolderNode = workflow.nodes?.find(n => 
      n.type === 'n8n-nodes-base.microsoftOutlook' && 
      n.parameters?.resource === 'folder' && 
      n.parameters?.operation === 'create'
    );

    console.log('📊 ANALYSE DU PROBLÈME:');
    console.log('');
    console.log('Le nœud "Move a message" a besoin de:');
    console.log('  1. messageId (ID du message à déplacer)');
    console.log('  2. destinationFolderId (ID du dossier de destination)');
    console.log('');
    console.log('PROBLÈME ACTUEL:');
    console.log('  - "Associer Emails Dossiers2" produit: skip=true, message="Aucun email à déplacer"');
    console.log('  - Cela signifie qu\'il n\'y a pas d\'email à déplacer OU que la logique d\'association ne fonctionne pas');
    console.log('  - destinationFolderId est undefined car il n\'y a pas de données à traiter');
    console.log('');

    // 3. Analyser les connexions
    console.log('🔗 ANALYSE DES CONNEXIONS:');
    if (moveMessageNode) {
      console.log(`   - Nœud "Move a message": "${moveMessageNode.name}"`);
      
      // Trouver les nœuds qui alimentent "Move a message"
      const moveNodeConnections = workflow.connections?.[moveMessageNode.name];
      if (moveNodeConnections) {
        Object.keys(moveNodeConnections).forEach(inputKey => {
          const connections = moveNodeConnections[inputKey];
          if (connections && connections.length > 0) {
            connections.forEach(connection => {
              if (connection && connection.length > 0) {
                connection.forEach(conn => {
                  if (conn.node) {
                    const sourceNode = workflow.nodes?.find(n => n.name === conn.node);
                    console.log(`     ← Reçoit des données de: "${conn.node}" (${sourceNode?.type || 'unknown'})`);
                  }
                });
              }
            });
          }
        });
      }
      console.log('');
    }

    // 4. Solutions
    console.log('💡 SOLUTIONS:');
    console.log('');
    console.log('SOLUTION 1: Vérifier pourquoi "Associer Emails Dossiers2" produit skip=true');
    console.log('  - Ouvrez le nœud "Associer Emails Dossiers2"');
    console.log('  - Vérifiez la logique qui détermine s\'il y a des emails à déplacer');
    console.log('  - Le message dit "Aucun email à déplacer" - pourquoi ?');
    console.log('  - Vérifiez que les emails sont bien associés aux dossiers');
    console.log('');

    console.log('SOLUTION 2: Vérifier que "Associer Emails Dossiers2" produit les bonnes données');
    console.log('  - Le nœud doit produire pour chaque email à déplacer:');
    console.log('    {');
    console.log('      id: "messageId",           // ID du message à déplacer');
    console.log('      destinationFolderId: "...", // ID du dossier de destination');
    console.log('      ... autres champs ...');
    console.log('    }');
    console.log('  - Si le champ s\'appelle différemment, ajustez l\'expression dans "Move a message"');
    console.log('');

    console.log('SOLUTION 3: Configurer "Move a message" correctement');
    console.log('  - Ouvrez le nœud "Move a message"');
    console.log('  - Message → By ID → {{ $json.id }}');
    console.log('  - Destination Folder → By ID → {{ $json.destinationFolderId }}');
    console.log('  - Si le champ s\'appelle différemment, utilisez le bon nom:');
    console.log('    - {{ $json.folderId }}');
    console.log('    - {{ $json.destinationId }}');
    console.log('    - {{ $json.targetFolderId }}');
    console.log('    - etc.');
    console.log('');

    console.log('SOLUTION 4: Ajouter un filtre avant "Move a message"');
    console.log('  - Ajoutez un nœud "IF" avant "Move a message"');
    console.log('  - Condition: {{ $json.skip !== true }}');
    console.log('  - Cela évitera d\'essayer de déplacer quand skip=true');
    console.log('');

    // 5. Vérifier le flux de données attendu
    console.log('📋 FLUX DE DONNÉES ATTENDU:');
    console.log('');
    console.log('1. "Get many folder messages" → récupère les messages');
    console.log('2. "Normaliser Emails2" → normalise les emails');
    console.log('3. "Classifier par Dossier2" → classe par dossier');
    console.log('4. "Extraire Dossiers Uniques2" → extrait les dossiers uniques');
    console.log('5. "Filtrer Dossiers Manquants2" → filtre les dossiers manquants');
    console.log('6. "Create a folder" → crée les dossiers manquants (retourne l\'ID du dossier)');
    console.log('7. "Get many folder messages1" → récupère les messages (probablement les lus)');
    console.log('8. "Get many folder messages2" → récupère 2700 items (tous les messages ?)');
    console.log('9. "Associer Emails Dossiers2" → ASSOCIE les emails aux dossiers');
    console.log('   → DOIT produire: { id: messageId, destinationFolderId: folderId, ... }');
    console.log('10. "Move a message" → déplace les messages dans les bons dossiers');
    console.log('');

    console.log('⚠️  PROBLÈME IDENTIFIÉ:');
    console.log('  - "Associer Emails Dossiers2" ne produit PAS les données attendues');
    console.log('  - Il produit skip=true au lieu de produire les emails avec destinationFolderId');
    console.log('  - Il faut corriger la logique dans "Associer Emails Dossiers2"');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error.message);
    console.error(error.stack);
  }
}

// Exécuter le script
const n8nWorkflowId = process.argv[2];

if (!n8nWorkflowId) {
  console.error('❌ Usage: node backend/scripts/analyze-move-message-data.js <n8nWorkflowId>');
  process.exit(1);
}

analyzeMoveMessageData(n8nWorkflowId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });

