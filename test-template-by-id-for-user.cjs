const db = require('./backend/database');

async function testTemplateByIdForUser() {
  try {
    console.log('🔍 Test getTemplateByIdForUser...');
    
    const templateId = '77a79f77-188c-45df-a799-bdaaf06acaeb';
    const userId = 'admin'; // ID de l'admin
    
    console.log('Recherche du template ID:', templateId, 'pour user:', userId);
    
    const template = await db.getTemplateByIdForUser(templateId, userId);
    console.log('✅ Template trouvé:', template ? 'OUI' : 'NON');
    
    if (template) {
      console.log('Détails du template:');
      console.log('- ID:', template.id);
      console.log('- Nom:', template.name);
      console.log('- Description:', template.description);
      console.log('- Workflow JSON présent:', !!template.workflow_json);
      console.log('- Créé par:', template.created_by);
      console.log('- Visible:', template.visible);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testTemplateByIdForUser();
