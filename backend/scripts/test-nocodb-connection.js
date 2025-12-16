/**
 * Script de test pour vérifier l'accès à NocoDB et tester la création de tables
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fetch = require('node-fetch');

const NOCODB_BASE_URL = process.env.NOCODB_BASE_URL || 'https://nocodb.globalsaas.eu';
const NOCODB_BASE_ID = process.env.NOCODB_BASE_ID || 'pp5u74rzjgowecq';
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN;

async function testNocoDbConnection() {
  console.log('🔍 Test de connexion à NocoDB...\n');
  console.log('Configuration:');
  console.log(`  Base URL: ${NOCODB_BASE_URL}`);
  console.log(`  Base ID: ${NOCODB_BASE_ID}`);
  console.log(`  API Token: ${NOCODB_API_TOKEN ? NOCODB_API_TOKEN.substring(0, 10) + '...' : 'NON CONFIGURÉ'}\n`);

  if (!NOCODB_API_TOKEN) {
    console.error('❌ NOCODB_API_TOKEN non configuré dans .env');
    return;
  }

  // Test 1: Lister les bases existantes
  console.log('📋 Test 1: Lister les bases...');
  try {
    const basesUrl = `${NOCODB_BASE_URL}/api/v2/meta/bases`;
    const basesResponse = await fetch(basesUrl, {
      method: 'GET',
      headers: {
        'xc-token': NOCODB_API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (basesResponse.ok) {
      const bases = await basesResponse.json();
      console.log(`✅ Accès aux bases réussi. ${bases.list?.length || 0} base(s) trouvée(s)`);
      if (bases.list && bases.list.length > 0) {
        console.log('  Bases disponibles:');
        bases.list.forEach(base => {
          console.log(`    - ${base.title || base.id} (ID: ${base.id})`);
        });
      }
    } else {
      const errorText = await basesResponse.text();
      console.error(`❌ Erreur accès aux bases: ${basesResponse.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des bases:', error.message);
  }

  console.log('\n');

  // Test 2: Lister les tables de la base
  console.log('📋 Test 2: Lister les tables de la base...');
  try {
    const tablesUrl = `${NOCODB_BASE_URL}/api/v2/meta/bases/${NOCODB_BASE_ID}/tables`;
    const tablesResponse = await fetch(tablesUrl, {
      method: 'GET',
      headers: {
        'xc-token': NOCODB_API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (tablesResponse.ok) {
      const tables = await tablesResponse.json();
      console.log(`✅ Accès aux tables réussi. ${tables.list?.length || 0} table(s) trouvée(s)`);
      if (tables.list && tables.list.length > 0) {
        console.log('  Tables existantes:');
        tables.list.slice(0, 5).forEach(table => {
          console.log(`    - ${table.table_name || table.title} (ID: ${table.id})`);
        });
        if (tables.list.length > 5) {
          console.log(`    ... et ${tables.list.length - 5} autre(s) table(s)`);
        }
      }
    } else {
      const errorText = await tablesResponse.text();
      console.error(`❌ Erreur accès aux tables: ${tablesResponse.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des tables:', error.message);
  }

  console.log('\n');

  // Test 3: Créer une table de test avec format minimal
  console.log('📋 Test 3: Créer une table de test (format minimal)...');
  const testTableName = `test_table_${Date.now()}`;
  
  const minimalFormat = {
    table_name: testTableName,
    title: `Table de test - ${new Date().toISOString()}`,
    columns: [
      {
        column_name: 'test_column',
        title: 'Test Column',
        dt: 'varchar'
      }
    ]
  };

  try {
    const createUrl = `${NOCODB_BASE_URL}/api/v2/meta/bases/${NOCODB_BASE_ID}/tables`;
    console.log(`  URL: ${createUrl}`);
    console.log(`  Payload:`, JSON.stringify(minimalFormat, null, 2));
    
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'xc-token': NOCODB_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(minimalFormat)
    });

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log(`✅ Table créée avec succès!`);
      console.log(`  Table ID: ${result.id}`);
      console.log(`  Table Name: ${result.table_name}`);
      
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
        console.log(`  ⚠️  Impossible de supprimer la table de test (${deleteResponse.status})`);
      }
    } else {
      const errorText = await createResponse.text();
      console.error(`❌ Erreur création table: ${createResponse.status}`);
      console.error(`  Erreur: ${errorText}`);
      
      // Essayer avec un format encore plus simple
      console.log('\n📋 Test 3b: Essayer avec format encore plus simple...');
      const simplerFormat = {
        table_name: `test_table_2_${Date.now()}`,
        columns: [
          {
            column_name: 'test',
            dt: 'varchar'
          }
        ]
      };
      
      console.log(`  Payload:`, JSON.stringify(simplerFormat, null, 2));
      const createResponse2 = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'xc-token': NOCODB_API_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(simplerFormat)
      });
      
      if (createResponse2.ok) {
        const result2 = await createResponse2.json();
        console.log(`✅ Table créée avec format simple!`);
        console.log(`  Table ID: ${result2.id}`);
        
        // Supprimer
        const deleteUrl2 = `${NOCODB_BASE_URL}/api/v2/meta/tables/${result2.id}`;
        await fetch(deleteUrl2, {
          method: 'DELETE',
          headers: {
            'xc-token': NOCODB_API_TOKEN
          }
        });
      } else {
        const errorText2 = await createResponse2.text();
        console.error(`❌ Erreur avec format simple aussi: ${errorText2}`);
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de la création de la table:', error.message);
    console.error('  Stack:', error.stack);
  }

  console.log('\n');
  
  // Test 4: Vérifier la structure d'une table existante (si disponible)
  console.log('📋 Test 4: Vérifier la structure d\'une table existante...');
  try {
    const tablesUrl = `${NOCODB_BASE_URL}/api/v2/meta/bases/${NOCODB_BASE_ID}/tables`;
    const tablesResponse = await fetch(tablesUrl, {
      method: 'GET',
      headers: {
        'xc-token': NOCODB_API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (tablesResponse.ok) {
      const tables = await tablesResponse.json();
      if (tables.list && tables.list.length > 0) {
        const firstTable = tables.list[0];
        console.log(`  Analyse de la table: ${firstTable.table_name || firstTable.title}`);
        
        // Récupérer les colonnes
        const columnsUrl = `${NOCODB_BASE_URL}/api/v2/meta/tables/${firstTable.id}/columns`;
        const columnsResponse = await fetch(columnsUrl, {
          method: 'GET',
          headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json'
          }
        });
        
        if (columnsResponse.ok) {
          const columns = await columnsResponse.json();
          console.log(`  ✅ ${columns.list?.length || 0} colonne(s) trouvée(s)`);
          if (columns.list && columns.list.length > 0) {
            console.log('  Exemple de colonne:');
            const exampleCol = columns.list[0];
            console.log('    ', JSON.stringify(exampleCol, null, 2));
          }
        }
      } else {
        console.log('  ⚠️  Aucune table existante pour analyser');
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error.message);
  }

  console.log('\n✅ Tests terminés');
}

// Exécuter les tests
testNocoDbConnection().catch(console.error);

