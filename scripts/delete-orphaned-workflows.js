import pg from 'pg';
import config from '../backend/config.js';

const { Pool } = pg;
const pool = new Pool(config.database);

async function deleteOrphanedWorkflows() {
  const client = await pool.connect();
  try {
    console.log('🧹 Suppression des workflows orphelins...');
    
    await client.query('BEGIN');
    await client.query('SET LOCAL row_security = off');
    
    // Récupérer tous les workflows de l'utilisateur
    const userId = '8c210030-7d0a-48ee-97d2-b74564b1efef'; // user@heleam.com
    const workflowsResult = await client.query(
      'SELECT id, name, n8n_workflow_id FROM user_workflows WHERE user_id = $1',
      [userId]
    );
    
    console.log(`📋 ${workflowsResult.rows.length} workflow(s) trouvé(s)`);
    
    let deletedCount = 0;
    
    for (const workflow of workflowsResult.rows) {
      try {
        console.log(`\n🔧 Suppression workflow: ${workflow.name} (${workflow.id})`);
        
        // Utiliser SAVEPOINT pour chaque workflow
        await client.query('SAVEPOINT before_delete_workflow');
        
        // Supprimer les exécutions si la table existe
        // La contrainte utilise user_workflow_id, pas n8n_workflow_id
        try {
          await client.query('SAVEPOINT before_delete_executions');
          const deleteExecutionsResult = await client.query(
            'DELETE FROM workflow_executions WHERE user_workflow_id = $1',
            [workflow.id]
          );
          await client.query('RELEASE SAVEPOINT before_delete_executions');
          console.log(`  🧹 ${deleteExecutionsResult.rowCount} exécution(s) supprimée(s)`);
        } catch (execError) {
          await client.query('ROLLBACK TO SAVEPOINT before_delete_executions');
          if (execError.code === '42P01' || execError.message.includes('does not exist')) {
            console.log('  ℹ️ Table workflow_executions n\'existe pas');
          } else {
            console.warn(`  ⚠️ Erreur suppression executions: ${execError.message}`);
          }
        }
        
        // Supprimer le workflow
        const deleteResult = await client.query(
          'DELETE FROM user_workflows WHERE id = $1 RETURNING *',
          [workflow.id]
        );
        
        if (deleteResult.rows.length > 0) {
          await client.query('RELEASE SAVEPOINT before_delete_workflow');
          deletedCount++;
          console.log(`  ✅ Workflow supprimé`);
        } else {
          await client.query('ROLLBACK TO SAVEPOINT before_delete_workflow');
          console.log(`  ⚠️ Workflow non trouvé`);
        }
        
      } catch (workflowError) {
        await client.query('ROLLBACK TO SAVEPOINT before_delete_workflow');
        console.error(`  ❌ Erreur suppression workflow ${workflow.id}:`, workflowError.message);
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ ${deletedCount} workflow(s) supprimé(s) sur ${workflowsResult.rows.length}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

deleteOrphanedWorkflows()
  .then(() => {
    console.log('✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur script:', error);
    process.exit(1);
  });

