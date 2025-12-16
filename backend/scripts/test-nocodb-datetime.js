/**
 * Script pour tester les types de colonnes datetime dans NocoDB
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fetch = require('node-fetch');

const NOCODB_BASE_URL = process.env.NOCODB_BASE_URL || 'https://nocodb.globalsaas.eu';
const NOCODB_BASE_ID = process.env.NOCODB_BASE_ID || 'pp5u74rzjgowecq';
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN;

async function testDateTimeTypes() {
  console.log('🔍 Test des types datetime dans NocoDB...\n');

  const typesToTest = [
    'datetime',
    'timestamp',
    'timestampz',
    'timestamptz',
    'date',
    'time',
    'datetime2'
  ];

  for (const dtType of typesToTest) {
    console.log(`Test avec type: ${dtType}`);
    const testTable = {
      table_name: `test_${dtType}_${Date.now()}`,
      title: `Test ${dtType}`,
      columns: [
        {
          column_name: 'test_date',
          title: 'Test Date',
          dt: dtType
        }
      ]
    };

    try {
      const createUrl = `${NOCODB_BASE_URL}/api/v2/meta/bases/${NOCODB_BASE_ID}/tables`;
      const response = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'xc-token': NOCODB_API_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testTable)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`  ✅ Type ${dtType} fonctionne ! (Table ID: ${result.id})`);
        
        // Supprimer la table
        await fetch(`${NOCODB_BASE_URL}/api/v2/meta/tables/${result.id}`, {
          method: 'DELETE',
          headers: { 'xc-token': NOCODB_API_TOKEN }
        });
      } else {
        const error = await response.text();
        console.log(`  ❌ Type ${dtType} échoue: ${error.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`  ❌ Erreur avec ${dtType}: ${error.message}`);
    }
    
    console.log('');
  }

  // Vérifier les colonnes existantes pour voir leur type
  console.log('\n📋 Analyse des colonnes datetime existantes...\n');
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
      
      for (const table of tables.list || []) {
        const columnsUrl = `${NOCODB_BASE_URL}/api/v2/meta/tables/${table.id}/columns`;
        const columnsResponse = await fetch(columnsUrl, {
          method: 'GET',
          headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json'
          }
        });
        
        if (columnsResponse.ok) {
          const columns = await columnsResponse.json();
          const dateColumns = (columns.list || []).filter(col => 
            col.dt && (
              col.dt.includes('time') || 
              col.dt.includes('date') ||
              col.dt === 'timestamp' ||
              col.dt === 'timestamptz'
            )
          );
          
          if (dateColumns.length > 0) {
            console.log(`Table: ${table.table_name || table.title}`);
            dateColumns.forEach(col => {
              console.log(`  - ${col.column_name}: dt="${col.dt}", uidt="${col.uidt || 'N/A'}"`);
            });
            console.log('');
          }
        }
      }
    }
  } catch (error) {
    console.error('Erreur:', error.message);
  }

  console.log('✅ Tests terminés');
}

testDateTimeTypes().catch(console.error);

