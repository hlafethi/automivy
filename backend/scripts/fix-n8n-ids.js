const { Pool } = require('pg');

const pool = new Pool({
  host: '147.93.58.155',
  port: 5432,
  database: 'automivy',
  user: 'fethi',
  password: 'Fethi@2025!',
  ssl: false,
});

async function fixN8nIds() {
  let client;
  try {
    client = await pool.connect();
    console.log('🔌 Connexion à la base de données...');

    // Récupérer tous les workflows
    console.log('📋 Récupération des workflows...');
    const workflowsResult = await client.query('SELECT * FROM workflows ORDER BY created_at DESC');
    console.log(`📊 ${workflowsResult.rows.length} workflows trouvés`);

    for (const workflow of workflowsResult.rows) {
      console.log(`\n🔍 Workflow: ${workflow.name}`);
      console.log(`   ID en base: ${workflow.id}`);
      console.log(`   n8n_workflow_id: ${workflow.n8n_workflow_id}`);
      console.log(`   Créé le: ${workflow.created_at}`);
      
      // Si l'ID n8n est vide ou invalide, on le marque pour suppression
      if (!workflow.n8n_workflow_id || workflow.n8n_workflow_id.trim() === '') {
        console.log(`   ⚠️  Pas d'ID n8n - sera supprimé`);
      } else {
        console.log(`   ✅ ID n8n présent: ${workflow.n8n_workflow_id}`);
      }
    }

    // Demander confirmation pour supprimer les workflows sans ID n8n
    console.log('\n🗑️  Suppression des workflows sans ID n8n valide...');
    const deleteResult = await client.query(`
      DELETE FROM workflows 
      WHERE n8n_workflow_id IS NULL 
      OR n8n_workflow_id = '' 
      OR n8n_workflow_id = '{}'
    `);
    console.log(`✅ ${deleteResult.rowCount} workflows supprimés`);

    // Vérifier les workflows restants
    const remainingResult = await client.query('SELECT COUNT(*) FROM workflows');
    console.log(`📊 Workflows restants: ${remainingResult.rows[0].count}`);

    console.log('✅ Script terminé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la correction des IDs n8n :', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

fixN8nIds().catch(error => {
  console.error('❌ Script échoué :', error);
  process.exit(1);
});
