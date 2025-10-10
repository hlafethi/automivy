import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true',
});

async function createTestUser() {
  let client;
  try {
    client = await pool.connect();
    console.log('🔌 Connexion à la base de données...');

    const userEmail = 'test@example.com';
    const userPassword = 'test123';
    const userId = '11111111-1111-1111-1111-111111111111'; // ID fixe pour l'utilisateur de test
    const userRole = 'user';

    console.log(`🔍 Vérification de l'utilisateur ${userEmail}...`);
    const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [userEmail]);

    if (existingUser.rows.length > 0) {
      console.log(`⚠️ L'utilisateur ${userEmail} existe déjà. Mise à jour du mot de passe si nécessaire.`);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(userPassword, salt);
      await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, userEmail]);
      console.log(`✅ Mot de passe de l'utilisateur ${userEmail} mis à jour.`);
    } else {
      console.log('🔐 Création du hash de mot de passe...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(userPassword, salt);
      console.log('Hash généré:', passwordHash);

      console.log(`👤 Création de l'utilisateur ${userEmail}...`);
      await client.query(`
        INSERT INTO users (id, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
      `, [userId, userEmail, passwordHash, userRole]);

      console.log('👤 Création du profil utilisateur...');
      await client.query(`
        INSERT INTO user_profiles (id, email, role)
        VALUES ($1, $2, $3)
      `, [userId, userEmail, userRole]);

      console.log(`✅ Utilisateur ${userEmail} créé avec succès`);
    }

    console.log('📧 Email:', userEmail);
    console.log('🔑 Mot de passe:', userPassword);
    console.log('🆔 ID:', userId);
    console.log('👑 Rôle:', userRole);
    console.log('✅ Script terminé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'utilisateur :', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

createTestUser().catch(error => {
  console.error('❌ Script échoué :', error);
  process.exit(1);
});
