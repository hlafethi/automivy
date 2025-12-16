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
    console.log('🔧 Correction COMPLÈTE du template Nextcloud...\n');
    
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
    console.log('   Noeuds:', workflow.nodes?.length);
    
    // 2. Corriger chaque noeud
    console.log('\n🔧 Correction des noeuds:\n');
    
    workflow.nodes = workflow.nodes.map(node => {
      
      // Webhook Trigger
      if (node.type === 'n8n-nodes-base.webhook') {
        console.log('✏️  Webhook Trigger');
        node.parameters = {
          path: 'file-sort',
          httpMethod: 'POST',
          responseMode: 'onReceived',
          responseCode: 200
        };
        node.typeVersion = 2;
        console.log('   ✅ Configuré');
      }
      
      // Set Target Folder
      if (node.name === 'Set Target Folder') {
        console.log('✏️  Set Target Folder');
        node.parameters = {
          jsCode: `// Extraire le dossier cible depuis le webhook
const webhookData = $input.first().json;
const body = webhookData.body || webhookData;

// Le dossier vient de folders[0]
const targetFolder = body.folders?.[0] || webhookData.folders?.[0] || '/';

console.log('📁 Target folder:', targetFolder);

return [{
  json: {
    targetFolder: targetFolder,
    triggeredBy: body.triggeredBy || 'webhook',
    timestamp: new Date().toISOString()
  }
}];`
        };
        console.log('   ✅ Code mis à jour');
      }
      
      // List Files Nextcloud
      if (node.name === 'List Files Nextcloud' || 
          (node.type === 'n8n-nodes-base.nextCloud' && node.parameters?.operation === 'list')) {
        console.log('✏️  List Files Nextcloud');
        node.parameters = {
          resource: 'file',
          operation: 'list',
          // Le path vient du noeud Set Target Folder
          path: '={{ $json.targetFolder || "/" }}'
        };
        console.log('   ✅ Path: {{ $json.targetFolder || "/" }}');
      }
      
      // Loop Over Files (splitInBatches)
      if (node.type === 'n8n-nodes-base.splitInBatches') {
        console.log('✏️  Loop Over Files');
        node.parameters = {
          batchSize: 1,
          options: {}
        };
        console.log('   ✅ BatchSize: 1');
      }
      
      // Download File Nextcloud
      if (node.name === 'Download File Nextcloud' || 
          (node.type === 'n8n-nodes-base.nextCloud' && node.parameters?.operation === 'download')) {
        console.log('✏️  Download File Nextcloud');
        node.parameters = {
          resource: 'file',
          operation: 'download',
          // filename vient de List Files via le Loop
          path: '={{ $json.filename || $json.path }}',
          binaryPropertyName: 'data'
        };
        console.log('   ✅ Path: {{ $json.filename || $json.path }}');
      }
      
      // Move/Rename File Nextcloud
      if (node.name === 'Move/Rename File Nextcloud' ||
          (node.type === 'n8n-nodes-base.nextCloud' && node.parameters?.operation === 'move')) {
        console.log('✏️  Move/Rename File Nextcloud');
        node.parameters = {
          resource: 'file',
          operation: 'move',
          // sourcePath vient de Parse AI Response
          path: '={{ $json.sourcePath || $json.originalFilename || $json.filename }}',
          newPath: '={{ $json.newPath || $json.destinationPath }}'
        };
        console.log('   ✅ Path dynamique configuré');
      }
      
      return node;
    });
    
    // 3. Vérifier les connexions
    console.log('\n🔗 Connexions:');
    const expectedFlow = [
      'Webhook Trigger → Set Target Folder',
      'Set Target Folder → List Files Nextcloud',
      'List Files Nextcloud → Loop Over Files',
      'Loop Over Files → Download File Nextcloud',
      'Download File Nextcloud → AI Agent',
      'AI Agent → Parse AI Response',
      'Parse AI Response → Move/Rename File Nextcloud',
      'Move/Rename File Nextcloud → Loop Over Files (retour)'
    ];
    
    expectedFlow.forEach(conn => console.log('   ' + conn));
    
    // 4. Sauvegarder
    console.log('\n💾 Sauvegarde du template...');
    await pool.query(
      'UPDATE templates SET json = $1 WHERE id = $2',
      [JSON.stringify(workflow), TEMPLATE_ID]
    );
    
    console.log('✅ Template corrigé!');
    console.log('\n⚠️  IMPORTANT:');
    console.log('   1. Supprime le workflow actuel dans n8n');
    console.log('   2. Supprime le credential Nextcloud dans n8n');
    console.log('   3. Redéploie depuis l\'application');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
})();

