const db = require('./backend/database');
const bcrypt = require('./backend/node_modules/bcrypt');

async function fixUserHeleam() {
  try {
    console.log('🔧 Correction du mot de passe pour user@heleam.com...');
    
    const email = 'user@heleam.com';
    const newPassword = 'user123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Vérifier si l'utilisateur existe
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      // Mettre à jour le mot de passe
      await db.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [hashedPassword, email]
      );
      
      console.log('✅ Mot de passe mis à jour pour:', email);
      console.log('📧 Email:', email);
      console.log('🔑 Nouveau mot de passe:', newPassword);
    } else {
      console.log('❌ Utilisateur non trouvé:', email);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

fixUserHeleam();
