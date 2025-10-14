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

async function changePasswordAdmin() {
  try {
    console.log('🔐 Changement de mot de passe administrateur...');
    
    // Paramètres
    const userEmail = 'user@heleam.com';
    const newPassword = 'NouveauMotDePasse123!';
    
    console.log('📧 Email utilisateur:', userEmail);
    console.log('🔑 Nouveau mot de passe:', newPassword);
    
    // Vérifier si l'utilisateur existe
    const userResult = await pool.query('SELECT id, email FROM users WHERE email = $1', [userEmail]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Utilisateur non trouvé:', userEmail);
      console.log('💡 Création de l\'utilisateur...');
      
      // Créer l'utilisateur s'il n'existe pas
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const createResult = await pool.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
        [userEmail, hashedPassword, 'user']
      );
      
      console.log('✅ Utilisateur créé:', createResult.rows[0]);
      
    } else {
      console.log('✅ Utilisateur trouvé:', userResult.rows[0]);
      
      // Changer le mot de passe
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updateResult = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email',
        [hashedPassword, userEmail]
      );
      
      console.log('✅ Mot de passe mis à jour pour:', updateResult.rows[0]);
    }
    
    // Vérifier le changement
    const verifyResult = await pool.query('SELECT id, email, role FROM users WHERE email = $1', [userEmail]);
    console.log('🔍 Vérification:', verifyResult.rows[0]);
    
    console.log('🎉 Changement de mot de passe terminé !');
    console.log('');
    console.log('📋 Informations de connexion :');
    console.log('   Email:', userEmail);
    console.log('   Mot de passe:', newPassword);
    console.log('   URL:', 'http://localhost:5174');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Détails:', error);
  } finally {
    await pool.end();
  }
}

changePasswordAdmin();
