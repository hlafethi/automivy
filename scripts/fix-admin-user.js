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

async function fixAdminUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connexion à la base de données...');
    console.log('✅ Connexion réussie');
    
    console.log('🔍 Vérification de l\'utilisateur admin existant...');
    const existingUser = await client.query('SELECT * FROM users WHERE email = $1', ['admin@automivy.com']);
    
    if (existingUser.rows.length > 0) {
      console.log('🗑️ Suppression de l\'ancien utilisateur admin...');
      await client.query('DELETE FROM users WHERE email = $1', ['admin@automivy.com']);
      await client.query('DELETE FROM user_profiles WHERE email = $1', ['admin@automivy.com']);
    }
    
    console.log('🔐 Création du nouveau hash de mot de passe...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    console.log('Hash généré:', passwordHash);
    
    console.log('👤 Création du nouvel utilisateur admin...');
    const userResult = await client.query(`
      INSERT INTO users (id, email, password_hash, role) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `, [
      '00000000-0000-0000-0000-000000000001',
      'admin@automivy.com',
      passwordHash,
      'admin'
    ]);
    
    console.log('👤 Création du profil admin...');
    await client.query(`
      INSERT INTO user_profiles (id, email, role) 
      VALUES ($1, $2, $3)
    `, [
      '00000000-0000-0000-0000-000000000001',
      'admin@automivy.com',
      'admin'
    ]);
    
    console.log('✅ Utilisateur admin créé avec succès');
    console.log('📧 Email: admin@automivy.com');
    console.log('🔑 Mot de passe: admin123');
    console.log('🆔 ID:', userResult.rows[0].id);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAdminUser()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script échoué :', error);
    process.exit(1);
  });
