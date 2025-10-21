const { Pool } = require('pg');

const pool = new Pool({
  user: 'fethi',
  host: '147.93.58.155',
  database: 'automivy',
  password: 'Fethi@2025!',
  port: 5432,
});

async function createLandingTable() {
  try {
    console.log('🚀 Création de la table landing_sections...');

    // Créer la table landing_sections
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS landing_sections (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        section text NOT NULL UNIQUE,
        content jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `;

    await pool.query(createTableQuery);
    console.log('✅ Table landing_sections créée avec succès');

    // Créer un index sur la colonne section
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_landing_sections_section 
      ON landing_sections(section);
    `;

    await pool.query(createIndexQuery);
    console.log('✅ Index créé avec succès');

    // Créer un trigger pour auto-update updated_at
    const createTriggerQuery = `
      CREATE OR REPLACE FUNCTION update_landing_sections_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS landing_sections_updated_at ON landing_sections;
      CREATE TRIGGER landing_sections_updated_at
        BEFORE UPDATE ON landing_sections
        FOR EACH ROW
        EXECUTE FUNCTION update_landing_sections_updated_at();
    `;

    await pool.query(createTriggerQuery);
    console.log('✅ Trigger créé avec succès');

    // Vérifier que la table existe
    const checkTableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'landing_sections';
    `;

    const result = await pool.query(checkTableQuery);
    if (result.rows.length > 0) {
      console.log('✅ Table landing_sections existe dans la base de données');
    } else {
      console.log('❌ Table landing_sections n\'existe pas');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la création de la table :', error);
  } finally {
    await pool.end();
  }
}

createLandingTable();
