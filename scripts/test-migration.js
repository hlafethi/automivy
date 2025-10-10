import { Pool } from 'pg';

// Configuration de la base de données
const pool = new Pool({
  host: process.env.DB_HOST || '147.93.58.155',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'automivy',
  user: process.env.DB_USER || 'fethi',
  password: process.env.DB_PASSWORD || 'Fethi@2025!',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function testMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Test de la migration PostgreSQL...');
    
    // Test 1: Connexion à la base de données
    console.log('1️⃣ Test de connexion...');
    const result = await client.query('SELECT NOW()');
    console.log('✅ Connexion réussie à', result.rows[0].now);
    
    // Test 2: Vérifier les tables
    console.log('2️⃣ Vérification des tables...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const expectedTables = [
      'admin_api_keys',
      'email_credentials', 
      'oauth_credentials',
      'templates',
      'user_profiles',
      'users',
      'workflows'
    ];
    
    const existingTables = tables.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('❌ Tables manquantes :', missingTables);
      return false;
    }
    
    console.log('✅ Toutes les tables sont présentes');
    
    // Test 3: Vérifier les politiques RLS
    console.log('3️⃣ Vérification des politiques RLS...');
    const policies = await client.query(`
      SELECT schemaname, tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `);
    
    console.log(`✅ ${policies.rows.length} politiques RLS configurées`);
    
    // Test 4: Vérifier l'utilisateur admin
    console.log('4️⃣ Vérification de l\'utilisateur admin...');
    const adminUser = await client.query(`
      SELECT id, email, role 
      FROM users 
      WHERE email = 'admin@automivy.com'
    `);
    
    if (adminUser.rows.length === 0) {
      console.log('❌ Utilisateur admin non trouvé');
      return false;
    }
    
    console.log('✅ Utilisateur admin trouvé :', adminUser.rows[0].email);
    
    // Test 5: Vérifier les index
    console.log('5️⃣ Vérification des index...');
    const indexes = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    console.log(`✅ ${indexes.rows.length} index configurés`);
    
    // Test 6: Vérifier les triggers
    console.log('6️⃣ Vérification des triggers...');
    const triggers = await client.query(`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `);
    
    console.log(`✅ ${triggers.rows.length} triggers configurés`);
    
    console.log('🎉 Migration testée avec succès !');
    console.log('📊 Résumé :');
    console.log(`   - Tables : ${existingTables.length}/${expectedTables.length}`);
    console.log(`   - Politiques RLS : ${policies.rows.length}`);
    console.log(`   - Index : ${indexes.rows.length}`);
    console.log(`   - Triggers : ${triggers.rows.length}`);
    console.log(`   - Utilisateur admin : ✅`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erreur lors du test :', error.message);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécuter le test
testMigration()
  .then((success) => {
    if (success) {
      console.log('✅ Test terminé avec succès');
      process.exit(0);
    } else {
      console.log('❌ Test échoué');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Erreur fatale :', error);
    process.exit(1);
  });

export { testMigration };
