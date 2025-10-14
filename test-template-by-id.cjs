const db = require('./backend/database');

async function testTemplateById() {
  try {
    console.log('🔍 Test getTemplateById...');
    
    const templateId = '77a79f77-188c-45df-a799-bdaaf06acaeb';
    console.log('Recherche du template ID:', templateId);
    
    const template = await db.getTemplateById(templateId);
    console.log('✅ Template trouvé:', template ? 'OUI' : 'NON');
    
    if (template) {
      console.log('Détails du template:');
      console.log('- ID:', template.id);
      console.log('- Nom:', template.name);
      console.log('- Description:', template.description);
      console.log('- Workflow JSON présent:', !!template.workflow_json);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testTemplateById();
