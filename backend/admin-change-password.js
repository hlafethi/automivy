const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const config = require('./config');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl
});

async function adminChangePassword() {
  try {
    console.log('🔐 Outil de changement de mot de passe administrateur');
    console.log('=' .repeat(50));
    
    // Paramètres (modifiez ces valeurs selon vos besoins)
    const userEmail = process.argv[2] || 'user@heleam.com';
    const newPassword = process.argv[3] || 'NouveauMotDePasse123!';
    
    console.log('📧 Email utilisateur:', userEmail);
    console.log('🔑 Nouveau mot de passe:', newPassword);
    console.log('');
    
    // Vérifier si l'utilisateur existe
    const userResult = await pool.query('SELECT id, email, role FROM users WHERE email = $1', [userEmail]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Utilisateur non trouvé:', userEmail);
      console.log('');
      console.log('💡 Utilisateurs existants:');
      
      // Lister tous les utilisateurs
      const allUsersResult = await pool.query('SELECT email, role FROM users ORDER BY created_at DESC');
      allUsersResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.role})`);
      });
      
      console.log('');
      console.log('🔧 Pour créer un nouvel utilisateur, utilisez:');
      console.log('   node admin-change-password.js email@example.com NouveauMotDePasse');
      
    } else {
      console.log('✅ Utilisateur trouvé:', userResult.rows[0]);
      
      // Changer le mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updateResult = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, role',
        [hashedPassword, userEmail]
      );
      
      console.log('✅ Mot de passe mis à jour pour:', updateResult.rows[0]);
      
      console.log('');
      console.log('🎉 Changement de mot de passe terminé !');
      console.log('');
      console.log('📋 Informations de connexion :');
      console.log('   Email:', userEmail);
      console.log('   Mot de passe:', newPassword);
      console.log('   URL:', 'http://localhost:5174');
      console.log('');
      console.log('🔗 Vous pouvez maintenant vous connecter avec ces identifiants.');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Détails:', error);
  } finally {
    await pool.end();
  }
}

// Aide si aucun argument
if (process.argv.length < 3) {
  console.log('🔐 Outil de changement de mot de passe administrateur');
  console.log('=' .repeat(50));
  console.log('');
  console.log('📖 Utilisation:');
  console.log('   node admin-change-password.js email@example.com NouveauMotDePasse');
  console.log('');
  console.log('📝 Exemples:');
  console.log('   node admin-change-password.js user@heleam.com MonNouveauMotDePasse');
  console.log('   node admin-change-password.js admin@automivy.com AdminPassword123');
  console.log('');
  console.log('🔍 Pour voir tous les utilisateurs, lancez sans arguments.');
  console.log('');
} else {
  adminChangePassword();
}
