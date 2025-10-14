const db = require('./backend/database');

async function testTemplateN8nId() {
  try {
    console.log('🔍 Test n8n_workflow_id du template...');
    
    const templateId = '77a79f77-188c-45df-a799-bdaaf06acaeb';
    const userId = '00000000-0000-0000-0000-000000000001';
    
    const template = await db.getTemplateByIdForUser(templateId, userId);
    
    if (template) {
      console.log('Colonnes disponibles dans le template:');
      Object.keys(template).forEach(key => {
        console.log(`- ${key}: ${template[key]} (${typeof template[key]})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testTemplateN8nId();
