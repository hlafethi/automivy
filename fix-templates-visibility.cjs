const db = require('./backend/database');

async function fixTemplatesVisibility() {
  try {
    console.log('🔧 Correction de la visibilité des templates...');
    
    // 1. Vérifier l'état actuel des templates
    console.log('📊 État actuel des templates:');
    const templates = await db.query('SELECT id, name, visible, created_by FROM templates');
    templates.rows.forEach(template => {
      console.log(`- ${template.id}: ${template.name} (visible: ${template.visible}, créé par: ${template.created_by})`);
    });
    
    // 2. Mettre à jour la visibilité pour tous les templates
    console.log('🔧 Mise à jour de la visibilité...');
    const updateResult = await db.query('UPDATE templates SET visible = true WHERE visible = false');
    console.log(`✅ ${updateResult.rowCount} templates mis à jour`);
    
    // 3. Vérifier l'état final
    console.log('📊 État final des templates:');
    const finalTemplates = await db.query('SELECT id, name, visible, created_by FROM templates');
    finalTemplates.rows.forEach(template => {
      console.log(`- ${template.id}: ${template.name} (visible: ${template.visible}, créé par: ${template.created_by})`);
    });
    
    // 4. Tester spécifiquement le template problématique
    console.log('🧪 Test du template problématique...');
    const testTemplate = await db.getTemplateByIdForUser('77a79f77-188c-45df-a799-bdaaf06acaeb', '00000000-0000-0000-0000-000000000001');
    console.log('✅ Template trouvé:', !!testTemplate);
    if (testTemplate) {
      console.log('- Nom:', testTemplate.name);
      console.log('- Visible:', testTemplate.visible);
      console.log('- JSON présent:', !!testTemplate.json);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

fixTemplatesVisibility();
