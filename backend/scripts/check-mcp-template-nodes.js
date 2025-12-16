require('dotenv').config();
const db = require('../database');

const TEMPLATE_ID = '5916c2c3-d2f8-4895-8165-5048b367d16a';

(async () => {
  try {
    const result = await db.query('SELECT json FROM templates WHERE id = $1', [TEMPLATE_ID]);
    
    if (result.rows.length === 0) {
      console.log('❌ Template non trouvé');
      return;
    }
    
    const workflow = typeof result.rows[0].json === 'string' 
      ? JSON.parse(result.rows[0].json) 
      : result.rows[0].json;
    
    console.log('📋 Nœuds du workflow:\n');
    workflow.nodes.forEach((node, i) => {
      console.log(`${i + 1}. ${node.name}`);
      console.log(`   Type: ${node.type}`);
      if (node.credentials) {
        console.log(`   Credentials: ${JSON.stringify(Object.keys(node.credentials))}`);
        Object.entries(node.credentials).forEach(([key, value]) => {
          console.log(`     - ${key}: ${JSON.stringify(value)}`);
        });
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    process.exit(0);
  }
})();

