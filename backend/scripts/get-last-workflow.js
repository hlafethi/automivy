/**
 * Script pour récupérer le dernier workflow LinkedIn déployé
 */

require('dotenv').config();
const db = require('../database');

async function getLastWorkflow() {
  try {
    const result = await db.query(`
      SELECT 
        uw.id,
        uw.name,
        uw.n8n_workflow_id,
        uw.created_at
      FROM user_workflows uw
      WHERE uw.name ILIKE '%linkedin%'
      ORDER BY uw.created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ Aucun workflow LinkedIn trouvé');
      return;
    }

    const workflow = result.rows[0];
    console.log('✅ Dernier workflow LinkedIn trouvé:');
    console.log(`   - ID BDD: ${workflow.id}`);
    console.log(`   - Nom: ${workflow.name}`);
    console.log(`   - ID n8n: ${workflow.n8n_workflow_id}`);
    console.log(`   - Créé le: ${workflow.created_at}`);
    console.log('');
    console.log(`💡 Pour vérifier les nœuds NocoDB, exécutez:`);
    console.log(`   node backend/scripts/check-nocodb-nodes.js ${workflow.n8n_workflow_id}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

getLastWorkflow();

