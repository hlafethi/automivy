/**
 * Script pour analyser la structure exacte des colonnes NocoDB
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fetch = require('node-fetch');

const NOCODB_BASE_URL = process.env.NOCODB_BASE_URL || 'https://nocodb.globalsaas.eu';
const NOCODB_BASE_ID = process.env.NOCODB_BASE_ID || 'pp5u74rzjgowecq';
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN;

async function analyzeColumns() {
  console.log('🔍 Analyse de la structure des colonnes NocoDB...\n');

  try {
    // Récupérer les tables
    const tablesUrl = `${NOCODB_BASE_URL}/api/v2/meta/bases/${NOCODB_BASE_ID}/tables`;
    const tablesResponse = await fetch(tablesUrl, {
      method: 'GET',
      headers: {
        'xc-token': NOCODB_API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!tablesResponse.ok) {
      throw new Error(`Erreur: ${tablesResponse.status}`);
    }

    const tables = await tablesResponse.json();
    
    if (tables.list && tables.list.length > 0) {
      // Analyser la première table
      const firstTable = tables.list[0];
      console.log(`📋 Analyse de la table: ${firstTable.table_name || firstTable.title} (ID: ${firstTable.id})\n`);
      
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
        console.log(`✅ ${columns.list?.length || 0} colonne(s) trouvée(s)\n`);
        
        if (columns.list && columns.list.length > 0) {
          console.log('📊 Structure complète des colonnes:\n');
          columns.list.forEach((col, index) => {
            console.log(`Colonne ${index + 1}:`);
            console.log(JSON.stringify(col, null, 2));
            console.log('');
          });
        }
      }
    }
    
    // Test: Créer une table avec différents formats
    console.log('\n🧪 Test de création avec différents formats...\n');
    
    // Format 1: Avec rqd
    console.log('Test 1: Format avec rqd');
    const format1 = {
      table_name: `test_rqd_${Date.now()}`,
      title: 'Test avec rqd',
      columns: [
        {
          column_name: 'col1',
          title: 'Colonne 1',
          dt: 'varchar',
          rqd: true
        },
        {
          column_name: 'col2',
          title: 'Colonne 2',
          dt: 'varchar',
          rqd: false
        }
      ]
    };
    
    try {
      const createUrl = `${NOCODB_BASE_URL}/api/v2/meta/bases/${NOCODB_BASE_ID}/tables`;
      const response1 = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'xc-token': NOCODB_API_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(format1)
      });
      
      if (response1.ok) {
        const result = await response1.json();
        console.log('  ✅ Format avec rqd fonctionne');
        // Supprimer
        await fetch(`${NOCODB_BASE_URL}/api/v2/meta/tables/${result.id}`, {
          method: 'DELETE',
          headers: { 'xc-token': NOCODB_API_TOKEN }
        });
      } else {
        const error = await response1.text();
        console.log(`  ❌ Format avec rqd échoue: ${error}`);
      }
    } catch (error) {
      console.log(`  ❌ Erreur: ${error.message}`);
    }
    
    // Format 2: Avec cdf
    console.log('\nTest 2: Format avec cdf');
    const format2 = {
      table_name: `test_cdf_${Date.now()}`,
      title: 'Test avec cdf',
      columns: [
        {
          column_name: 'col1',
          title: 'Colonne 1',
          dt: 'varchar',
          cdf: "'default_value'"
        }
      ]
    };
    
    try {
      const createUrl = `${NOCODB_BASE_URL}/api/v2/meta/bases/${NOCODB_BASE_ID}/tables`;
      const response2 = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'xc-token': NOCODB_API_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(format2)
      });
      
      if (response2.ok) {
        const result = await response2.json();
        console.log('  ✅ Format avec cdf fonctionne');
        // Supprimer
        await fetch(`${NOCODB_BASE_URL}/api/v2/meta/tables/${result.id}`, {
          method: 'DELETE',
          headers: { 'xc-token': NOCODB_API_TOKEN }
        });
      } else {
        const error = await response2.text();
        console.log(`  ❌ Format avec cdf échoue: ${error}`);
      }
    } catch (error) {
      console.log(`  ❌ Erreur: ${error.message}`);
    }
    
    // Format 3: Avec datetime
    console.log('\nTest 3: Format avec datetime');
    const format3 = {
      table_name: `test_datetime_${Date.now()}`,
      title: 'Test avec datetime',
      columns: [
        {
          column_name: 'col1',
          title: 'Colonne 1',
          dt: 'datetime'
        }
      ]
    };
    
    try {
      const createUrl = `${NOCODB_BASE_URL}/api/v2/meta/bases/${NOCODB_BASE_ID}/tables`;
      const response3 = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'xc-token': NOCODB_API_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(format3)
      });
      
      if (response3.ok) {
        const result = await response3.json();
        console.log('  ✅ Format avec datetime fonctionne');
        // Supprimer
        await fetch(`${NOCODB_BASE_URL}/api/v2/meta/tables/${result.id}`, {
          method: 'DELETE',
          headers: { 'xc-token': NOCODB_API_TOKEN }
        });
      } else {
        const error = await response3.text();
        console.log(`  ❌ Format avec datetime échoue: ${error}`);
      }
    } catch (error) {
      console.log(`  ❌ Erreur: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
  
  console.log('\n✅ Analyse terminée');
}

analyzeColumns().catch(console.error);

