/**
 * Script pour créer les tables d'un utilisateur spécifique
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const nocoDbService = require('../services/nocoDbService');

const userId = '8c210030-7d0a-48ee-97d2-b74564b1efef'; // user@heleam.com
const userEmail = 'user@heleam.com';

async function createUserTables() {
  console.log('🔍 Création des tables pour l\'utilisateur...\n');
  console.log(`User ID: ${userId}`);
  console.log(`Email: ${userEmail}\n`);

  try {
    const results = await nocoDbService.createUserTables(userId, userEmail);
    
    console.log('\n✅ Résultats:');
    if (results.postsTable) {
      console.log(`  ✅ Table posts créée/récupérée: ${results.postsTable.table_name || results.postsTable.title} (ID: ${results.postsTable.id})`);
    } else {
      console.log('  ⚠️  Table posts non créée');
    }
    
    if (results.usersTable) {
      console.log(`  ✅ Table users créée/récupérée: ${results.usersTable.table_name || results.usersTable.title} (ID: ${results.usersTable.id})`);
    } else {
      console.log('  ⚠️  Table users non créée');
    }
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

createUserTables().catch(console.error);

