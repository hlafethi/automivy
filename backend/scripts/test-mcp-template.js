require('dotenv').config();
const db = require('../database');
const { analyzeWorkflowCredentials, generateDynamicForm } = require('../services/workflowAnalyzer');

async function testMcpTemplate() {
  try {
    console.log('🔍 Test du template test mcp...\n');
    
    // Récupérer le template
    const result = await db.query(
      'SELECT id, name, json FROM templates WHERE id = $1',
      ['5916c2c3-d2f8-4895-8165-5048b367d16a']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Template non trouvé');
      return;
    }
    
    const template = result.rows[0];
    const workflow = typeof template.json === 'string' ? JSON.parse(template.json) : template.json;
    
    console.log('✅ Template trouvé:', template.name);
    console.log('   ID:', template.id);
    console.log('   Nombre de nœuds:', workflow.nodes?.length || 0);
    
    // Analyser les credentials requis
    console.log('\n🔍 Analyse des credentials requis...');
    const requiredCredentials = analyzeWorkflowCredentials(workflow, template.id, template.name);
    
    console.log(`\n✅ Credentials détectés: ${requiredCredentials.length}`);
    requiredCredentials.forEach((cred, i) => {
      console.log(`\n  ${i + 1}. ${cred.type} - ${cred.name}`);
      console.log(`     Description: ${cred.description}`);
      console.log(`     Champs: ${cred.fields?.length || 0}`);
      if (cred.fields) {
        cred.fields.forEach(f => {
          console.log(`       - ${f.name} (${f.type}) - provider: ${f.provider || 'none'}`);
        });
      }
    });
    
    // Générer le formulaire dynamique
    console.log('\n🔍 Génération du formulaire dynamique...');
    const formConfig = generateDynamicForm(requiredCredentials);
    
    console.log(`\n✅ Formulaire généré:`);
    console.log(`   Titre: ${formConfig.title}`);
    console.log(`   Description: ${formConfig.description}`);
    console.log(`   Sections: ${formConfig.sections?.length || 0}`);
    
    if (formConfig.sections) {
      formConfig.sections.forEach((section, i) => {
        console.log(`\n   Section ${i + 1}: ${section.title}`);
        console.log(`     Champs: ${section.fields?.length || 0}`);
        section.fields?.forEach(f => {
          console.log(`       - ${f.name} (${f.type}) - ${f.label} - required: ${f.required}`);
        });
      });
    }
    
    console.log('\n✅ Test terminé avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testMcpTemplate();

