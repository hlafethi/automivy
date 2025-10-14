const db = require('./backend/database');

async function testUserExists() {
  try {
    console.log('🔍 Test existence utilisateur...');
    
    const userId = '8c210030-7d0a-48ee-97d2-b74564b1efef';
    
    console.log('📊 Test 1: Vérification utilisateur par ID');
    const userResult = await db.query('SELECT id, email, role FROM users WHERE id = $1', [userId]);
    console.log('✅ Utilisateur trouvé:', userResult.rows.length > 0);
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log('- ID:', user.id);
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
    } else {
      console.log('❌ Utilisateur non trouvé');
    }
    
    console.log('');
    console.log('📊 Test 2: Vérification utilisateur par email');
    const emailResult = await db.query('SELECT id, email, role FROM users WHERE email = $1', ['user@heleam.com']);
    console.log('✅ Utilisateur par email trouvé:', emailResult.rows.length > 0);
    
    if (emailResult.rows.length > 0) {
      const user = emailResult.rows[0];
      console.log('- ID:', user.id);
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
    } else {
      console.log('❌ Utilisateur par email non trouvé');
    }
    
    console.log('');
    console.log('📊 Test 3: Liste de tous les utilisateurs');
    const allUsers = await db.query('SELECT id, email, role FROM users');
    console.log('✅ Tous les utilisateurs:', allUsers.rows.length);
    allUsers.rows.forEach(user => {
      console.log(`- ${user.id}: ${user.email} (${user.role})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testUserExists();
