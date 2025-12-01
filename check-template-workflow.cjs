const db = require('./backend/database');

async function checkTemplateWorkflow() {
  console.log('🔍 [Check] Vérification des templates et workflows...\n');
  
  try {
    // 1. Vérifier le template bb0ece30
    console.log('📋 [Check] Template ID utilisé: bb0ece30-d5b1-46d0-b0a7-a30f5452d6a0');
    const template1 = await db.query('SELECT id, name FROM templates WHERE id = $1', ['bb0ece30-d5b1-46d0-b0a7-a30f5452d6a0']);
    
    if (template1.rows.length > 0) {
      console.log('✅ Template trouvé:', template1.rows[0].name);
    } else {
      console.log('❌ Template NON TROUVÉ dans la BDD');
    }
    
    // 2. Vérifier le template PDF Analysis
    console.log('\n📋 [Check] Template PDF Analysis: 132d04c8-e36a-4dbd-abac-21fa8280650e');
    const template2 = await db.query('SELECT id, name FROM templates WHERE id = $1', ['132d04c8-e36a-4dbd-abac-21fa8280650e']);
    
    if (template2.rows.length > 0) {
      console.log('✅ Template trouvé:', template2.rows[0].name);
    } else {
      console.log('❌ Template NON TROUVÉ dans la BDD');
    }
    
    // 3. Vérifier les workflows pour bb0ece30
    console.log('\n📋 [Check] Workflows pour template bb0ece30:');
    const workflows1 = await db.query(
      'SELECT id, name, template_id, n8n_workflow_id, webhook_path, is_active FROM user_workflows WHERE template_id = $1 ORDER BY created_at DESC',
      ['bb0ece30-d5b1-46d0-b0a7-a30f5452d6a0']
    );
    
    if (workflows1.rows.length > 0) {
      workflows1.rows.forEach((wf, idx) => {
        console.log(`  ${idx + 1}. ${wf.name}`);
        console.log(`     - Actif: ${wf.is_active ? '✅' : '❌'}`);
        console.log(`     - Webhook: ${wf.webhook_path || 'NON DÉFINI'}`);
        console.log(`     - n8n ID: ${wf.n8n_workflow_id || 'NON DÉFINI'}`);
      });
    } else {
      console.log('  ❌ Aucun workflow déployé pour ce template');
    }
    
    // 4. Vérifier les workflows pour PDF Analysis
    console.log('\n📋 [Check] Workflows pour template PDF Analysis:');
    const workflows2 = await db.query(
      'SELECT id, name, template_id, n8n_workflow_id, webhook_path, is_active FROM user_workflows WHERE template_id = $1 ORDER BY created_at DESC',
      ['132d04c8-e36a-4dbd-abac-21fa8280650e']
    );
    
    if (workflows2.rows.length > 0) {
      workflows2.rows.forEach((wf, idx) => {
        console.log(`  ${idx + 1}. ${wf.name}`);
        console.log(`     - Actif: ${wf.is_active ? '✅' : '❌'}`);
        console.log(`     - Webhook: ${wf.webhook_path || 'NON DÉFINI'}`);
        console.log(`     - n8n ID: ${wf.n8n_workflow_id || 'NON DÉFINI'}`);
      });
    } else {
      console.log('  ❌ Aucun workflow déployé pour ce template');
    }
    
    // 5. Lister tous les templates disponibles
    console.log('\n📋 [Check] Tous les templates disponibles:');
    const allTemplates = await db.query('SELECT id, name FROM templates ORDER BY name');
    allTemplates.rows.forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t.name} (${t.id})`);
    });
    
  } catch (error) {
    console.error('❌ [Check] Erreur:', error);
  } finally {
    await db.end();
  }
}

checkTemplateWorkflow();

