import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Configuration de la base de données
const pool = new Pool({
  host: '147.93.58.155',
  port: 5432,
  database: 'automivy',
  user: 'fethi',
  password: 'Fethi@2025!',
  ssl: false
});

async function createUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connexion à la base de données...');
    console.log('✅ Connexion réussie');
    
    console.log('🔍 Vérification de l\'utilisateur user@heleam.com...');
    const existingUser = await client.query('SELECT * FROM users WHERE email = $1', ['user@heleam.com']);
    
    if (existingUser.rows.length > 0) {
      console.log('👤 Utilisateur user@heleam.com existe déjà');
      console.log('📧 Email:', existingUser.rows[0].email);
      console.log('🆔 ID:', existingUser.rows[0].id);
      console.log('👑 Rôle:', existingUser.rows[0].role);
      return;
    }
    
    console.log('🔐 Création du hash de mot de passe...');
    const passwordHash = await bcrypt.hash('password123', 10);
    console.log('Hash généré:', passwordHash);
    
    console.log('👤 Création de l\'utilisateur user@heleam.com...');
    const userResult = await client.query(`
      INSERT INTO users (email, password_hash, role) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, [
      'user@heleam.com',
      passwordHash,
      'user'
    ]);
    
    console.log('👤 Création du profil utilisateur...');
    await client.query(`
      INSERT INTO user_profiles (id, email, role) 
      VALUES ($1, $2, $3)
    `, [
      userResult.rows[0].id,
      'user@heleam.com',
      'user'
    ]);
    
    console.log('✅ Utilisateur user@heleam.com créé avec succès');
    console.log('📧 Email: user@heleam.com');
    console.log('🔑 Mot de passe: password123');
    console.log('🆔 ID:', userResult.rows[0].id);
    console.log('👑 Rôle: user');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createUser()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script échoué :', error);
    process.exit(1);
  });
