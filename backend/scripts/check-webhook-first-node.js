/**
 * Script pour vérifier le premier nœud après le webhook et ses paramètres
 * Usage: node backend/scripts/check-webhook-first-node.js <n8nWorkflowId>
 */

const fetch = require('node-fetch');
const config = require('../config');

async function checkWebhookFirstNode(n8nWorkflowId) {
  console.log('🔍 Vérification du premier nœud après le webhook:', n8nWorkflowId);
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

    // 2. Trouver le nœud webhook
    console.log('2️⃣ Recherche du nœud webhook...');
    const webhookNode = workflow.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
    
    if (!webhookNode) {
      console.log('   ❌ Aucun nœud webhook trouvé');
      return;
    }
    
    console.log(`   ✅ Webhook trouvé: "${webhookNode.name}"`);
    console.log(`   - Path: ${webhookNode.parameters?.path || 'NON CONFIGURÉ'}`);
    console.log(`   - HTTP Method: ${webhookNode.parameters?.httpMethod || 'POST'}`);
    console.log(`   - Authentication: ${webhookNode.parameters?.authentication || 'None'}`);
    console.log(`   - Respond: ${webhookNode.parameters?.respondWith || webhookNode.parameters?.options?.responseMode || 'immediately'}`);
    console.log('');

    // 3. Trouver le PREMIER nœud connecté directement au webhook
    console.log('3️⃣ Recherche du PREMIER nœud connecté au webhook...');
    let firstNodeName = null;
    let firstNodeOutput = null;
    
    if (workflow.connections?.[webhookNode.name]) {
      const webhookConnections = workflow.connections[webhookNode.name];
      
      // Parcourir toutes les sorties du webhook (généralement "main")
      Object.keys(webhookConnections).forEach(outputKey => {
        const connections = webhookConnections[outputKey];
        if (connections && connections.length > 0) {
          connections.forEach(connection => {
            if (connection && connection.length > 0) {
              connection.forEach(conn => {
                if (conn.node && !firstNodeName) {
                  firstNodeName = conn.node;
                  firstNodeOutput = outputKey;
                }
              });
            }
          });
        }
      });
    }
    
    if (!firstNodeName) {
      console.log('   ❌ Aucun nœud connecté au webhook - le workflow ne peut pas s\'exécuter');
      console.log('   💡 Solution: Connectez au moins un nœud au webhook dans n8n');
      return;
    }
    
    console.log(`   ✅ Premier nœud trouvé: "${firstNodeName}"`);
    console.log(`   - Connecté depuis la sortie: ${firstNodeOutput || 'main'}`);
    console.log('');

    // 4. Vérifier le premier nœud en détail
    console.log('4️⃣ Analyse détaillée du PREMIER nœud...');
    const firstNode = workflow.nodes?.find(n => n.name === firstNodeName);
    
    if (!firstNode) {
      console.log(`   ❌ Nœud "${firstNodeName}" introuvable dans la liste des nœuds`);
      return;
    }
    
    console.log(`   - Nom: "${firstNode.name}"`);
    console.log(`   - Type: ${firstNode.type}`);
    console.log(`   - Position: x=${firstNode.position?.[0]}, y=${firstNode.position?.[1]}`);
    console.log('');
    
    const issues = [];
    
    // Vérifier les nœuds Microsoft Outlook
    if (firstNode.type === 'n8n-nodes-base.microsoftOutlook') {
      console.log('   📧 Nœud Microsoft Outlook détecté');
      console.log(`   - Resource: ${firstNode.parameters?.resource || 'NON CONFIGURÉ'}`);
      console.log(`   - Operation: ${firstNode.parameters?.operation || 'NON CONFIGURÉ'}`);
      console.log('');
      
      // Vérifier folderId pour folderMessage
      if (firstNode.parameters?.resource === 'folderMessage') {
        const folderId = firstNode.parameters?.folderId;
        const folderIdValue = typeof folderId === 'object' ? folderId?.value : folderId;
        const folderIdString = String(folderId || '');
        
        console.log(`   - Folder ID (type): ${typeof folderId}`);
        console.log(`   - Folder ID (value): ${folderIdValue || 'VIDE'}`);
        console.log(`   - Folder ID (string): ${folderIdString.substring(0, 100)}`);
        console.log('');
        
        // Vérifier si folderId est vide ET n'est pas une expression dynamique
        const isEmpty = !folderId || folderIdValue === '' || folderIdValue === null || folderIdValue === undefined;
        const isDynamic = folderIdString.includes('{{') || folderIdString.includes('$json') || folderIdString.includes('$(') || folderIdString.includes('$node');
        
        if (isEmpty && !isDynamic) {
          const issue = `❌ CRITIQUE: Le paramètre "Folder" est VIDE dans le PREMIER nœud "${firstNodeName}"`;
          issues.push(issue);
          console.log(`   ${issue}`);
          console.log(`   💡 Solution: Ouvrez ce nœud dans n8n et sélectionnez un dossier dans le paramètre "Folder"`);
          console.log(`   💡 Vous pouvez utiliser "Inbox" temporairement, ou une expression dynamique si le folderId vient d'un nœud précédent`);
        } else if (isDynamic) {
          console.log(`   ✅ Folder configuré dynamiquement (expression détectée)`);
        } else {
          console.log(`   ✅ Folder configuré: ${folderIdValue}`);
        }
      }
      
      // Vérifier mailbox pour folderMessage
      if (firstNode.parameters?.resource === 'folderMessage' && firstNode.parameters?.operation === 'getAll') {
        const mailbox = firstNode.parameters?.mailbox;
        if (!mailbox || mailbox === '') {
          const issue = `❌ CRITIQUE: Le paramètre "Mailbox" est VIDE dans le PREMIER nœud "${firstNodeName}"`;
          issues.push(issue);
          console.log(`   ${issue}`);
          console.log(`   💡 Solution: Configurez le paramètre "Mailbox" dans le nœud`);
        } else {
          console.log(`   ✅ Mailbox configuré: ${mailbox}`);
        }
      }
      
      // Vérifier les credentials
      if (!firstNode.credentials?.microsoftOutlookOAuth2Api) {
        const issue = `❌ CRITIQUE: Credential Microsoft Outlook OAuth2 MANQUANT dans le PREMIER nœud "${firstNodeName}"`;
        issues.push(issue);
        console.log(`   ${issue}`);
        console.log(`   💡 Solution: Assignez un credential Microsoft Outlook OAuth2 à ce nœud`);
      } else {
        console.log(`   ✅ Credential présent (ID: ${firstNode.credentials.microsoftOutlookOAuth2Api.id})`);
      }
    }
    
    // Vérifier les autres types de nœuds
    else {
      console.log(`   - Paramètres complets:`);
      console.log(JSON.stringify(firstNode.parameters || {}, null, 2).substring(0, 500));
      console.log('');
      
      // Vérifier s'il y a des paramètres requis vides
      if (firstNode.parameters) {
        Object.keys(firstNode.parameters).forEach(paramKey => {
          const paramValue = firstNode.parameters[paramKey];
          if (paramValue === '' || paramValue === null || paramValue === undefined) {
            console.log(`   ⚠️  Paramètre "${paramKey}" est vide`);
          }
        });
      }
    }
    
    console.log('');

    // 5. Essayer d'activer le workflow pour voir l'erreur exacte de n8n
    console.log('5️⃣ Test d\'activation du workflow pour récupérer l\'erreur exacte de n8n...');
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
          if (errorJson.message) {
            issues.push(`Erreur n8n: ${errorJson.message}`);
          }
          if (errorJson.details) {
            console.log(`   - Détails: ${JSON.stringify(errorJson.details, null, 2)}`);
            if (errorJson.details.issues) {
              console.log(`   - Issues détectés par n8n:`);
              errorJson.details.issues.forEach((issue, idx) => {
                console.log(`      ${idx + 1}. ${issue}`);
                issues.push(`n8n: ${issue}`);
              });
            }
          }
        } else {
          console.log(`   - Réponse brute: ${errorText.substring(0, 500)}`);
          // Essayer d'extraire des informations utiles
          if (errorText.includes('folder') || errorText.includes('Folder')) {
            issues.push('n8n détecte un problème avec un paramètre "Folder"');
          }
          if (errorText.includes('credential') || errorText.includes('Credential')) {
            issues.push('n8n détecte un problème avec un credential');
          }
          if (errorText.includes('required') || errorText.includes('Required')) {
            issues.push('n8n détecte un paramètre requis manquant');
          }
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

    // 6. Résumé
    console.log('📊 RÉSUMÉ:');
    if (issues.length > 0) {
      console.log(`   ❌ ${issues.length} problème(s) CRITIQUE(s) détecté(s) dans le PREMIER nœud:`);
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
      console.log('');
      console.log('💡 Ces problèmes empêchent l\'exécution du workflow AVANT même d\'atteindre le premier nœud.');
      console.log(`   Corrigez le nœud "${firstNodeName}" dans n8n avant de réessayer.`);
    } else {
      console.log('   ✅ Aucun problème détecté dans le premier nœud');
      console.log('   💡 Si le workflow ne s\'exécute toujours pas, vérifiez les logs n8n pour plus de détails.');
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
  console.error('❌ Usage: node backend/scripts/check-webhook-first-node.js <n8nWorkflowId>');
  process.exit(1);
}

checkWebhookFirstNode(n8nWorkflowId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });

