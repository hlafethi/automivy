import { Pool } from 'pg';

// Configuration de la base de données
const pool = new Pool({
  host: '147.93.58.155',
  port: 5432,
  database: 'automivy',
  user: 'fethi',
  password: 'Fethi@2025!',
  ssl: false
});

async function initData() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connexion à la base de données...');
    console.log('✅ Connexion réussie');
    
    console.log('👤 Création de l\'utilisateur admin...');
    
    // Créer l'utilisateur admin
    await client.query(`
      INSERT INTO users (id, email, password_hash, role) VALUES 
      ('00000000-0000-0000-0000-000000000001', 'admin@automivy.com', '$2b$10$rQZ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8Kj', 'admin')
      ON CONFLICT (email) DO NOTHING
    `);
    
    // Créer le profil admin
    await client.query(`
      INSERT INTO user_profiles (id, email, role) VALUES 
      ('00000000-0000-0000-0000-000000000001', 'admin@automivy.com', 'admin')
      ON CONFLICT (id) DO NOTHING
    `);
    
    console.log('✅ Utilisateur admin créé avec succès');
    console.log('📧 Email: admin@automivy.com');
    console.log('🔑 Mot de passe: admin123');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initData()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script échoué :', error);
    process.exit(1);
  });
