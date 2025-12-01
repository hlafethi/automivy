const db = require('../database');

async function checkTemplateParams() {
  try {
    const result = await db.query(
      'SELECT json FROM templates WHERE name = $1 LIMIT 1',
      ['Microsoft Tri Automatique BAL']
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.log('❌ Template non trouvé');
      return;
    }
    
    const template = result.rows[0];
    const workflow = typeof template.json === 'string' ? JSON.parse(template.json) : template.json;
    
    const outlookNodes = workflow.nodes?.filter(n => n.type === 'n8n-nodes-base.microsoftOutlook') || [];
    
    console.log(`✅ Nœuds Microsoft Outlook trouvés: ${outlookNodes.length}\n`);
    
    outlookNodes.forEach((node, i) => {
      console.log(`Nœud ${i + 1}: ${node.name}`);
      console.log('  - Resource:', node.parameters?.resource || 'NON DÉFINI');
      console.log('  - Operation:', node.parameters?.operation || 'NON DÉFINI');
      console.log('  - Folder:', node.parameters?.folder || 'NON DÉFINI');
      console.log('  - FolderId:', node.parameters?.folderId || 'NON DÉFINI');
      console.log('  - ReturnAll:', node.parameters?.returnAll !== undefined ? node.parameters.returnAll : 'NON DÉFINI');
      console.log('  - Limit:', node.parameters?.limit || 'NON DÉFINI');
      console.log('  - Tous les paramètres:', JSON.stringify(node.parameters, null, 2));
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    process.exit(0);
  }
}

checkTemplateParams();

