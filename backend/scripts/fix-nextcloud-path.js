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
    console.log('🔧 Correction du template Nextcloud...\n');
    
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
    
    // 2. Corriger les noeuds
    let modified = false;
    
    workflow.nodes = workflow.nodes.map(node => {
      // Corriger Download File Nextcloud
      if (node.name === 'Download File Nextcloud' && node.type === 'n8n-nodes-base.nextCloud') {
        console.log('\n🔧 Correction noeud Download File Nextcloud');
        console.log('   Ancien path:', node.parameters.path);
        
        // Le noeud Nextcloud list retourne 'filename' pour le chemin complet
        // ou on peut utiliser le champ personnalisé du Loop
        node.parameters.path = '={{ $json.filename || $json.path || $json.href }}';
        
        console.log('   Nouveau path:', node.parameters.path);
        modified = true;
      }
      
      // Corriger Move/Rename File Nextcloud
      if (node.name === 'Move/Rename File Nextcloud' && node.type === 'n8n-nodes-base.nextCloud') {
        console.log('\n🔧 Correction noeud Move/Rename File Nextcloud');
        console.log('   Ancien path:', node.parameters.path);
        
        node.parameters.path = '={{ $json.sourcePath || $json.filename || $json.path }}';
        
        console.log('   Nouveau path:', node.parameters.path);
        modified = true;
      }
      
      return node;
    });
    
    if (!modified) {
      console.log('\n⚠️  Aucune modification nécessaire');
      return;
    }
    
    // 3. Sauvegarder le template
    console.log('\n💾 Sauvegarde du template...');
    await pool.query(
      'UPDATE templates SET json = $1 WHERE id = $2',
      [JSON.stringify(workflow), TEMPLATE_ID]
    );
    
    console.log('✅ Template mis à jour!');
    console.log('\n⚠️  Tu dois REDÉPLOYER le workflow depuis l\'application pour appliquer les changements!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
})();

