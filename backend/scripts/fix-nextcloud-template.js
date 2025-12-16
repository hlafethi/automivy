require('dotenv').config();
const db = require('../database');

async function fixNextcloudTemplate() {
  try {
    // 1. Trouver le template Nextcloud
    const templates = await db.query(
      "SELECT * FROM templates WHERE name ILIKE '%nextcloud%'"
    );
    
    if (templates.rows.length === 0) {
      console.log('Template Nextcloud non trouve!');
      return;
    }
    
    const template = templates.rows[0];
    console.log('Template trouve:', template.name, 'ID:', template.id);
    
    // 2. Parser le JSON
    let workflow = typeof template.json === 'string' 
      ? JSON.parse(template.json) 
      : template.json;
    
    console.log('Noeuds actuels:', workflow.nodes?.length);
    workflow.nodes?.forEach(n => console.log(' -', n.name, '(' + n.type + ')'));
    
    // 3. Corriger les parametres des noeuds
    workflow.nodes = workflow.nodes?.map(node => {
      if (node.type === 'n8n-nodes-base.nextCloud') {
        if (node.parameters?.operation === 'list') {
          node.parameters.path = '={{ $json.targetFolder || $json.folders?.[0] || "/" }}';
          console.log('Fixed List Files path');
        }
        if (node.parameters?.operation === 'move') {
          node.parameters.path = '={{ $json.sourcePath || $json.path }}';
          node.parameters.toPath = '={{ $json.destinationPath }}';
          console.log('Fixed Move/Rename paths');
        }
      }
      return node;
    });
    
    // 4. Trouver les vrais noms des noeuds
    const nodeNames = workflow.nodes?.map(n => n.name) || [];
    
    const webhookName = nodeNames.find(n => n.toLowerCase().includes('webhook') && !n.toLowerCase().includes('respond')) || 'Webhook Trigger';
    const setTargetName = nodeNames.find(n => n.toLowerCase().includes('target')) || 'Set Target Folder';
    const listFilesName = nodeNames.find(n => n.toLowerCase().includes('list')) || 'List Files Nextcloud';
    const loopName = nodeNames.find(n => n.toLowerCase().includes('loop')) || 'Loop Over Files';
    const downloadName = nodeNames.find(n => n.toLowerCase().includes('download')) || 'Download File Nextcloud';
    const aiAgentName = nodeNames.find(n => n.toLowerCase().includes('ai agent')) || 'AI Agent';
    const parseName = nodeNames.find(n => n.toLowerCase().includes('parse')) || 'Parse AI Response';
    const moveName = nodeNames.find(n => n.toLowerCase().includes('move') || n.toLowerCase().includes('rename')) || 'Move/Rename File Nextcloud';
    const respondName = nodeNames.find(n => n.toLowerCase().includes('respond')) || 'Respond to Webhook';
    const openRouterName = nodeNames.find(n => n.toLowerCase().includes('openrouter')) || 'OpenRouter Chat Model';
    const calculatorName = nodeNames.find(n => n.toLowerCase().includes('calculator')) || 'Calculator Tool';
    const bufferName = nodeNames.find(n => n.toLowerCase().includes('buffer') || n.toLowerCase().includes('memory')) || 'Buffer Window Memory';
    
    console.log('\nNoms trouves:');
    console.log(' webhook:', webhookName);
    console.log(' loop:', loopName);
    console.log(' respond:', respondName);
    
    // 5. Corriger les connexions
    workflow.connections = {
      [webhookName]: {"main": [[{"node": setTargetName, "type": "main", "index": 0}]]},
      [setTargetName]: {"main": [[{"node": listFilesName, "type": "main", "index": 0}]]},
      [listFilesName]: {"main": [[{"node": loopName, "type": "main", "index": 0}]]},
      [loopName]: {"main": [
        [{"node": downloadName, "type": "main", "index": 0}],
        [{"node": respondName, "type": "main", "index": 0}]
      ]},
      [downloadName]: {"main": [[{"node": aiAgentName, "type": "main", "index": 0}]]},
      [openRouterName]: {"ai_languageModel": [[{"node": aiAgentName, "type": "ai_languageModel", "index": 0}]]},
      [calculatorName]: {"ai_tool": [[{"node": aiAgentName, "type": "ai_tool", "index": 0}]]},
      [bufferName]: {"ai_memory": [[{"node": aiAgentName, "type": "ai_memory", "index": 0}]]},
      [aiAgentName]: {"main": [[{"node": parseName, "type": "main", "index": 0}]]},
      [parseName]: {"main": [[{"node": moveName, "type": "main", "index": 0}]]},
      [moveName]: {"main": [[{"node": loopName, "type": "main", "index": 0}]]}
    };
    
    console.log('\nConnexions corrigees');
    
    // 6. Sauvegarder
    await db.query(
      'UPDATE templates SET json = $1 WHERE id = $2',
      [JSON.stringify(workflow), template.id]
    );
    
    console.log('Template mis a jour! Redeploie maintenant.');
    
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

fixNextcloudTemplate();
