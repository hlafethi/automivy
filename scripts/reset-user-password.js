import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import config from '../backend/config.js';

// Configuration de la base de données
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl
});

async function resetUserPassword() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connexion à la base de données...');
    console.log('✅ Connexion réussie');
    
    const userEmail = 'user@heleam.com';
    const userPassword = 'Project@2025*';
    
    console.log('🔍 Vérification de l\'utilisateur', userEmail, '...');
    const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [userEmail]);
    
    if (existingUser.rows.length > 0) {
      console.log('👤 Utilisateur trouvé:', existingUser.rows[0].email);
      console.log('🆔 ID:', existingUser.rows[0].id);
      console.log('👑 Rôle:', existingUser.rows[0].role);
      
      console.log('🔐 Mise à jour du mot de passe...');
      const passwordHash = await bcrypt.hash(userPassword, 10);
      await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, userEmail]);
      
      console.log('✅ Mot de passe mis à jour avec succès');
    } else {
      console.log('👤 Utilisateur non trouvé, création...');
      
      console.log('🔐 Création du hash de mot de passe...');
      const passwordHash = await bcrypt.hash(userPassword, 10);
      
      console.log('👤 Création de l\'utilisateur...');
      const userResult = await client.query(`
        INSERT INTO users (email, password_hash, role) 
        VALUES ($1, $2, $3) 
        RETURNING *
      `, [
        userEmail,
        passwordHash,
        'user'
      ]);
      
      const userId = userResult.rows[0].id;
      
      console.log('👤 Création du profil utilisateur...');
      await client.query(`
        INSERT INTO user_profiles (id, email, role) 
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO NOTHING
      `, [
        userId,
        userEmail,
        'user'
      ]);
      
      console.log('✅ Utilisateur créé avec succès');
    }
    
    console.log('📧 Email:', userEmail);
    console.log('🔑 Mot de passe:', userPassword);
    console.log('✅ Script terminé avec succès');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetUserPassword()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script échoué:', error);
    process.exit(1);
  });

