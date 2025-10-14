const db = require('./backend/database');

async function testAdminId() {
  try {
    console.log('🔍 Test récupération ID admin...');
    
    const result = await db.query('SELECT id, email, role FROM users WHERE role = $1', ['admin']);
    console.log('✅ Admins trouvés:', result.rows.length);
    
    result.rows.forEach(admin => {
      console.log(`- ID: ${admin.id}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Role: ${admin.role}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testAdminId();
