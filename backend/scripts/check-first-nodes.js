/**
 * Script pour vérifier les nœuds qui s'exécutent en premier (après le webhook)
 * Usage: node backend/scripts/check-first-nodes.js <n8nWorkflowId>
 */

const fetch = require('node-fetch');
const config = require('../config');

async function checkFirstNodes(n8nWorkflowId) {
  console.log('🔍 Vérification des nœuds qui s\'exécutent en premier:', n8nWorkflowId);
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
    console.log(`   - Respond: ${webhookNode.parameters?.respondWith || webhookNode.parameters?.options?.responseMode || 'immediately'}`);
    console.log('');

    // 3. Trouver les nœuds connectés directement au webhook
    console.log('3️⃣ Recherche des nœuds connectés directement au webhook...');
    const firstNodes = [];
    
    if (workflow.connections?.[webhookNode.name]) {
      const webhookConnections = workflow.connections[webhookNode.name];
      
      // Parcourir toutes les sorties du webhook
      Object.keys(webhookConnections).forEach(outputKey => {
        const connections = webhookConnections[outputKey];
        if (connections && connections.length > 0) {
          connections.forEach(connection => {
            if (connection && connection.length > 0) {
              connection.forEach(conn => {
                if (conn.node && !firstNodes.includes(conn.node)) {
                  firstNodes.push(conn.node);
                }
              });
            }
          });
        }
      });
    }
    
    if (firstNodes.length === 0) {
      console.log('   ❌ Aucun nœud connecté au webhook - le workflow ne peut pas s\'exécuter');
      console.log('   💡 Solution: Connectez au moins un nœud au webhook dans n8n');
      return;
    }
    
    console.log(`   ✅ ${firstNodes.length} nœud(s) connecté(s) directement au webhook:`);
    firstNodes.forEach((nodeName, idx) => {
      console.log(`      ${idx + 1}. "${nodeName}"`);
    });
    console.log('');

    // 4. Vérifier chaque premier nœud en détail
    console.log('4️⃣ Vérification détaillée des premiers nœuds...');
    const issues = [];
    
    firstNodes.forEach((nodeName, idx) => {
      const node = workflow.nodes?.find(n => n.name === nodeName);
      
      if (!node) {
        console.log(`   ${idx + 1}. "${nodeName}" - ❌ Nœud introuvable dans la liste des nœuds`);
        issues.push(`Nœud "${nodeName}" introuvable`);
        return;
      }
      
      console.log(`   ${idx + 1}. "${nodeName}" (${node.type})`);
      
      // Vérifier les nœuds Microsoft Outlook
      if (node.type === 'n8n-nodes-base.microsoftOutlook') {
        console.log(`      - Type: Microsoft Outlook`);
        console.log(`      - Resource: ${node.parameters?.resource || 'NON CONFIGURÉ'}`);
        console.log(`      - Operation: ${node.parameters?.operation || 'NON CONFIGURÉ'}`);
        
        // Vérifier folderId pour folderMessage
        if (node.parameters?.resource === 'folderMessage') {
          const folderId = node.parameters?.folderId;
          const folderIdValue = typeof folderId === 'object' ? folderId?.value : folderId;
          const folderIdString = String(folderId || '');
          
          // Vérifier si folderId est vide ET n'est pas une expression dynamique
          const isEmpty = !folderId || folderIdValue === '' || folderIdValue === null || folderIdValue === undefined;
          const isDynamic = folderIdString.includes('{{') || folderIdString.includes('$json') || folderIdString.includes('$(');
          
          if (isEmpty && !isDynamic) {
            const issue = `Nœud "${nodeName}" (PREMIER NŒUD): Le paramètre "Folder" est requis mais n'est pas configuré.`;
            issues.push(issue);
            console.log(`      ❌ ${issue}`);
            console.log(`      💡 Solution: Ouvrez ce nœud dans n8n et sélectionnez un dossier dans le paramètre "Folder"`);
          } else if (isDynamic) {
            console.log(`      ✅ Folder configuré dynamiquement: ${folderIdString.substring(0, 80)}...`);
          } else {
            console.log(`      ✅ Folder configuré: ${folderIdValue}`);
          }
        }
        
        // Vérifier mailbox
        if (node.parameters?.resource === 'folderMessage' && node.parameters?.operation === 'getAll') {
          const mailbox = node.parameters?.mailbox;
          if (!mailbox || mailbox === '') {
            const issue = `Nœud "${nodeName}" (PREMIER NŒUD): Le paramètre "Mailbox" est requis mais n'est pas configuré.`;
            issues.push(issue);
            console.log(`      ❌ ${issue}`);
            console.log(`      💡 Solution: Configurez le paramètre "Mailbox" dans le nœud`);
          } else {
            console.log(`      ✅ Mailbox configuré: ${mailbox}`);
          }
        }
        
        // Vérifier les credentials
        if (!node.credentials?.microsoftOutlookOAuth2Api) {
          const issue = `Nœud "${nodeName}" (PREMIER NŒUD): Credential Microsoft Outlook OAuth2 manquant`;
          issues.push(issue);
          console.log(`      ❌ ${issue}`);
          console.log(`      💡 Solution: Assignez un credential Microsoft Outlook OAuth2 à ce nœud`);
        } else {
          console.log(`      ✅ Credential présent (ID: ${node.credentials.microsoftOutlookOAuth2Api.id})`);
        }
      }
      
      // Vérifier les autres types de nœuds
      else {
        console.log(`      - Type: ${node.type}`);
        console.log(`      - Paramètres: ${JSON.stringify(node.parameters || {}).substring(0, 100)}...`);
      }
      
      console.log('');
    });

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
      console.log(`   ❌ ${issues.length} problème(s) détecté(s):`);
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
      console.log('');
      console.log('💡 Ces problèmes empêchent l\'exécution du workflow.');
      console.log('   Corrigez-les dans n8n avant de réessayer.');
    } else {
      console.log('   ✅ Aucun problème détecté dans les premiers nœuds');
      console.log('   💡 Si le workflow ne s\'exécute toujours pas, le problème pourrait être ailleurs.');
      console.log('   💡 Vérifiez dans n8n l\'onglet "Executions" pour voir les erreurs d\'exécution.');
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
  console.error('❌ Usage: node backend/scripts/check-first-nodes.js <n8nWorkflowId>');
  process.exit(1);
}

checkFirstNodes(n8nWorkflowId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });

