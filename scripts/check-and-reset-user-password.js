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

async function checkAndResetUserPassword() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connexion à la base de données...');
    console.log('✅ Connexion réussie');
    
    const userEmail = 'user@heleam.com';
    const userPassword = 'user123';
    
    console.log('🔍 Vérification de l\'utilisateur', userEmail, '...');
    const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [userEmail]);
    
    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log('✅ Utilisateur trouvé:', user.email);
      console.log('🆔 ID:', user.id);
      console.log('👑 Rôle:', user.role);
      
      // Vérifier si le mot de passe actuel fonctionne
      console.log('🔐 Vérification du mot de passe actuel...');
      const isPasswordValid = await bcrypt.compare(userPassword, user.password_hash);
      
      if (isPasswordValid) {
        console.log('✅ Le mot de passe actuel est correct');
        console.log('📧 Email:', userEmail);
        console.log('🔑 Mot de passe:', userPassword);
      } else {
        console.log('⚠️ Le mot de passe actuel ne correspond pas, mise à jour...');
        const passwordHash = await bcrypt.hash(userPassword, 10);
        await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, userEmail]);
        console.log('✅ Mot de passe mis à jour avec succès');
        console.log('📧 Email:', userEmail);
        console.log('🔑 Nouveau mot de passe:', userPassword);
      }
    } else {
      console.log('❌ Utilisateur non trouvé, création...');
      
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
      console.log('📧 Email:', userEmail);
      console.log('🔑 Mot de passe:', userPassword);
      console.log('🆔 ID:', userId);
    }
    
    console.log('✅ Script terminé avec succès');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndResetUserPassword()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script échoué:', error);
    process.exit(1);
  });

