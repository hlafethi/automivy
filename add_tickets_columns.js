const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'automivy',
  password: 'password',
  port: 5432,
});

async function addMissingColumns() {
  try {
    console.log('🔧 Ajout des colonnes manquantes à la table tickets...');
    
    // Ajouter les colonnes manquantes
    await pool.query(`
      ALTER TABLE tickets 
      ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ
    `);
    
    console.log('✅ Colonnes ajoutées avec succès');
    
    // Vérifier la structure de la table
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'tickets' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Structure de la table tickets:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

addMissingColumns();
