import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true',
});

async function clearWorkflows() {
  let client;
  try {
    client = await pool.connect();
    console.log('🔌 Connexion à la base de données...');

    // Supprimer tous les workflows
    console.log('🗑️ Suppression de tous les workflows...');
    const deleteResult = await client.query('DELETE FROM workflows');
    console.log(`✅ ${deleteResult.rowCount} workflows supprimés`);

    // Vérifier qu'il n'y a plus de workflows
    const countResult = await client.query('SELECT COUNT(*) FROM workflows');
    console.log(`📊 Nombre de workflows restants: ${countResult.rows[0].count}`);

    console.log('✅ Tous les workflows ont été supprimés avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des workflows :', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

clearWorkflows().catch(error => {
  console.error('❌ Script échoué :', error);
  process.exit(1);
});
