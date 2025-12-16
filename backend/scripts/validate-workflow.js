/**
 * Script pour valider un workflow n8n et identifier les problèmes
 * Usage: node backend/scripts/validate-workflow.js <n8nWorkflowId>
 */

const fetch = require('node-fetch');
const config = require('../config');

async function validateWorkflowDetailed(n8nWorkflowId) {
  console.log('🔍 Validation détaillée du workflow:', n8nWorkflowId);
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
    console.log(`   - Actif: ${workflow.active ? '✅ OUI' : '❌ NON'}`);
    console.log(`   - ID: ${workflow.id}`);
    console.log('');

    // 2. Vérifier les problèmes de validation
    console.log('2️⃣ Analyse des problèmes de validation...');
    const issues = [];

    // Trouver le nœud webhook pour identifier les nœuds qui s'exécutent en premier
    const webhookNode = workflow.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
    const firstNodesAfterWebhook = [];
    
    if (webhookNode && workflow.connections?.[webhookNode.name]) {
      const webhookConnections = workflow.connections[webhookNode.name];
      Object.keys(webhookConnections).forEach(outputKey => {
        const connections = webhookConnections[outputKey];
        if (connections && connections.length > 0) {
          connections.forEach(connection => {
            if (connection && connection.length > 0) {
              connection.forEach(conn => {
                if (conn.node) {
                  firstNodesAfterWebhook.push(conn.node);
                }
              });
            }
          });
        }
      });
    }
    
    // Vérifier les nœuds Microsoft Outlook
    const outlookNodes = workflow.nodes?.filter(n => n.type === 'n8n-nodes-base.microsoftOutlook') || [];
    if (outlookNodes.length > 0) {
      console.log(`   - ${outlookNodes.length} nœud(s) Microsoft Outlook trouvé(s)`);
      
      outlookNodes.forEach((node, idx) => {
        console.log(`   ${idx + 1}. "${node.name}"`);
        
        // Vérifier si ce nœud est un des premiers nœuds après le webhook
        const isFirstNode = firstNodesAfterWebhook.includes(node.name);
        if (isFirstNode) {
          console.log(`      ⚠️  PREMIER NŒUD APRÈS WEBHOOK - Vérification stricte`);
        }
        
        // Vérifier folderId pour folderMessage
        if (node.parameters?.resource === 'folderMessage') {
          const folderId = node.parameters?.folderId;
          const folderIdValue = typeof folderId === 'object' ? folderId?.value : folderId;
          const folderIdString = String(folderId || '');
          
          // Vérifier si folderId est vide ET n'est pas une expression dynamique
          const isEmpty = !folderId || folderIdValue === '' || folderIdValue === null || folderIdValue === undefined;
          const isDynamic = folderIdString.includes('{{') || folderIdString.includes('$json') || folderIdString.includes('$(');
          
          if (isEmpty && !isDynamic) {
            // Si c'est un premier nœud, c'est critique
            if (isFirstNode) {
              const issue = `Nœud "${node.name}" (PREMIER NŒUD APRÈS WEBHOOK): Le paramètre "Folder" est requis mais n'est pas configuré.`;
              issues.push(issue);
              console.log(`      ❌ ${issue}`);
              console.log(`      💡 Solution: Ouvrez ce nœud dans n8n et sélectionnez un dossier dans le paramètre "Folder"`);
            } else {
              // Pour les nœuds qui ne sont pas premiers, vérifier si c'est un nœud dynamique
              const nodeNameLower = (node.name || '').toLowerCase();
              const isDynamicFolderNode = nodeNameLower.includes('get many folder messages2') || 
                                         nodeNameLower.includes('messages2') ||
                                         nodeNameLower.includes('check folders') ||
                                         nodeNameLower.includes('vérifier tous');
              
              if (!isDynamicFolderNode) {
                const issue = `Nœud "${node.name}" (Microsoft Outlook): Le paramètre "Folder" est requis mais n'est pas configuré.`;
                issues.push(issue);
                console.log(`      ❌ ${issue}`);
                console.log(`      💡 Solution: Ouvrez ce nœud dans n8n et sélectionnez un dossier dans le paramètre "Folder"`);
              } else {
                console.log(`      ✅ Folder sera rempli dynamiquement (nœud dynamique)`);
              }
            }
          } else if (isDynamic) {
            console.log(`      ✅ Folder configuré dynamiquement: ${folderIdString.substring(0, 50)}...`);
          } else {
            console.log(`      ✅ Folder configuré: ${folderIdValue}`);
          }
        }
        
        // Vérifier mailbox pour folderMessage
        if (node.parameters?.resource === 'folderMessage' && node.parameters?.operation === 'getAll') {
          const mailbox = node.parameters?.mailbox;
          if (!mailbox || mailbox === '') {
            const issue = `Nœud "${node.name}" (Microsoft Outlook): Le paramètre "Mailbox" est requis mais n'est pas configuré.`;
            issues.push(issue);
            console.log(`      ❌ ${issue}`);
            console.log(`      💡 Solution: Configurez le paramètre "Mailbox" dans le nœud`);
          }
        }
        
        // Vérifier les credentials
        if (!node.credentials?.microsoftOutlookOAuth2Api) {
          const issue = `Nœud "${node.name}" (Microsoft Outlook): Credential Microsoft Outlook OAuth2 manquant`;
          issues.push(issue);
          console.log(`      ❌ ${issue}`);
          console.log(`      💡 Solution: Assignez un credential Microsoft Outlook OAuth2 à ce nœud`);
        } else {
          console.log(`      ✅ Credential présent (ID: ${node.credentials.microsoftOutlookOAuth2Api.id})`);
        }
        
        console.log('');
      });
    } else {
      console.log('   - Aucun nœud Microsoft Outlook trouvé');
    }

    // Vérifier les nœuds Email Send
    const emailNodes = workflow.nodes?.filter(n => n.type === 'n8n-nodes-base.emailSend') || [];
    if (emailNodes.length > 0) {
      console.log(`   - ${emailNodes.length} nœud(s) Email Send trouvé(s)`);
      
      emailNodes.forEach((node, idx) => {
        console.log(`   ${idx + 1}. "${node.name}"`);
        
        if (!node.credentials?.smtp) {
          const issue = `Nœud "${node.name}" (Email Send): Credential SMTP manquant`;
          issues.push(issue);
          console.log(`      ❌ ${issue}`);
          console.log(`      💡 Solution: Assignez un credential SMTP à ce nœud`);
        } else {
          console.log(`      ✅ Credential SMTP présent`);
        }
        
        console.log('');
      });
    }

    // Vérifier les connexions
    console.log('3️⃣ Vérification des connexions...');
    if (!workflow.connections || Object.keys(workflow.connections).length === 0) {
      const issue = 'Aucune connexion entre les nœuds';
      issues.push(issue);
      console.log(`   ❌ ${issue}`);
    } else {
      const connectionCount = Object.keys(workflow.connections).length;
      console.log(`   ✅ ${connectionCount} connexion(s) trouvée(s)`);
    }
    console.log('');

    // 4. Vérifier les nœuds webhook et leurs connexions
    console.log('4️⃣ Vérification des nœuds webhook et de leurs connexions...');
    const webhookNodes = workflow.nodes?.filter(n => n.type === 'n8n-nodes-base.webhook') || [];
    if (webhookNodes.length > 0) {
      console.log(`   - ${webhookNodes.length} nœud(s) webhook trouvé(s)`);
      
      webhookNodes.forEach((node, idx) => {
        console.log(`   ${idx + 1}. "${node.name}"`);
        
        const path = node.parameters?.path;
        if (!path || path === '') {
          const issue = `Nœud "${node.name}" (Webhook): Le paramètre "Path" est requis mais n'est pas configuré.`;
          issues.push(issue);
          console.log(`      ❌ ${issue}`);
          console.log(`      💡 Solution: Configurez le paramètre "Path" dans le nœud webhook`);
        } else {
          console.log(`      ✅ Path configuré: ${path}`);
        }
        
        // Vérifier le paramètre "Respond"
        const respondMode = node.parameters?.respondWith || node.parameters?.options?.responseMode || 'immediately';
        console.log(`      - Respond: ${respondMode}`);
        
        // Vérifier les connexions sortantes du webhook
        const webhookConnections = workflow.connections?.[node.name];
        if (!webhookConnections || Object.keys(webhookConnections).length === 0) {
          const issue = `Nœud "${node.name}" (Webhook): Aucune connexion sortante - le webhook n'est connecté à aucun nœud.`;
          issues.push(issue);
          console.log(`      ❌ ${issue}`);
          console.log(`      💡 Solution: Connectez le webhook à au moins un nœud dans n8n`);
        } else {
          console.log(`      ✅ Connexions sortantes: ${Object.keys(webhookConnections).length}`);
          
          // Vérifier les nœuds connectés directement au webhook
          const connectedNodeNames = Object.keys(webhookConnections);
          console.log(`      - Nœuds connectés: ${connectedNodeNames.join(', ')}`);
          
          // Vérifier chaque nœud connecté directement
          connectedNodeNames.forEach(connectedNodeName => {
            const connectedNode = workflow.nodes?.find(n => n.name === connectedNodeName);
            if (connectedNode) {
              console.log(`         → "${connectedNodeName}" (${connectedNode.type})`);
              
              // Vérifier si ce nœud a des paramètres requis manquants
              if (connectedNode.type === 'n8n-nodes-base.microsoftOutlook') {
                if (connectedNode.parameters?.resource === 'folderMessage') {
                  const folderId = connectedNode.parameters?.folderId;
                  const folderIdValue = typeof folderId === 'object' ? folderId?.value : folderId;
                  
                  // Si le folderId est vide ET n'est pas une expression (ne commence pas par {{)
                  if (!folderId || (folderIdValue === '' && !String(folderId).includes('{{'))) {
                    const issue = `Nœud "${connectedNodeName}" (premier nœud après webhook): Le paramètre "Folder" est requis mais n'est pas configuré.`;
                    issues.push(issue);
                    console.log(`            ❌ ${issue}`);
                    console.log(`            💡 Solution: Configurez le paramètre "Folder" dans ce nœud`);
                  }
                }
              }
            }
          });
        }
        
        console.log('');
      });
    } else {
      console.log('   - Aucun nœud webhook trouvé');
    }
    console.log('');

    // 5. Résumé
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
      console.log('   ✅ Aucun problème de validation détecté');
      console.log('   💡 Si le workflow ne s\'exécute toujours pas, vérifiez les logs n8n pour plus de détails');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error.message);
    console.error(error.stack);
  }
}

// Exécuter le script
const n8nWorkflowId = process.argv[2];

if (!n8nWorkflowId) {
  console.error('❌ Usage: node backend/scripts/validate-workflow.js <n8nWorkflowId>');
  process.exit(1);
}

validateWorkflowDetailed(n8nWorkflowId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });

