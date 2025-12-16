/**
 * Script pour vérifier les nœuds avec des avertissements/erreurs dans le workflow
 * Usage: node backend/scripts/check-nodes-with-warnings.js <n8nWorkflowId>
 */

const fetch = require('node-fetch');
const config = require('../config');

async function checkNodesWithWarnings(n8nWorkflowId) {
  console.log('🔍 Vérification des nœuds avec avertissements:', n8nWorkflowId);
  console.log('');

  try {
    // 1. Récupérer le workflow depuis n8n
    console.log('1️⃣ Récupération du workflow depuis n8n...');
    const workflowResponse = await fetch(`${config.n8n.url}/api/v1/workflows/${n8nWorkflowId}`, {
      headers: { 'X-N8N-API-KEY': config.n8n.apiKey }
    });

    if (!workflowResponse.ok) {
      console.error(`❌ Erreur ${workflowResponse.status}: Impossible de récupérer le workflow`);
      const errorText = await workflowResponse.text();
      console.error('Détails:', errorText);
      return;
    }

    const workflow = await workflowResponse.json();
    console.log(`✅ Workflow récupéré: "${workflow.name}"`);
    console.log('');

    // 2. Vérifier tous les nœuds Microsoft Outlook pour des paramètres manquants
    console.log('2️⃣ Vérification de TOUS les nœuds Microsoft Outlook...');
    const outlookNodes = workflow.nodes?.filter(n => n.type === 'n8n-nodes-base.microsoftOutlook') || [];
    const issues = [];
    
    if (outlookNodes.length > 0) {
      console.log(`   - ${outlookNodes.length} nœud(s) Microsoft Outlook trouvé(s)`);
      console.log('');
      
      outlookNodes.forEach((node, idx) => {
        console.log(`   ${idx + 1}. "${node.name}"`);
        console.log(`      - Resource: ${node.parameters?.resource || 'NON CONFIGURÉ'}`);
        console.log(`      - Operation: ${node.parameters?.operation || 'NON CONFIGURÉ'}`);
        
        let nodeHasIssue = false;
        
        // Vérifier folderId pour folderMessage
        if (node.parameters?.resource === 'folderMessage') {
          const folderId = node.parameters?.folderId;
          const folderIdValue = typeof folderId === 'object' ? folderId?.value : folderId;
          const folderIdString = String(folderId || '');
          
          const isEmpty = !folderId || folderIdValue === '' || folderIdValue === null || folderIdValue === undefined;
          const isDynamic = folderIdString.includes('{{') || folderIdString.includes('$json') || folderIdString.includes('$(') || folderIdString.includes('$node');
          
          if (isEmpty && !isDynamic) {
            const issue = `Nœud "${node.name}": Le paramètre "Folder" est requis mais VIDE`;
            issues.push(issue);
            nodeHasIssue = true;
            console.log(`      ❌ ${issue}`);
            console.log(`      💡 Solution: Ouvrez ce nœud dans n8n et sélectionnez un dossier dans le paramètre "Folder"`);
            console.log(`      💡 Si le folderId doit être dynamique, utilisez une expression comme {{ $json.folderId || 'inbox' }}`);
          } else if (isDynamic) {
            console.log(`      ✅ Folder configuré dynamiquement`);
          } else {
            console.log(`      ✅ Folder configuré: ${folderIdValue}`);
          }
        }
        
        // Vérifier folderId pour create folder
        if (node.parameters?.resource === 'folder' && node.parameters?.operation === 'create') {
          const folderId = node.parameters?.folderId;
          const folderIdValue = typeof folderId === 'object' ? folderId?.value : folderId;
          const folderIdString = String(folderId || '');
          
          const isEmpty = !folderId || folderIdValue === '' || folderIdValue === null || folderIdValue === undefined;
          const isDynamic = folderIdString.includes('{{') || folderIdString.includes('$json') || folderIdString.includes('$(') || folderIdString.includes('$node');
          
          if (isEmpty && !isDynamic) {
            const issue = `Nœud "${node.name}" (Create a folder): Le paramètre "Folder" est requis mais VIDE`;
            issues.push(issue);
            nodeHasIssue = true;
            console.log(`      ❌ ${issue}`);
            console.log(`      💡 Solution: Ouvrez ce nœud dans n8n et configurez le paramètre "Folder"`);
            console.log(`      💡 Si le folderId doit être dynamique, utilisez une expression comme {{ $json.folderId }}`);
          } else if (isDynamic) {
            console.log(`      ✅ Folder configuré dynamiquement`);
          } else {
            console.log(`      ✅ Folder configuré: ${folderIdValue}`);
          }
        }
        
        // Vérifier messageId pour move message
        if (node.parameters?.resource === 'message' && node.parameters?.operation === 'move') {
          const messageId = node.parameters?.messageId;
          const messageIdValue = typeof messageId === 'object' ? messageId?.value : messageId;
          const messageIdString = String(messageId || '');
          
          const isEmpty = !messageId || messageIdValue === '' || messageIdValue === null || messageIdValue === undefined;
          const isDynamic = messageIdString.includes('{{') || messageIdString.includes('$json') || messageIdString.includes('$(') || messageIdString.includes('$node');
          
          if (isEmpty && !isDynamic) {
            const issue = `Nœud "${node.name}" (Move a message): Le paramètre "Message ID" est requis mais VIDE`;
            issues.push(issue);
            nodeHasIssue = true;
            console.log(`      ❌ ${issue}`);
            console.log(`      💡 Solution: Ouvrez ce nœud dans n8n et configurez le paramètre "Message ID"`);
            console.log(`      💡 Si le messageId doit être dynamique, utilisez une expression comme {{ $json.messageId }}`);
          } else if (isDynamic) {
            console.log(`      ✅ Message ID configuré dynamiquement`);
          } else {
            console.log(`      ✅ Message ID configuré: ${messageIdValue}`);
          }
          
          // Vérifier aussi destinationFolderId pour move
          const destinationFolderId = node.parameters?.destinationFolderId;
          const destinationFolderIdValue = typeof destinationFolderId === 'object' ? destinationFolderId?.value : destinationFolderId;
          const destinationFolderIdString = String(destinationFolderId || '');
          
          const isDestinationEmpty = !destinationFolderId || destinationFolderIdValue === '' || destinationFolderIdValue === null || destinationFolderIdValue === undefined;
          const isDestinationDynamic = destinationFolderIdString.includes('{{') || destinationFolderIdString.includes('$json') || destinationFolderIdString.includes('$(') || destinationFolderIdString.includes('$node');
          
          if (isDestinationEmpty && !isDestinationDynamic) {
            const issue = `Nœud "${node.name}" (Move a message): Le paramètre "Destination Folder" est requis mais VIDE`;
            issues.push(issue);
            nodeHasIssue = true;
            console.log(`      ❌ ${issue}`);
            console.log(`      💡 Solution: Ouvrez ce nœud dans n8n et configurez le paramètre "Destination Folder"`);
            console.log(`      💡 Si le destinationFolderId doit être dynamique, utilisez une expression comme {{ $json.destinationFolderId }}`);
          } else if (isDestinationDynamic) {
            console.log(`      ✅ Destination Folder configuré dynamiquement`);
          } else {
            console.log(`      ✅ Destination Folder configuré: ${destinationFolderIdValue}`);
          }
        }
        
        // Vérifier mailbox pour folderMessage getAll
        if (node.parameters?.resource === 'folderMessage' && node.parameters?.operation === 'getAll') {
          const mailbox = node.parameters?.mailbox;
          if (!mailbox || mailbox === '') {
            const issue = `Nœud "${node.name}": Le paramètre "Mailbox" est requis mais VIDE`;
            issues.push(issue);
            nodeHasIssue = true;
            console.log(`      ❌ ${issue}`);
            console.log(`      💡 Solution: Configurez le paramètre "Mailbox" dans le nœud`);
          } else {
            console.log(`      ✅ Mailbox configuré: ${mailbox}`);
          }
        }
        
        // Vérifier les credentials
        if (!node.credentials?.microsoftOutlookOAuth2Api) {
          const issue = `Nœud "${node.name}": Credential Microsoft Outlook OAuth2 MANQUANT`;
          issues.push(issue);
          nodeHasIssue = true;
          console.log(`      ❌ ${issue}`);
          console.log(`      💡 Solution: Assignez un credential Microsoft Outlook OAuth2 à ce nœud`);
        } else {
          console.log(`      ✅ Credential présent (ID: ${node.credentials.microsoftOutlookOAuth2Api.id})`);
        }
        
        if (!nodeHasIssue) {
          console.log(`      ✅ Aucun problème détecté`);
        }
        
        console.log('');
      });
    } else {
      console.log('   - Aucun nœud Microsoft Outlook trouvé');
    }

    // 3. Essayer d'activer le workflow pour voir l'erreur exacte de n8n
    console.log('3️⃣ Test d\'activation du workflow pour récupérer l\'erreur exacte de n8n...');
    try {
      const activateResponse = await fetch(`${config.n8n.url}/api/v1/workflows/${n8nWorkflowId}/activate`, {
        method: 'POST',
        headers: { 
          'X-N8N-API-KEY': config.n8n.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: true })
      });
      
      if (!activateResponse.ok) {
        const errorText = await activateResponse.text();
        let errorJson = null;
        try {
          errorJson = JSON.parse(errorText);
        } catch (e) {
          // Ignorer
        }
        
        console.log(`   ❌ Erreur lors de l'activation: ${activateResponse.status}`);
        if (errorJson) {
          console.log(`   - Message: ${errorJson.message || errorText}`);
          if (errorJson.message && !issues.includes(`Erreur n8n: ${errorJson.message}`)) {
            issues.push(`Erreur n8n: ${errorJson.message}`);
          }
          if (errorJson.details) {
            console.log(`   - Détails: ${JSON.stringify(errorJson.details, null, 2)}`);
            if (errorJson.details.issues) {
              console.log(`   - Issues détectés par n8n:`);
              errorJson.details.issues.forEach((issue, idx) => {
                console.log(`      ${idx + 1}. ${issue}`);
                if (!issues.includes(`n8n: ${issue}`)) {
                  issues.push(`n8n: ${issue}`);
                }
              });
            }
          }
        } else {
          console.log(`   - Réponse brute: ${errorText.substring(0, 500)}`);
        }
        console.log('');
      } else {
        console.log('   ✅ Le workflow peut être activé (pas d\'erreur de validation détectée)');
        // Désactiver immédiatement pour ne pas changer l'état
        const currentActive = workflow.active;
        await fetch(`${config.n8n.url}/api/v1/workflows/${n8nWorkflowId}/activate`, {
          method: 'POST',
          headers: { 
            'X-N8N-API-KEY': config.n8n.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ active: currentActive })
        });
        console.log('');
      }
    } catch (activateError) {
      console.log(`   ⚠️  Erreur lors du test d'activation: ${activateError.message}`);
      console.log('');
    }

    // 4. Résumé
    console.log('📊 RÉSUMÉ:');
    if (issues.length > 0) {
      console.log(`   ❌ ${issues.length} problème(s) détecté(s) qui empêchent l'activation:`);
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
      console.log('');
      console.log('💡 CORRIGEZ CES PROBLÈMES DANS N8N:');
      console.log('   1. Ouvrez chaque nœud mentionné ci-dessus');
      console.log('   2. Configurez les paramètres manquants (Folder, Message ID, Destination Folder, etc.)');
      console.log('   3. Si les valeurs doivent être dynamiques, utilisez des expressions ({{ $json.xxx }})');
      console.log('   4. Sauvegardez chaque nœud');
      console.log('   5. Sauvegardez le workflow');
      console.log('');
      console.log('⚠️  MÊME SI UN NŒUD NE S\'EXÉCUTE PAS EN PREMIER, n8n valide TOUS les nœuds avant l\'activation.');
    } else {
      console.log('   ✅ Aucun problème détecté dans les nœuds Microsoft Outlook');
      console.log('   💡 Si le workflow ne s\'exécute toujours pas, vérifiez les autres types de nœuds.');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    console.error(error.stack);
  }
}

// Exécuter le script
const n8nWorkflowId = process.argv[2];

if (!n8nWorkflowId) {
  console.error('❌ Usage: node backend/scripts/check-nodes-with-warnings.js <n8nWorkflowId>');
  process.exit(1);
}

checkNodesWithWarnings(n8nWorkflowId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });

