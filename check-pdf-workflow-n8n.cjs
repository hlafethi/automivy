const { Pool } = require('pg');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const config = require('./backend/config');

const pool = new Pool(config.database);

async function checkPDFWorkflowInN8n() {
  console.log('🔍 [Check PDF Workflow] Vérification du workflow PDF Analysis dans n8n...\n');
  
  try {
    // 1. Chercher le workflow dans la base de données
    console.log('📊 [Check PDF Workflow] Recherche dans la base de données...');
    const templateId = '132d04c8-e36a-4dbd-abac-21fa8280650e'; // PDF Analysis Complete template ID
    
    const dbResult = await pool.query(
      `SELECT id, name, user_id, template_id, n8n_workflow_id, webhook_path, is_active, created_at 
       FROM user_workflows 
       WHERE template_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [templateId]
    );
    
    if (dbResult.rows.length === 0) {
      console.log('❌ [Check PDF Workflow] Aucun workflow trouvé dans la BDD pour ce template');
      return;
    }
    
    console.log(`✅ [Check PDF Workflow] ${dbResult.rows.length} workflow(s) trouvé(s) dans la BDD:\n`);
    
    for (const workflow of dbResult.rows) {
      console.log(`📦 Workflow: ${workflow.name}`);
      console.log(`   - ID BDD: ${workflow.id}`);
      console.log(`   - User ID: ${workflow.user_id}`);
      console.log(`   - Actif en BDD: ${workflow.is_active ? '✅ OUI' : '❌ NON'}`);
      console.log(`   - n8n Workflow ID: ${workflow.n8n_workflow_id || '❌ NON DÉFINI'}`);
      console.log(`   - Webhook Path: ${workflow.webhook_path || '❌ NON DÉFINI'}`);
      console.log(`   - Créé le: ${workflow.created_at}`);
      
      // 2. Vérifier dans n8n si le workflow existe et est actif
      if (workflow.n8n_workflow_id) {
        console.log(`\n🔍 [Check PDF Workflow] Vérification dans n8n (ID: ${workflow.n8n_workflow_id})...`);
        
        try {
          const n8nBaseUrl = config.n8n.url || 'https://n8n.globalsaas.eu';
          const n8nApiKey = config.n8n.apiKey;
          
          const n8nResponse = await fetch(`${n8nBaseUrl}/api/v1/workflows/${workflow.n8n_workflow_id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': n8nApiKey
            }
          });
          
          if (n8nResponse.ok) {
            const n8nWorkflow = await n8nResponse.json();
            console.log(`   ✅ Workflow trouvé dans n8n:`);
            console.log(`      - Nom: ${n8nWorkflow.name}`);
            console.log(`      - Actif: ${n8nWorkflow.active ? '✅ OUI' : '❌ NON'}`);
            console.log(`      - Créé: ${n8nWorkflow.createdAt}`);
            console.log(`      - Modifié: ${n8nWorkflow.updatedAt}`);
            
            // Vérifier le webhook
            const webhookNode = n8nWorkflow.nodes?.find(node => 
              node.type === 'n8n-nodes-base.webhook' || 
              node.type === 'n8n-nodes-base.webhookTrigger'
            );
            
            if (webhookNode) {
              const webhookPath = webhookNode.parameters?.path || webhookNode.webhookId;
              console.log(`      - Webhook Node: ${webhookNode.name}`);
              console.log(`      - Webhook Path: ${webhookPath || '❌ NON DÉFINI'}`);
              console.log(`      - Webhook URL: ${n8nBaseUrl}/webhook/${webhookPath || 'NON DÉFINI'}`);
              
              if (webhookPath && workflow.webhook_path && webhookPath !== workflow.webhook_path) {
                console.log(`      ⚠️ ATTENTION: Le webhook path en BDD (${workflow.webhook_path}) ne correspond pas à celui dans n8n (${webhookPath})`);
              }
            } else {
              console.log(`      ❌ Aucun nœud webhook trouvé dans le workflow`);
            }
            
            // Vérifier si le workflow est actif
            if (!n8nWorkflow.active) {
              console.log(`\n   ⚠️ [Check PDF Workflow] Le workflow est INACTIF dans n8n !`);
              console.log(`   💡 Solution: Activez le workflow dans n8n pour que le webhook fonctionne.`);
            } else {
              console.log(`\n   ✅ [Check PDF Workflow] Le workflow est ACTIF dans n8n - Le webhook devrait fonctionner !`);
            }
            
          } else {
            const errorText = await n8nResponse.text();
            console.log(`   ❌ Workflow NON TROUVÉ dans n8n (${n8nResponse.status}):`);
            console.log(`      ${errorText}`);
          }
        } catch (n8nError) {
          console.log(`   ❌ Erreur lors de la vérification dans n8n: ${n8nError.message}`);
        }
      } else {
        console.log(`\n   ⚠️ [Check PDF Workflow] Pas d'ID n8n - Le workflow n'a peut-être pas été déployé dans n8n`);
      }
      
      console.log('\n' + '='.repeat(60) + '\n');
    }
    
  } catch (error) {
    console.error('❌ [Check PDF Workflow] Erreur:', error);
  } finally {
    await pool.end();
  }
}

checkPDFWorkflowInN8n();

