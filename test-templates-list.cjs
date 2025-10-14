const db = require('./backend/database');

async function testTemplates() {
  try {
    console.log('🔍 Test des templates disponibles...');
    
    const templates = await db.getTemplates('admin', 'admin');
    console.log('✅ Templates trouvés:', templates.length);
    
    templates.forEach(template => {
      console.log(`- ID: ${template.id}`);
      console.log(`  Nom: ${template.name}`);
      console.log(`  Description: ${template.description || 'Aucune'}`);
      console.log(`  Créé: ${template.created_at}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testTemplates();
