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
    console.log('🔧 Correction complète du template Nextcloud...\n');
    
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
    console.log('\n📦 Noeuds actuels:');
    
    workflow.nodes.forEach((node, i) => {
      console.log(`\n${i + 1}. ${node.name} (${node.type})`);
      if (node.parameters?.path) {
        console.log(`   Path: ${node.parameters.path}`);
      }
    });
    
    // 2. Corriger les noeuds
    console.log('\n\n🔧 CORRECTIONS:');
    
    workflow.nodes = workflow.nodes.map(node => {
      // Corriger List Files Nextcloud - doit utiliser le dossier du webhook
      if (node.name === 'List Files Nextcloud' && node.type === 'n8n-nodes-base.nextCloud') {
        console.log('\n✏️  List Files Nextcloud:');
        console.log('   Ancien path:', node.parameters.path);
        
        // Le path doit venir du noeud précédent (Set Target Folder ou Webhook)
        node.parameters.path = '={{ $json.targetFolder || $json.body?.folders?.[0] || $json.folders?.[0] || "/" }}';
        node.parameters.operation = 'list';
        
        console.log('   Nouveau path:', node.parameters.path);
      }
      
      // Corriger Download File Nextcloud - doit utiliser le filename de List Files
      if (node.name === 'Download File Nextcloud' && node.type === 'n8n-nodes-base.nextCloud') {
        console.log('\n✏️  Download File Nextcloud:');
        console.log('   Ancien path:', node.parameters.path);
        
        // Le filename vient du noeud List Files via le Loop
        // Nextcloud list retourne: basename, filename, type, size, etc.
        node.parameters.path = '={{ $json.filename }}';
        node.parameters.operation = 'download';
        
        console.log('   Nouveau path:', node.parameters.path);
      }
      
      // Corriger Move/Rename File Nextcloud
      if (node.name === 'Move/Rename File Nextcloud' && node.type === 'n8n-nodes-base.nextCloud') {
        console.log('\n✏️  Move/Rename File Nextcloud:');
        console.log('   Ancien path:', node.parameters.path);
        
        // sourcePath vient de Parse AI Response, sinon on utilise le filename original
        node.parameters.path = '={{ $json.sourcePath || $json.originalPath || $json.filename }}';
        
        console.log('   Nouveau path:', node.parameters.path);
      }
      
      // Corriger Set Target Folder pour bien extraire le dossier
      if (node.name === 'Set Target Folder' && node.type === 'n8n-nodes-base.code') {
        console.log('\n✏️  Set Target Folder:');
        
        node.parameters.jsCode = `
// Extraire le dossier cible depuis le webhook
const webhookData = $input.first().json;
const body = webhookData.body || webhookData;

// Le dossier peut être dans body.folders[0] ou directement folders[0]
const targetFolder = body.folders?.[0] || webhookData.folders?.[0] || '/';

console.log('Target folder:', targetFolder);

return [{
  json: {
    targetFolder: targetFolder,
    triggeredBy: body.triggeredBy || webhookData.triggeredBy || 'unknown',
    timestamp: new Date().toISOString()
  }
}];
`;
        console.log('   Code mis à jour');
      }
      
      return node;
    });
    
    // 3. Vérifier les connexions
    console.log('\n\n🔗 Connexions:');
    Object.entries(workflow.connections || {}).forEach(([nodeName, conns]) => {
      const targets = conns.main?.[0]?.map(c => c.node) || [];
      if (targets.length > 0) {
        console.log(`   ${nodeName} → ${targets.join(', ')}`);
      }
    });
    
    // 4. Sauvegarder
    console.log('\n\n💾 Sauvegarde du template...');
    await pool.query(
      'UPDATE templates SET json = $1 WHERE id = $2',
      [JSON.stringify(workflow), TEMPLATE_ID]
    );
    
    console.log('✅ Template corrigé!');
    console.log('\n⚠️  IMPORTANT: Tu dois REDÉPLOYER le workflow depuis l\'application!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
})();

