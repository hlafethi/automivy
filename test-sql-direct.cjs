const db = require('./backend/database');

async function testSqlDirect() {
  try {
    console.log('🔍 Test direct de la requête SQL...');
    
    const workflowId = '77a79f77-188c-45df-a799-bdaaf06acaeb';
    const userId = '00000000-0000-0000-0000-000000000001';
    
    console.log('📊 Test 1: Requête directe par ID');
    const directResult = await db.query('SELECT * FROM templates WHERE id = $1', [workflowId]);
    console.log('✅ Templates trouvés:', directResult.rows.length);
    if (directResult.rows.length > 0) {
      const template = directResult.rows[0];
      console.log('- ID:', template.id);
      console.log('- Nom:', template.name);
      console.log('- Visible:', template.visible);
      console.log('- Créé par:', template.created_by);
    }
    
    console.log('');
    console.log('📊 Test 2: Requête avec conditions');
    const conditionResult = await db.query(
      'SELECT * FROM templates WHERE id = $1 AND (created_by = $2 OR visible = true)',
      [workflowId, userId]
    );
    console.log('✅ Templates trouvés avec conditions:', conditionResult.rows.length);
    
    console.log('');
    console.log('📊 Test 3: Requête avec admin check');
    const adminResult = await db.query(
      'SELECT * FROM templates WHERE id = $1 AND (created_by = $2 OR visible = true OR $2 = (SELECT id FROM users WHERE role = \'admin\' LIMIT 1))',
      [workflowId, userId]
    );
    console.log('✅ Templates trouvés avec admin check:', adminResult.rows.length);
    
    console.log('');
    console.log('📊 Test 4: Vérification du rôle admin');
    const userResult = await db.query('SELECT id, role FROM users WHERE id = $1', [userId]);
    console.log('✅ Utilisateur trouvé:', userResult.rows.length > 0);
    if (userResult.rows.length > 0) {
      console.log('- ID:', userResult.rows[0].id);
      console.log('- Role:', userResult.rows[0].role);
    }
    
    console.log('');
    console.log('📊 Test 5: Fonction getTemplateByIdForUser');
    const functionResult = await db.getTemplateByIdForUser(workflowId, userId);
    console.log('✅ Résultat fonction:', !!functionResult);
    if (functionResult) {
      console.log('- Nom:', functionResult.name);
      console.log('- JSON présent:', !!functionResult.json);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testSqlDirect();
