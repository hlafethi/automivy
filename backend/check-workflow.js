const db = require('./database');

async function checkWorkflow() {
  try {
    console.log('🔍 Vérification du workflow dans la base de données...');
    
    const result = await db.query(
      'SELECT id, name, n8n_workflow_id, is_active, schedule FROM user_workflows WHERE user_id = $1',
      ['8c210030-7d0a-48ee-97d2-b74564b1efef']
    );
    
    console.log(`📊 ${result.rows.length} workflows trouvés:`);
    result.rows.forEach((workflow, index) => {
      console.log(`\n${index + 1}. Workflow:`);
      console.log(`   ID: ${workflow.id}`);
      console.log(`   Name: ${workflow.name}`);
      console.log(`   n8n_workflow_id: ${workflow.n8n_workflow_id || 'NULL'}`);
      console.log(`   is_active: ${workflow.is_active}`);
      console.log(`   schedule: ${workflow.schedule || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.end();
  }
}

checkWorkflow();
