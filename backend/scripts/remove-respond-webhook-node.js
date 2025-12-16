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
    console.log('🔧 Suppression du noeud "Respond to Webhook" du template...\n');
    
    // 1. Récupérer le template
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
    
    // 2. Trouver et supprimer le noeud Respond to Webhook
    const respondNodeIndex = workflow.nodes?.findIndex(n => 
      n.type === 'n8n-nodes-base.respondToWebhook' ||
      n.name?.toLowerCase().includes('respond to webhook')
    );
    
    if (respondNodeIndex >= 0) {
      const respondNode = workflow.nodes[respondNodeIndex];
      console.log('\n🗑️  Suppression du noeud:', respondNode.name);
      
      // Supprimer le noeud
      workflow.nodes.splice(respondNodeIndex, 1);
      
      // Supprimer les connexions vers ce noeud
      for (const [nodeName, connections] of Object.entries(workflow.connections || {})) {
        if (connections.main) {
          connections.main = connections.main.map(connArray => 
            connArray.filter(conn => conn.node !== respondNode.name)
          );
        }
      }
      
      // Supprimer les connexions depuis ce noeud
      delete workflow.connections[respondNode.name];
      
      console.log('   ✅ Noeud supprimé');
    } else {
      console.log('\n⚠️  Noeud "Respond to Webhook" non trouvé');
    }
    
    console.log('   Noeuds après:', workflow.nodes?.length);
    
    // 3. Lister les noeuds restants
    console.log('\n📦 Noeuds restants:');
    workflow.nodes?.forEach((node, i) => {
      console.log(`   ${i + 1}. ${node.name} (${node.type})`);
    });
    
    // 4. Sauvegarder
    console.log('\n💾 Sauvegarde du template...');
    await pool.query(
      'UPDATE templates SET json = $1 WHERE id = $2',
      [JSON.stringify(workflow), TEMPLATE_ID]
    );
    
    console.log('✅ Template mis à jour!');
    console.log('\n⚠️  IMPORTANT:');
    console.log('   1. Supprime le workflow actuel dans n8n');
    console.log('   2. Redéploie depuis l\'application');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
})();

