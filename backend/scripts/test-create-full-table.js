/**
 * Script pour tester la création d'une table complète avec le format corrigé
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fetch = require('node-fetch');

const NOCODB_BASE_URL = process.env.NOCODB_BASE_URL || 'https://nocodb.globalsaas.eu';
const NOCODB_BASE_ID = process.env.NOCODB_BASE_ID || 'pp5u74rzjgowecq';
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN;

async function testFullTable() {
  console.log('🔍 Test de création d\'une table complète (format posts)...\n');

  const postsTable = {
    table_name: `posts_user_test_${Date.now()}`,
    title: `Posts LinkedIn - Test`,
    columns: [
      {
        column_name: 'theme',
        title: 'Thème',
        dt: 'varchar',
        rqd: false
      },
      {
        column_name: 'content',
        title: 'Contenu',
        dt: 'text',
        rqd: false
      },
      {
        column_name: 'status',
        title: 'Statut',
        dt: 'varchar',
        rqd: false,
        cdf: "'pending'"
      },
      {
        column_name: 'userId',
        title: 'User ID',
        dt: 'varchar',
        rqd: true
      },
      {
        column_name: 'linkedinPostId',
        title: 'LinkedIn Post ID',
        dt: 'varchar',
        rqd: false
      },
      {
        column_name: 'createdAt',
        title: 'Créé le',
        dt: 'timestamp',
        rqd: false
      },
      {
        column_name: 'publishedAt',
        title: 'Publié le',
        dt: 'timestamp',
        rqd: false
      }
    ]
  };

  try {
    const createUrl = `${NOCODB_BASE_URL}/api/v2/meta/bases/${NOCODB_BASE_ID}/tables`;
    console.log('📤 Envoi de la requête...');
    console.log('Payload:', JSON.stringify(postsTable, null, 2));
    
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'xc-token': NOCODB_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postsTable)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ Table créée avec succès!');
      console.log(`  Table ID: ${result.id}`);
      console.log(`  Table Name: ${result.table_name}`);
      console.log(`  Colonnes: ${result.columns?.length || 0}`);
      
      // Vérifier les colonnes créées
      if (result.columns) {
        console.log('\n  Colonnes créées:');
        result.columns.forEach(col => {
          console.log(`    - ${col.column_name} (${col.dt})`);
        });
      }
      
      // Supprimer la table de test
      console.log('\n  🗑️  Suppression de la table de test...');
      const deleteUrl = `${NOCODB_BASE_URL}/api/v2/meta/tables/${result.id}`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'xc-token': NOCODB_API_TOKEN
        }
      });
      
      if (deleteResponse.ok) {
        console.log('  ✅ Table de test supprimée');
      } else {
        console.log(`  ⚠️  Impossible de supprimer (${deleteResponse.status})`);
      }
    } else {
      const errorText = await response.text();
      console.error(`\n❌ Erreur création table: ${response.status}`);
      console.error(`  Erreur: ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }

  console.log('\n✅ Test terminé');
}

testFullTable().catch(console.error);

