// Script de diagnostic pour comprendre pourquoi les credentials ne sont pas supprimés
const { Pool } = require('pg');
const config = require('../config');

const userEmail = 'user@heleam.com';

async function diagnoseCredentials() {
  const pool = new Pool(config.database);
  
  try {
    // Récupérer l'ID de l'utilisateur
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    if (userResult.rows.length === 0) {
      console.error(`❌ Utilisateur ${userEmail} non trouvé`);
      process.exit(1);
    }
    
    const userId = userResult.rows[0].id;
    const userIdShort = userId.replace(/-/g, '').substring(0, 8);
    console.log(`✅ Utilisateur trouvé: ${userEmail} (ID: ${userId})`);
    console.log(`   userIdShort: ${userIdShort}\n`);
    
    // Récupérer tous les workflows de l'utilisateur
    const workflowsResult = await pool.query(
      'SELECT * FROM user_workflows WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    console.log(`📋 Workflows dans la base de données: ${workflowsResult.rows.length}`);
    for (const wf of workflowsResult.rows) {
      console.log(`\n  ${workflowsResult.rows.indexOf(wf) + 1}. ${wf.name} (ID: ${wf.id})`);
      console.log(`     - n8n_workflow_id: ${wf.n8n_workflow_id || 'N/A'}`);
      
      // Récupérer les credentials stockés pour ce workflow
      const credResult = await pool.query(
        'SELECT * FROM workflow_credentials WHERE user_workflow_id = $1',
        [wf.id]
      );
      console.log(`     - Credentials stockés: ${credResult.rows.length}`);
      credResult.rows.forEach(cred => {
        console.log(`       * ${cred.credential_name || cred.credential_id} (${cred.credential_id})`);
      });
    }
    
    // Récupérer tous les workflows depuis n8n
    const n8nUrl = config.n8n.url;
    const n8nApiKey = config.n8n.apiKey;
    
    console.log(`\n🔍 Récupération des workflows depuis n8n...`);
    const workflowsResponse = await fetch(`${n8nUrl}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey,
      },
    });
    
    if (!workflowsResponse.ok) {
      console.error(`❌ Erreur récupération workflows: ${workflowsResponse.status}`);
      process.exit(1);
    }
    
    const workflowsData = await workflowsResponse.json();
    const allWorkflows = Array.isArray(workflowsData) ? workflowsData : (workflowsData.data || []);
    
    console.log(`✅ ${allWorkflows.length} workflow(s) trouvé(s) dans n8n\n`);
    
    // Identifier tous les credentials utilisés par cet utilisateur
    const allUserCredentialIds = new Set();
    const credentialToWorkflowMap = new Map(); // Map<credentialId, [workflowNames]>
    
    allWorkflows.forEach(wf => {
      const workflowNameLower = wf.name?.toLowerCase() || '';
      const belongsToUser = workflowNameLower.includes(userIdShort.toLowerCase()) || 
                           workflowNameLower.includes(userEmail.toLowerCase());
      
      if (belongsToUser && wf.nodes) {
        wf.nodes.forEach(node => {
          if (node.credentials) {
            Object.values(node.credentials).forEach(cred => {
              if (cred && cred.id) {
                allUserCredentialIds.add(cred.id);
                if (!credentialToWorkflowMap.has(cred.id)) {
                  credentialToWorkflowMap.set(cred.id, []);
                }
                credentialToWorkflowMap.get(cred.id).push({
                  workflowId: wf.id,
                  workflowName: wf.name
                });
              }
            });
          }
        });
      }
    });
    
    console.log(`📊 ${allUserCredentialIds.size} credential ID(s) unique(s) utilisé(s) par l'utilisateur\n`);
    
    // Afficher chaque credential et dans quels workflows il est utilisé
    console.log(`📋 Détails des credentials:\n`);
    let credentialIndex = 1;
    for (const credId of allUserCredentialIds) {
      const workflows = credentialToWorkflowMap.get(credId);
      console.log(`${credentialIndex}. Credential ID: ${credId}`);
      console.log(`   - Utilisé dans ${workflows.length} workflow(s):`);
      workflows.forEach(wf => {
        console.log(`     * ${wf.workflowName} (${wf.workflowId})`);
      });
      
      // Vérifier si ce credential est dans la base de données
      const credInDb = await pool.query(
        'SELECT * FROM workflow_credentials WHERE credential_id = $1',
        [credId]
      );
      
      if (credInDb.rows.length > 0) {
        console.log(`   - ✅ Stocké dans la base de données (${credInDb.rows.length} entrée(s))`);
        credInDb.rows.forEach(cred => {
          console.log(`     * Workflow ID: ${cred.user_workflow_id}, Nom: ${cred.credential_name || 'N/A'}`);
        });
      } else {
        console.log(`   - ⚠️  NON stocké dans la base de données`);
      }
      
      // Vérifier si c'est un credential admin
      const workflowsUsingCred = workflows.map(w => w.workflowName).join(', ');
      const isAdmin = workflowsUsingCred.toLowerCase().includes('admin') || 
                     workflowsUsingCred.toLowerCase().includes('openrouter');
      
      if (isAdmin) {
        console.log(`   - ⚠️  Identifié comme credential admin (ne sera pas supprimé)`);
      } else if (workflows.length > 1) {
        console.log(`   - ⚠️  Utilisé dans ${workflows.length} workflow(s) (ne sera pas supprimé si un autre workflow est actif)`);
      } else {
        console.log(`   - ✅ DEVRAIT ÊTRE SUPPRIMÉ si le workflow est supprimé`);
      }
      
      console.log('');
      credentialIndex++;
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

diagnoseCredentials();

