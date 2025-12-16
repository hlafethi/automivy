require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../database');

const userId = '8c210030-7d0a-48ee-97d2-b74564b1efef';

async function listWorkflows() {
  try {
    const result = await db.query(
      'SELECT name, n8n_workflow_id FROM user_workflows WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    console.log('Workflows trouvés:');
    result.rows.forEach(row => {
      console.log(`  - ${row.name} (n8n ID: ${row.n8n_workflow_id})`);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  }
  
  process.exit();
}

listWorkflows();

