const db = require('./backend/database');

async function testTemplateJson() {
  try {
    console.log('🔍 Test JSON du template...');
    
    const templateId = '77a79f77-188c-45df-a799-bdaaf06acaeb';
    const userId = '00000000-0000-0000-0000-000000000001';
    
    const template = await db.getTemplateByIdForUser(templateId, userId);
    
    if (template) {
      console.log('Template JSON:');
      console.log('- Type:', typeof template.json);
      console.log('- Présent:', !!template.json);
      
      if (template.json) {
        console.log('- Nombre de nœuds:', template.json.nodes ? template.json.nodes.length : 'N/A');
        console.log('- Connexions:', template.json.connections ? Object.keys(template.json.connections).length : 'N/A');
        console.log('- Première partie du JSON:', JSON.stringify(template.json).substring(0, 200) + '...');
      } else {
        console.log('❌ PROBLÈME: template.json est null/undefined');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testTemplateJson();
