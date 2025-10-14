const db = require('./backend/database');
const bcrypt = require('./backend/node_modules/bcrypt');

async function createTestUser() {
  try {
    console.log('🔧 Création d\'un utilisateur de test...');
    
    const email = 'testuser@automivy.com';
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Utilisateur de test existe déjà:', email);
      console.log('📧 Email:', email);
      console.log('🔑 Mot de passe:', password);
    } else {
      // Créer l'utilisateur
      const result = await db.query(
        'INSERT INTO users (email, password_hash, role, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
        [email, hashedPassword, 'user']
      );
      
      console.log('✅ Utilisateur de test créé:', email);
      console.log('📧 Email:', email);
      console.log('🔑 Mot de passe:', password);
      console.log('🆔 ID:', result.rows[0].id);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

createTestUser();
