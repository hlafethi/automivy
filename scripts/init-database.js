import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration de la base de données
const pool = new Pool({
  host: process.env.DB_HOST || '147.93.58.155',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'automivy',
  user: process.env.DB_USER || 'fethi',
  password: process.env.DB_PASSWORD || 'Fethi@2025!',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connexion à la base de données PostgreSQL...');
    
    // Vérifier la connexion
    const result = await client.query('SELECT NOW()');
    console.log('✅ Connexion réussie à', result.rows[0].now);
    
    // Lire et exécuter le schéma
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Application du schéma de base de données...');
    await client.query(schema);
    console.log('✅ Schéma appliqué avec succès');
    
    // Lire et exécuter l'initialisation
    const initPath = path.join(__dirname, '..', 'database', 'init.sql');
    const init = fs.readFileSync(initPath, 'utf8');
    
    console.log('🚀 Initialisation des données...');
    await client.query(init);
    console.log('✅ Données initialisées avec succès');
    
    console.log('🎉 Base de données initialisée avec succès !');
    console.log('👤 Utilisateur admin créé : admin@automivy.com / admin123');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation :', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécuter si appelé directement
initDatabase()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script échoué :', error);
    process.exit(1);
  });

export { initDatabase };
