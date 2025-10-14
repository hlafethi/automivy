const db = require('./backend/database');

async function testUserAccess() {
  try {
    console.log('🔍 Test d\'accès utilisateur normal...');
    
    const workflowId = '77a79f77-188c-45df-a799-bdaaf06acaeb';
    const userId = '8c210030-7d0a-48ee-97d2-b74564b1efef'; // ID de l'utilisateur normal
    
    console.log('📊 Test 1: Utilisateur normal');
    const userTemplate = await db.getTemplateByIdForUser(workflowId, userId);
    console.log('✅ Template trouvé pour utilisateur:', !!userTemplate);
    
    if (userTemplate) {
      console.log('- Nom:', userTemplate.name);
      console.log('- Visible:', userTemplate.visible);
      console.log('- Créé par:', userTemplate.created_by);
    } else {
      console.log('❌ Template non trouvé pour l\'utilisateur normal');
    }
    
    console.log('');
    console.log('📊 Test 2: Admin');
    const adminId = '00000000-0000-0000-0000-000000000001';
    const adminTemplate = await db.getTemplateByIdForUser(workflowId, adminId);
    console.log('✅ Template trouvé pour admin:', !!adminTemplate);
    
    if (adminTemplate) {
      console.log('- Nom:', adminTemplate.name);
      console.log('- Visible:', adminTemplate.visible);
      console.log('- Créé par:', adminTemplate.created_by);
    }
    
    console.log('');
    console.log('📊 Test 3: Vérification des templates visibles pour l\'utilisateur');
    const userTemplates = await db.getTemplates(userId, 'user');
    console.log('✅ Templates visibles pour utilisateur:', userTemplates.length);
    userTemplates.forEach(template => {
      console.log(`- ${template.id}: ${template.name} (visible: ${template.visible})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testUserAccess();
