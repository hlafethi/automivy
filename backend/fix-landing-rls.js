const { Pool } = require('pg');

const pool = new Pool({
  host: '147.93.58.155',
  port: 5432,
  database: 'automivy',
  user: 'fethi',
  password: 'Fethi@2025!',
});

async function fixLandingRLS() {
  try {
    console.log('🔍 Vérification de la table landing_sections...');
    
    // Vérifier si la table existe
    const checkTable = await pool.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'landing_sections'
    `);
    
    if (checkTable.rows.length === 0) {
      console.log('❌ La table landing_sections n\'existe pas');
      return;
    }
    
    console.log('✅ Table landing_sections trouvée');
    console.log('📊 État actuel:', checkTable.rows[0]);
    
    // Désactiver RLS
    await pool.query('ALTER TABLE landing_sections DISABLE ROW LEVEL SECURITY');
    console.log('✅ RLS désactivé sur landing_sections');
    
    // Vérifier l'état final
    const finalCheck = await pool.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'landing_sections'
    `);
    
    console.log('📊 État final:', finalCheck.rows[0]);
    console.log('✅ Correction terminée avec succès');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

fixLandingRLS();

