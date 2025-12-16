require('dotenv').config();
const db = require('../database');

async function findMcpTemplate() {
  try {
    const result = await db.query(
      'SELECT id, name, description FROM templates WHERE name ILIKE $1 OR description ILIKE $2',
      ['%mcp%', '%mcp%']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Aucun template MCP trouvé');
      return;
    }
    
    console.log('✅ Templates MCP trouvés:');
    result.rows.forEach((template, index) => {
      console.log(`\n${index + 1}. ${template.name}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   Description: ${template.description || 'Aucune'}`);
    });
    
    // Récupérer le JSON du premier template
    if (result.rows.length > 0) {
      const templateId = result.rows[0].id;
      const templateResult = await db.query('SELECT json FROM templates WHERE id = $1', [templateId]);
      if (templateResult.rows[0]) {
        const workflowJson = typeof templateResult.rows[0].json === 'string' 
          ? JSON.parse(templateResult.rows[0].json) 
          : templateResult.rows[0].json;
        
        console.log('\n📋 Analyse du workflow:');
        console.log(`   Nombre de nœuds: ${workflowJson.nodes?.length || 0}`);
        
        // Analyser les types de nœuds
        const nodeTypes = {};
        workflowJson.nodes?.forEach(node => {
          nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
        });
        
        console.log('\n🔍 Types de nœuds:');
        Object.entries(nodeTypes).forEach(([type, count]) => {
          console.log(`   - ${type}: ${count}`);
        });
        
        // Analyser les credentials nécessaires
        const credentialsNeeded = new Set();
        workflowJson.nodes?.forEach(node => {
          if (node.credentials) {
            Object.keys(node.credentials).forEach(credType => {
              credentialsNeeded.add(credType);
            });
          }
        });
        
        console.log('\n🔐 Credentials détectés dans le workflow:');
        if (credentialsNeeded.size === 0) {
          console.log('   Aucun credential détecté');
        } else {
          Array.from(credentialsNeeded).forEach(cred => {
            console.log(`   - ${cred}`);
          });
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

findMcpTemplate();

