/**
 * Script pour tester l'exécution d'un workflow n8n et récupérer l'erreur exacte
 * Usage: node backend/scripts/test-workflow-execution.js <n8nWorkflowId>
 */

const fetch = require('node-fetch');
const config = require('../config');

async function testWorkflowExecution(n8nWorkflowId) {
  console.log('🧪 Test d\'exécution du workflow:', n8nWorkflowId);
  console.log('');

  try {
    // 1. Récupérer le workflow pour obtenir le webhook path
    console.log('1️⃣ Récupération du workflow...');
    const workflowResponse = await fetch(`${config.n8n.url}/api/v1/workflows/${n8nWorkflowId}`, {
      headers: { 'X-N8N-API-KEY': config.n8n.apiKey }
    });

    if (!workflowResponse.ok) {
      console.error(`❌ Erreur ${workflowResponse.status}: Impossible de récupérer le workflow`);
      return;
    }

    const workflow = await workflowResponse.json();
    console.log(`✅ Workflow: "${workflow.name}"`);
    console.log(`   - Actif: ${workflow.active ? '✅ OUI' : '❌ NON'}`);
    console.log('');

    // 2. Trouver le nœud webhook
    const webhookNode = workflow.nodes?.find(node => 
      node.type === 'n8n-nodes-base.webhook' || 
      node.type === 'n8n-nodes-base.webhookTrigger'
    );

    if (!webhookNode) {
      console.error('❌ Aucun nœud webhook trouvé');
      return;
    }

    const webhookPath = webhookNode.parameters?.path || webhookNode.parameters?.path?.value;
    if (!webhookPath) {
      console.error('❌ Path du webhook non configuré');
      return;
    }

    const webhookUrl = `${config.n8n.url}/webhook/${webhookPath}`;
    console.log(`2️⃣ Test du webhook: ${webhookUrl}`);
    console.log('');

    // 3. Déclencher le webhook
    console.log('3️⃣ Déclenchement du webhook...');
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test: true,
        timestamp: new Date().toISOString()
      })
    });

    console.log(`   - Status: ${webhookResponse.status} ${webhookResponse.statusText}`);
    
    const responseText = await webhookResponse.text();
    
    if (webhookResponse.ok) {
      console.log('   ✅ Webhook déclenché avec succès');
      if (responseText) {
        console.log(`   - Réponse: ${responseText.substring(0, 300)}`);
      }
    } else {
      console.log('   ❌ Webhook retourne une erreur');
      console.log(`   - Réponse: ${responseText.substring(0, 500)}`);
    }
    console.log('');

    // 4. Attendre que l'exécution se termine et récupérer les détails
    console.log('4️⃣ Attente de la fin de l\'exécution (max 30 secondes)...');
    
    let executionId = null;
    let executionFinished = false;
    let attempts = 0;
    const maxAttempts = 15; // 15 tentatives de 2 secondes = 30 secondes max
    
    while (attempts < maxAttempts && !executionFinished) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2 secondes
      attempts++;
      
      const executionsResponse = await fetch(`${config.n8n.url}/api/v1/executions?workflowId=${n8nWorkflowId}&limit=1`, {
        headers: { 'X-N8N-API-KEY': config.n8n.apiKey }
      });

      if (executionsResponse.ok) {
        const executionsData = await executionsResponse.json();
        const executions = executionsData.data || executionsData;

        if (executions && executions.length > 0) {
          const latestExecution = executions[0];
          
          if (!executionId) {
            executionId = latestExecution.id;
            console.log(`   ✅ Exécution trouvée: ${executionId}`);
          }
          
          if (latestExecution.finished || latestExecution.stoppedAt) {
            executionFinished = true;
            console.log(`   ✅ Exécution terminée après ${attempts * 2} secondes`);
            console.log('');
            
            // Récupérer les détails complets de l'exécution
            console.log('5️⃣ Récupération des détails de l\'exécution...');
            const executionDetailsResponse = await fetch(`${config.n8n.url}/api/v1/executions/${executionId}`, {
              headers: { 'X-N8N-API-KEY': config.n8n.apiKey }
            });
            
            if (executionDetailsResponse.ok) {
              const executionDetails = await executionDetailsResponse.json();
              const exec = executionDetails.data || executionDetails;
              
              console.log(`   - Début: ${new Date(exec.startedAt).toLocaleString()}`);
              console.log(`   - Fin: ${exec.stoppedAt ? new Date(exec.stoppedAt).toLocaleString() : 'Non terminée'}`);
              console.log(`   - Mode: ${exec.mode || 'N/A'}`);
              console.log(`   - Terminée: ${exec.finished ? 'Oui' : 'Non'}`);
              console.log('');

              // Analyser les erreurs
              if (exec.data && exec.data.resultData) {
                const resultData = exec.data.resultData;
                
                if (resultData.error) {
                  console.log('❌ ERREUR GLOBALE:');
                  console.log(`   - Message: ${resultData.error.message || 'Erreur inconnue'}`);
                  if (resultData.error.description) {
                    console.log(`   - Description: ${resultData.error.description}`);
                  }
                  if (resultData.error.stack) {
                    console.log(`   - Stack: ${resultData.error.stack.substring(0, 500)}...`);
                  }
                  console.log('');
                }

                // Vérifier les erreurs par nœud
                if (resultData.runData) {
                  console.log('6️⃣ Analyse des erreurs par nœud...');
                  let hasNodeErrors = false;
                  
                  for (const [nodeName, nodeRuns] of Object.entries(resultData.runData)) {
                    if (nodeRuns && Array.isArray(nodeRuns)) {
                      for (const run of nodeRuns) {
                        if (run.error) {
                          hasNodeErrors = true;
                          console.log(`❌ Nœud "${nodeName}":`);
                          console.log(`   - Erreur: ${run.error.message || 'Erreur inconnue'}`);
                          if (run.error.description) {
                            console.log(`   - Description: ${run.error.description}`);
                          }
                          if (run.error.stack) {
                            console.log(`   - Stack: ${run.error.stack.substring(0, 500)}...`);
                          }
                          console.log('');
                        }
                      }
                    }
                  }
                  
                  if (!hasNodeErrors && !resultData.error) {
                    console.log('   ✅ Aucune erreur détectée dans les nœuds');
                    console.log('   💡 Le workflow s\'est peut-être exécuté avec succès');
                  }
                } else {
                  console.log('   ⚠️  Aucune donnée runData disponible');
                }
              } else {
                console.log('   ⚠️  Aucune donnée de résultat disponible');
                console.log('   💡 L\'exécution est peut-être encore en cours ou a été interrompue');
              }
            } else {
              console.log(`   ⚠️  Impossible de récupérer les détails (${executionDetailsResponse.status})`);
            }
          } else {
            process.stdout.write(`   ⏳ Attente... (${attempts * 2}s)\r`);
          }
        }
      }
    }
    
    if (!executionFinished) {
      console.log('');
      console.log(`   ⚠️  L'exécution n'est pas terminée après ${maxAttempts * 2} secondes`);
      console.log('   💡 Vérifiez manuellement dans n8n l\'onglet "Executions"');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.error(error.stack);
  }
}

// Exécution
const n8nWorkflowId = process.argv[2];

if (!n8nWorkflowId) {
  console.error('❌ Usage: node backend/scripts/test-workflow-execution.js <n8nWorkflowId>');
  process.exit(1);
}

testWorkflowExecution(n8nWorkflowId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });

