require('dotenv').config();
const db = require('../database');

async function fixNextcloudTemplate() {
  try {
    const result = await db.query("SELECT * FROM templates WHERE name ILIKE '%nextcloud%'");
    if (result.rows.length === 0) {
      console.log('Template non trouve');
      return;
    }
    
    const template = result.rows[0];
    let workflow = typeof template.json === 'string' ? JSON.parse(template.json) : template.json;
    
    console.log('Template:', template.name);
    console.log('ID:', template.id);
    
    // Remplacer les credentials hardcodes par des placeholders
    workflow.nodes = workflow.nodes?.map(node => {
      // Nextcloud nodes - utiliser placeholder
      if (node.type === 'n8n-nodes-base.nextCloud') {
        node.credentials = {
          nextCloudApi: {
            id: 'USER_NEXTCLOUD_CREDENTIAL_ID',
            name: 'USER_NEXTCLOUD_CREDENTIAL_NAME'
          }
        };
        console.log('Fixed credentials for:', node.name);
      }
      
      // OpenRouter nodes - utiliser placeholder admin
      if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter') {
        node.credentials = {
          openRouterApi: {
            id: 'ADMIN_OPENROUTER_CREDENTIAL_ID',
            name: 'ADMIN_OPENROUTER_CREDENTIAL_NAME'
          }
        };
        console.log('Fixed OpenRouter for:', node.name);
      }
      
      return node;
    });
    
    // Sauvegarder
    await db.query(
      'UPDATE templates SET json = $1 WHERE id = $2',
      [JSON.stringify(workflow), template.id]
    );
    
    console.log('\nTemplate mis a jour avec placeholders!');
    console.log('Redeploie le workflow maintenant.');
    
  } catch(e) {
    console.log('Error:', e.message);
  }
}

fixNextcloudTemplate();
