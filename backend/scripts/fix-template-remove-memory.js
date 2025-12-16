require('dotenv').config();
const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password
});

const TEMPLATE_ID = '072a5103-ce01-44b8-b2da-fe9ba9637f6e';

(async () => {
  try {
    console.log('🔧 Suppression du noeud Buffer Window Memory du template...\n');
    
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [TEMPLATE_ID]);
    
    if (result.rows.length === 0) {
      console.log('❌ Template non trouvé');
      return;
    }
    
    const template = result.rows[0];
    const workflow = typeof template.json === 'string' 
      ? JSON.parse(template.json) 
      : template.json;
    
    console.log('📋 Template:', template.name);
    console.log('   Noeuds avant:', workflow.nodes?.length);
    
    // Trouver et supprimer le noeud Buffer Window Memory
    const memoryNodeIndex = workflow.nodes?.findIndex(n => 
      n.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow' ||
      n.name?.toLowerCase().includes('buffer window memory') ||
      n.name?.toLowerCase().includes('memory')
    );
    
    if (memoryNodeIndex >= 0) {
      const memoryNode = workflow.nodes[memoryNodeIndex];
      console.log('\n🗑️  Suppression du noeud:', memoryNode.name);
      
      // Supprimer le noeud
      workflow.nodes.splice(memoryNodeIndex, 1);
      
      // Supprimer les connexions
      for (const [nodeName, connections] of Object.entries(workflow.connections || {})) {
        if (connections.main) {
          connections.main = connections.main.map(connArray => 
            connArray ? connArray.filter(conn => conn.node !== memoryNode.name) : []
          );
        }
      }
      delete workflow.connections[memoryNode.name];
      
      console.log('   ✅ Noeud supprimé');
    }
    
    // Supprimer aussi le Calculator Tool (pas nécessaire pour le tri de fichiers)
    const calcNodeIndex = workflow.nodes?.findIndex(n => 
      n.type === '@n8n/n8n-nodes-langchain.toolCalculator' ||
      n.name?.toLowerCase().includes('calculator')
    );
    
    if (calcNodeIndex >= 0) {
      const calcNode = workflow.nodes[calcNodeIndex];
      console.log('\n🗑️  Suppression du noeud:', calcNode.name);
      workflow.nodes.splice(calcNodeIndex, 1);
      
      for (const [nodeName, connections] of Object.entries(workflow.connections || {})) {
        if (connections.main) {
          connections.main = connections.main.map(connArray => 
            connArray ? connArray.filter(conn => conn.node !== calcNode.name) : []
          );
        }
      }
      delete workflow.connections[calcNode.name];
      console.log('   ✅ Noeud supprimé');
    }
    
    console.log('\n   Noeuds après:', workflow.nodes?.length);
    
    // Lister les noeuds restants
    console.log('\n📦 Noeuds restants:');
    workflow.nodes?.forEach((node, i) => {
      console.log(`   ${i + 1}. ${node.name} (${node.type})`);
    });
    
    // Sauvegarder
    console.log('\n💾 Sauvegarde...');
    await pool.query(
      'UPDATE templates SET json = $1 WHERE id = $2',
      [JSON.stringify(workflow), TEMPLATE_ID]
    );
    
    console.log('✅ Template mis à jour!');
    console.log('\n⚠️  Pour appliquer au workflow actuel, supprime-le dans n8n et redéploie.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
})();

