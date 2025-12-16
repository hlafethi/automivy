/**
 * Script de diagnostic pour vérifier les erreurs dans un workflow n8n
 * Usage: node backend/scripts/diagnose-workflow-errors.js <n8nWorkflowId>
 */

const fetch = require('node-fetch');
const config = require('../config');

async function diagnoseWorkflowErrors(n8nWorkflowId) {
  console.log('🔍 Diagnostic des erreurs du workflow:', n8nWorkflowId);
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
    
    // Vérifier les problèmes de validation dans le workflow
    if (workflow.settings) {
      console.log(`   - Settings: ${JSON.stringify(workflow.settings).substring(0, 100)}...`);
    }
    
    // Vérifier si n8n a détecté des problèmes (propriété issues ou errors)
    if (workflow.issues || workflow.errors) {
      console.log('');
      console.log('❌ PROBLÈMES DÉTECTÉS PAR N8N:');
      if (workflow.issues) {
        console.log('   Issues:', JSON.stringify(workflow.issues, null, 2));
      }
      if (workflow.errors) {
        console.log('   Errors:', JSON.stringify(workflow.errors, null, 2));
      }
    }
    console.log('');

    // 2. Vérifier les nœuds pour des erreurs
    console.log('2️⃣ Vérification des nœuds...');
    if (!workflow.nodes || workflow.nodes.length === 0) {
      console.error('❌ Le workflow ne contient aucun nœud');
      return;
    }

    console.log(`   - Nombre de nœuds: ${workflow.nodes.length}`);
    
    const nodesWithErrors = [];
    const nodesWithoutCredentials = [];
    const nodesWithInvalidConfig = [];

    for (const node of workflow.nodes) {
      // Vérifier les erreurs de configuration
      if (node.disabled) {
        console.log(`   ⚠️  Nœud désactivé: "${node.name}" (${node.type})`);
      }

      // Vérifier les credentials manquants
      if (node.credentials) {
        for (const [credType, credData] of Object.entries(node.credentials)) {
          if (!credData || !credData.id) {
            nodesWithoutCredentials.push({ node: node.name, type: node.type, credentialType: credType });
          }
        }
      }

      // Vérifier les paramètres requis manquants selon le type de nœud
      if (node.parameters) {
        // Webhook
        if (node.type === 'n8n-nodes-base.webhook' || node.type === 'n8n-nodes-base.webhookTrigger') {
          if (!node.parameters.path) {
            nodesWithInvalidConfig.push({ 
              node: node.name, 
              type: node.type, 
              issue: 'Path du webhook manquant' 
            });
          }
        }
        
        // HTTP Request
        if (node.type === 'n8n-nodes-base.httpRequest') {
          if (!node.parameters.url) {
            nodesWithInvalidConfig.push({ 
              node: node.name, 
              type: node.type, 
              issue: 'URL manquante' 
            });
          }
        }
        
        // Microsoft Outlook - Vérification détaillée
        if (node.type === 'n8n-nodes-base.microsoftOutlook') {
          if (node.parameters.resource === 'folderMessage') {
            const folderId = node.parameters.folderId;
            const isFolderIdEmpty = !folderId || 
                                   (typeof folderId === 'object' && (!folderId.value || folderId.value === '')) ||
                                   (typeof folderId === 'string' && folderId === '');
            
            if (isFolderIdEmpty) {
              nodesWithInvalidConfig.push({ 
                node: node.name, 
                type: node.type, 
                issue: 'folderId manquant ou vide - CRITIQUE pour Microsoft Outlook' 
              });
            }
          }
          
          if (!node.credentials?.microsoftOutlookOAuth2Api) {
            nodesWithoutCredentials.push({ 
              node: node.name, 
              type: node.type, 
              credentialType: 'microsoftOutlookOAuth2Api' 
            });
          }
        }
        
        // IMAP Email Read
        if (node.type === 'n8n-nodes-base.emailReadImap') {
          if (!node.parameters.mailbox) {
            nodesWithInvalidConfig.push({ 
              node: node.name, 
              type: node.type, 
              issue: 'Mailbox manquant' 
            });
          }
          if (!node.credentials?.imap) {
            nodesWithoutCredentials.push({ 
              node: node.name, 
              type: node.type, 
              credentialType: 'imap' 
            });
          }
        }
        
        // Email Send
        if (node.type === 'n8n-nodes-base.emailSend') {
          if (!node.parameters.toEmail) {
            nodesWithInvalidConfig.push({ 
              node: node.name, 
              type: node.type, 
              issue: 'Email destinataire manquant' 
            });
          }
          if (!node.credentials?.smtp) {
            nodesWithoutCredentials.push({ 
              node: node.name, 
              type: node.type, 
              credentialType: 'smtp' 
            });
          }
        }
      }
    }

    if (nodesWithoutCredentials.length > 0) {
      console.log('');
      console.log('❌ Nœuds avec credentials manquants:');
      nodesWithoutCredentials.forEach(({ node, type, credentialType }) => {
        console.log(`   - "${node}" (${type}): credential "${credentialType}" manquant`);
      });
    }

    if (nodesWithInvalidConfig.length > 0) {
      console.log('');
      console.log('❌ Nœuds avec configuration invalide:');
      nodesWithInvalidConfig.forEach(({ node, type, issue }) => {
        console.log(`   - "${node}" (${type}): ${issue}`);
      });
    }

    if (nodesWithoutCredentials.length === 0 && nodesWithInvalidConfig.length === 0) {
      console.log('   ✅ Aucune erreur de configuration détectée dans les nœuds');
    }

    console.log('');

    // 3. Vérifier les connexions
    console.log('3️⃣ Vérification des connexions...');
    if (!workflow.connections || Object.keys(workflow.connections).length === 0) {
      console.warn('   ⚠️  Le workflow ne contient aucune connexion entre les nœuds');
    } else {
      console.log(`   ✅ ${Object.keys(workflow.connections).length} nœud(s) avec connexions`);
    }
    console.log('');

    // 4. Vérifier l'état d'activation
    console.log('4️⃣ État d\'activation...');
    if (!workflow.active) {
      console.error('   ❌ Le workflow n\'est PAS ACTIF');
      console.log('   💡 Solution: Activez le workflow dans n8n (bouton ON)');
    } else {
      console.log('   ✅ Le workflow est actif');
    }
    console.log('');

    // 5. Tester le webhook si disponible
    console.log('5️⃣ Test du webhook (si disponible)...');
    const webhookNode = workflow.nodes?.find(node => 
      node.type === 'n8n-nodes-base.webhook' || 
      node.type === 'n8n-nodes-base.webhookTrigger'
    );

    if (webhookNode) {
      const webhookPath = webhookNode.parameters?.path || webhookNode.parameters?.path?.value;
      if (webhookPath) {
        const webhookUrl = `${config.n8n.url}/webhook/${webhookPath}`;
        const testWebhookUrl = `${config.n8n.url}/webhook-test/${webhookPath}`;
        
        console.log(`   - Path: ${webhookPath}`);
        console.log(`   - URL production: ${webhookUrl}`);
        console.log(`   - URL test: ${testWebhookUrl}`);
        
        // Tester l'URL de production
        try {
          const prodResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
          });
          
          if (prodResponse.ok) {
            console.log(`   ✅ Webhook de production accessible (${prodResponse.status})`);
          } else {
            console.log(`   ❌ Webhook de production retourne ${prodResponse.status}`);
            const errorText = await prodResponse.text().catch(() => '');
            if (errorText) {
              try {
                const errorJson = JSON.parse(errorText);
                console.log(`   - Message: ${errorJson.message || errorText}`);
                if (errorJson.hint) {
                  console.log(`   - Hint: ${errorJson.hint}`);
                }
              } catch (e) {
                console.log(`   - Erreur: ${errorText.substring(0, 200)}`);
              }
            }
          }
        } catch (error) {
          console.log(`   ❌ Erreur lors du test du webhook de production: ${error.message}`);
        }
        
        // Tester l'URL de test
        try {
          const testResponse = await fetch(testWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
          });
          
          if (testResponse.ok) {
            console.log(`   ✅ Webhook de test accessible (${testResponse.status})`);
          } else {
            console.log(`   ⚠️  Webhook de test retourne ${testResponse.status}`);
          }
        } catch (error) {
          console.log(`   ⚠️  Erreur lors du test du webhook de test: ${error.message}`);
        }
      } else {
        console.log('   ❌ Path du webhook non configuré');
      }
    } else {
      console.log('   ⚠️  Aucun nœud webhook trouvé');
    }
    console.log('');

    // 6. Vérifier les exécutions récentes pour détecter les erreurs d'exécution
    console.log('6️⃣ Vérification des exécutions récentes...');
    try {
      const executionsResponse = await fetch(`${config.n8n.url}/api/v1/executions?workflowId=${n8nWorkflowId}&limit=10`, {
        headers: { 'X-N8N-API-KEY': config.n8n.apiKey }
      });

      if (executionsResponse.ok) {
        const executionsData = await executionsResponse.json();
        const executions = executionsData.data || executionsData;

        if (executions && executions.length > 0) {
          console.log(`   - ${executions.length} exécution(s) récente(s) trouvée(s)`);
          
          const errorExecutions = [];
          const failedExecutions = [];

          for (const exec of executions) {
            // Vérifier les erreurs dans resultData
            if (exec.data && exec.data.resultData) {
              if (exec.data.resultData.error) {
                errorExecutions.push(exec);
              }
              // Vérifier les erreurs dans les nœuds individuels
              if (exec.data.resultData.runData) {
                for (const [nodeName, nodeRuns] of Object.entries(exec.data.resultData.runData)) {
                  if (nodeRuns && Array.isArray(nodeRuns)) {
                    for (const run of nodeRuns) {
                      if (run.error) {
                        errorExecutions.push({ ...exec, nodeError: { nodeName, error: run.error } });
                      }
                    }
                  }
                }
              }
            }
            
            // Vérifier les exécutions échouées
            if (exec.finished === false || exec.stoppedAt || exec.mode === 'error') {
              failedExecutions.push(exec);
            }
          }

          if (errorExecutions.length > 0) {
            console.log('');
            console.log('❌ Exécutions avec erreurs détectées:');
            const uniqueErrors = new Map();
            errorExecutions.slice(0, 5).forEach((exec, idx) => {
              const execDate = exec.startedAt ? new Date(exec.startedAt).toLocaleString() : 'Date inconnue';
              
              if (exec.nodeError) {
                const key = `${exec.nodeError.nodeName}-${exec.nodeError.error.message}`;
                if (!uniqueErrors.has(key)) {
                  uniqueErrors.set(key, exec.nodeError);
                  console.log(`   ${idx + 1}. Nœud "${exec.nodeError.nodeName}" - ${execDate}`);
                  console.log(`      - Erreur: ${exec.nodeError.error.message || 'Erreur inconnue'}`);
                  if (exec.nodeError.error.stack) {
                    console.log(`      - Détails: ${exec.nodeError.error.stack.substring(0, 200)}...`);
                  }
                }
              } else if (exec.data && exec.data.resultData && exec.data.resultData.error) {
                const error = exec.data.resultData.error;
                const key = `global-${error.message}`;
                if (!uniqueErrors.has(key)) {
                  uniqueErrors.set(key, error);
                  console.log(`   ${idx + 1}. Exécution globale - ${execDate}`);
                  console.log(`      - Erreur: ${error.message || 'Erreur inconnue'}`);
                  if (error.stack) {
                    console.log(`      - Détails: ${error.stack.substring(0, 200)}...`);
                  }
                }
              }
            });
          } else if (failedExecutions.length > 0) {
            console.log(`   ⚠️  ${failedExecutions.length} exécution(s) non terminée(s) détectée(s)`);
            failedExecutions.slice(0, 3).forEach((exec, idx) => {
              console.log(`   ${idx + 1}. Exécution du ${exec.startedAt ? new Date(exec.startedAt).toLocaleString() : 'Date inconnue'}`);
              console.log(`      - Statut: ${exec.mode || 'Inconnu'}`);
              console.log(`      - Terminée: ${exec.finished ? 'Oui' : 'Non'}`);
            });
          } else {
            console.log('   ✅ Aucune erreur dans les exécutions récentes');
          }
        } else {
          console.log('   ⚠️  Aucune exécution récente trouvée');
        }
      } else {
        console.log(`   ⚠️  Impossible de récupérer les exécutions (${executionsResponse.status})`);
      }
    } catch (execError) {
      console.log(`   ⚠️  Erreur lors de la vérification des exécutions: ${execError.message}`);
    }
    console.log('');

    // 7. Vérifier les paramètres spécifiques des nœuds Microsoft Outlook
    console.log('7️⃣ Vérification détaillée des nœuds Microsoft Outlook...');
    const outlookNodes = workflow.nodes?.filter(n => n.type === 'n8n-nodes-base.microsoftOutlook') || [];
    if (outlookNodes.length > 0) {
      console.log(`   - ${outlookNodes.length} nœud(s) Microsoft Outlook trouvé(s)`);
      let hasOutlookIssues = false;
      
      outlookNodes.forEach((node, idx) => {
        console.log(`   ${idx + 1}. "${node.name}"`);
        console.log(`      - Resource: ${node.parameters?.resource || 'NON DÉFINI'}`);
        console.log(`      - Operation: ${node.parameters?.operation || 'NON DÉFINI'}`);
        
        // Vérifier folderId pour folderMessage
        if (node.parameters?.resource === 'folderMessage') {
          const folderId = node.parameters?.folderId;
          const folderIdValue = typeof folderId === 'object' ? folderId?.value : folderId;
          
          if (!folderId || folderIdValue === '' || folderIdValue === null || folderIdValue === undefined) {
            hasOutlookIssues = true;
            console.log(`      ❌ folderId manquant ou vide - C'EST PROBABLEMENT LA CAUSE DE L'ERREUR !`);
            console.log(`      💡 Solution: Ouvrez ce nœud dans n8n et sélectionnez un dossier dans le paramètre "Folder"`);
            console.log(`      💡 Si le dossier doit être dynamique, utilisez une expression comme {{ $json.folderId }}`);
          } else {
            console.log(`      ✅ folderId configuré: ${folderIdValue}`);
          }
        }
        
        // Vérifier mailbox pour folderMessage
        if (node.parameters?.resource === 'folderMessage' && node.parameters?.operation === 'getAll') {
          const mailbox = node.parameters?.mailbox;
          if (!mailbox || mailbox === '') {
            hasOutlookIssues = true;
            console.log(`      ❌ Mailbox manquant`);
            console.log(`      💡 Solution: Configurez le paramètre "Mailbox" dans le nœud`);
          }
        }
        
        // Vérifier les credentials
        if (!node.credentials?.microsoftOutlookOAuth2Api) {
          hasOutlookIssues = true;
          console.log(`      ❌ Credential Microsoft Outlook OAuth2 manquant`);
          console.log(`      💡 Solution: Assignez un credential Microsoft Outlook OAuth2 à ce nœud`);
        } else {
          console.log(`      ✅ Credential présent (ID: ${node.credentials.microsoftOutlookOAuth2Api.id})`);
        }
        
        console.log('');
      });
      
      if (hasOutlookIssues) {
        console.log('⚠️  PROBLÈMES DÉTECTÉS DANS LES NŒUDS MICROSOFT OUTLOOK');
        console.log('   Ces problèmes empêchent l\'exécution du workflow');
        console.log('');
      }
    } else {
      console.log('   ⚠️  Aucun nœud Microsoft Outlook trouvé');
    }
    console.log('');

    // 7. Résumé
    console.log('📊 Résumé:');
    const hasErrors = nodesWithoutCredentials.length > 0 || 
                     nodesWithInvalidConfig.length > 0 || 
                     !workflow.active;
    
    if (hasErrors) {
      console.log('   ❌ Le workflow présente des problèmes qui empêchent son exécution');
      console.log('');
      console.log('🔧 Actions recommandées:');
      if (!workflow.active) {
        console.log('   1. Activez le workflow dans n8n (bouton ON)');
      }
      if (nodesWithoutCredentials.length > 0) {
        console.log('   2. Configurez les credentials manquants dans les nœuds concernés');
      }
      if (nodesWithInvalidConfig.length > 0) {
        console.log('   3. Corrigez la configuration des nœuds concernés');
      }
      console.log('   4. Sauvegardez le workflow');
      console.log('   5. Réactivez le workflow si nécessaire');
    } else {
      console.log('   ✅ Aucun problème détecté dans la configuration du workflow');
      console.log('   ✅ Le webhook de production est accessible');
      console.log('');
      console.log('💡 Si le workflow ne s\'exécute toujours pas:');
      console.log('   1. Vérifiez les exécutions récentes dans n8n (onglet "Executions")');
      console.log('   2. Vérifiez les logs n8n pour plus de détails');
      console.log('   3. Testez manuellement le webhook dans n8n');
      console.log('   4. Vérifiez que tous les nœuds ont les bonnes valeurs de paramètres');
    }

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
    console.error(error.stack);
  }
}

// Exécution
const n8nWorkflowId = process.argv[2];

if (!n8nWorkflowId) {
  console.error('❌ Usage: node backend/scripts/diagnose-workflow-errors.js <n8nWorkflowId>');
  process.exit(1);
}

diagnoseWorkflowErrors(n8nWorkflowId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });

