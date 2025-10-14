const db = require('./backend/database');

async function checkTemplateV11() {
  try {
    console.log('🔍 Vérification du template v11...');
    const template = await db.getTemplateByIdForUser('77a79f77-188c-45df-a799-bdaaf06acaeb', '00000000-0000-0000-0000-000000000001');
    
    if (template) {
      console.log('✅ Template trouvé:', template.name);
      console.log('📄 JSON type:', typeof template.json);
      
      if (template.json && template.json.nodes) {
        console.log('🔍 Analyse des nœuds:');
        template.json.nodes.forEach((node, index) => {
          console.log(`\n--- Nœud ${index + 1}: ${node.name} (${node.type}) ---`);
          if (node.credentials) {
            console.log('Credentials:', JSON.stringify(node.credentials, null, 2));
          } else {
            console.log('Aucun credential');
          }
        });
      }
    } else {
      console.log('❌ Template non trouvé');
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.end();
  }
}

checkTemplateV11();
