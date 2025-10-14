/**
 * Vérifier le n8nWorkflowId dans la base de données
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'automivy',
  user: 'postgres',
  password: 'postgres',
  ssl: false
});

async function checkWorkflowN8nId() {
  try {
    console.log('🔍 Vérification du n8nWorkflowId dans la base de données...');
    
    const result = await pool.query(`
      SELECT 
        id,
        name,
        n8n_workflow_id,
        is_active,
        schedule,
        created_at
      FROM user_workflows 
      WHERE user_id = '8c210030-7d0a-48ee-97d2-b74564b1efef'
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 ${result.rows.length} workflows trouvés:`);
    result.rows.forEach((workflow, index) => {
      console.log(`\n${index + 1}. Workflow:`);
      console.log(`   ID: ${workflow.id}`);
      console.log(`   Name: ${workflow.name}`);
      console.log(`   n8n_workflow_id: ${workflow.n8n_workflow_id || 'NULL'}`);
      console.log(`   is_active: ${workflow.is_active}`);
      console.log(`   schedule: ${workflow.schedule || 'NULL'}`);
      console.log(`   created_at: ${workflow.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
  }
}

checkWorkflowN8nId();
