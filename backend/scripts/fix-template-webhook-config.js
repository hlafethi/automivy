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
    console.log('🔧 Correction de la configuration webhook dans le template Nextcloud...\n');
    
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
    
    // 2. Corriger le noeud webhook
    let modified = false;
    
    workflow.nodes = workflow.nodes.map(node => {
      if (node.type === 'n8n-nodes-base.webhook' || node.type === 'n8n-nodes-base.webhookTrigger') {
        console.log('\n🔧 Correction du noeud webhook:', node.name);
        console.log('   Avant:', JSON.stringify(node.parameters, null, 2));
        
        // Configuration correcte du webhook
        node.parameters = {
          ...node.parameters,
          path: 'file-sort',  // Path par défaut, sera remplacé par l'injecteur
          httpMethod: 'POST',
          responseMode: 'onReceived',  // IMPORTANT: pas 'responseNode'
          responseCode: 200,
          responseData: 'allEntries'
        };
        
        // TypeVersion 2 pour les nouvelles fonctionnalités
        node.typeVersion = 2;
        
        console.log('   Après:', JSON.stringify(node.parameters, null, 2));
        modified = true;
      }
      return node;
    });
    
    if (!modified) {
      console.log('\n⚠️  Aucun noeud webhook trouvé dans le template');
      return;
    }
    
    // 3. Sauvegarder
    console.log('\n💾 Sauvegarde du template...');
    await pool.query(
      'UPDATE templates SET json = $1 WHERE id = $2',
      [JSON.stringify(workflow), TEMPLATE_ID]
    );
    
    console.log('✅ Template corrigé!');
    console.log('\nLes futurs déploiements auront une configuration webhook correcte.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
})();

