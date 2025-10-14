const db = require('./backend/database');

async function testTemplateDetails() {
  try {
    console.log('🔍 Test détails du template...');
    
    const templateId = '77a79f77-188c-45df-a799-bdaaf06acaeb';
    const userId = '00000000-0000-0000-0000-000000000001';
    
    const template = await db.getTemplateByIdForUser(templateId, userId);
    
    if (template) {
      console.log('Détails complets du template:');
      console.log('- ID:', template.id);
      console.log('- Nom:', template.name);
      console.log('- Description:', template.description);
      console.log('- Workflow JSON:', template.workflow_json);
      console.log('- Type:', typeof template.workflow_json);
      console.log('- Créé par:', template.created_by);
      console.log('- Visible:', template.visible);
      console.log('- Créé le:', template.created_at);
      
      // Vérifier si workflow_json est null, undefined, ou une chaîne vide
      if (!template.workflow_json) {
        console.log('❌ PROBLÈME: workflow_json est vide ou null');
      } else {
        console.log('✅ workflow_json est présent');
        try {
          const parsed = JSON.parse(template.workflow_json);
          console.log('- Nombre de nœuds:', parsed.nodes ? parsed.nodes.length : 'N/A');
        } catch (e) {
          console.log('- Erreur parsing JSON:', e.message);
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testTemplateDetails();
