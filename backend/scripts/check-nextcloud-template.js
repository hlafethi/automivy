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

(async () => {
  try {
    console.log('🔍 Vérification du template Nextcloud...\n');
    
    const result = await pool.query(`
      SELECT id, name, json 
      FROM templates 
      WHERE name ILIKE '%nextcloud%'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Aucun template Nextcloud trouvé');
      return;
    }
    
    const template = result.rows[0];
    console.log('📋 Template:', template.name);
    console.log('   ID:', template.id);
    
    const workflow = typeof template.json === 'string' 
      ? JSON.parse(template.json) 
      : template.json;
    
    console.log('\n📦 Noeuds du workflow:');
    workflow.nodes?.forEach((node, i) => {
      console.log(`\n${i + 1}. ${node.name} (${node.type})`);
      
      if (node.type === 'n8n-nodes-base.nextCloud') {
        console.log('   Operation:', node.parameters?.operation);
        console.log('   Resource:', node.parameters?.resource);
        if (node.parameters?.path) {
          console.log('   Path:', node.parameters.path);
        }
      }
      
      if (node.type === 'n8n-nodes-base.splitInBatches') {
        console.log('   Options:', JSON.stringify(node.parameters));
      }
    });
    
    // Chercher le noeud Download File
    const downloadNode = workflow.nodes?.find(n => 
      n.name?.toLowerCase().includes('download') && 
      n.type === 'n8n-nodes-base.nextCloud'
    );
    
    if (downloadNode) {
      console.log('\n🔍 Configuration du noeud Download:');
      console.log(JSON.stringify(downloadNode.parameters, null, 2));
    }
    
    // Chercher le noeud Loop Over Files
    const loopNode = workflow.nodes?.find(n => 
      n.type === 'n8n-nodes-base.splitInBatches' ||
      n.name?.toLowerCase().includes('loop')
    );
    
    if (loopNode) {
      console.log('\n🔍 Configuration du noeud Loop:');
      console.log(JSON.stringify(loopNode.parameters, null, 2));
    }
    
    // Afficher les connexions
    console.log('\n🔗 Connexions:');
    Object.entries(workflow.connections || {}).forEach(([nodeName, conns]) => {
      console.log(`   ${nodeName} →`, JSON.stringify(conns.main?.[0]?.map(c => c.node)));
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
})();

