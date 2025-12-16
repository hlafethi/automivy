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
    console.log('🔧 Correction du noeud Move dans le template...\n');
    
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
    
    // Corriger le noeud Move/Rename
    workflow.nodes = workflow.nodes.map(node => {
      if (node.name === 'Move/Rename File Nextcloud' ||
          (node.type === 'n8n-nodes-base.nextCloud' && 
           (node.parameters?.operation === 'move' || node.parameters?.operation === 'rename'))) {
        
        console.log('\n✏️  Correction Move/Rename File Nextcloud');
        console.log('   Avant:', JSON.stringify(node.parameters, null, 2));
        
        // Le noeud Nextcloud "move" utilise:
        // - path: chemin source
        // - newPath: nouveau chemin (destination)
        node.parameters = {
          resource: 'file',
          operation: 'move',
          path: '={{ $json.sourcePath || $json.originalFilename || $json.filename }}',
          newPath: '={{ $json.newPath || $json.destinationPath || "/Triés/" + $json.newFilename }}'
        };
        
        console.log('   Après:', JSON.stringify(node.parameters, null, 2));
      }
      
      return node;
    });
    
    // Sauvegarder
    console.log('\n💾 Sauvegarde...');
    await pool.query(
      'UPDATE templates SET json = $1 WHERE id = $2',
      [JSON.stringify(workflow), TEMPLATE_ID]
    );
    
    console.log('✅ Template corrigé!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
})();

