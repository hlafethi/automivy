/**
 * Script pour vérifier que le template IMAP Tri Automatique BAL a bien été corrigé
 */

const db = require('../database');

async function verifyFix() {
  console.log('🔍 [VerifyFix] Vérification de la correction du template IMAP Tri Automatique BAL...\n');
  
  try {
    // Récupérer le template depuis la base de données
    const result = await db.query(
      `SELECT id, name, json FROM templates WHERE name ILIKE '%IMAP Tri Automatique BAL%'`
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.error('❌ [VerifyFix] Aucun template IMAP Tri Automatique BAL trouvé');
      return false;
    }
    
    const template = result.rows[0];
    console.log(`✅ [VerifyFix] Template trouvé: ${template.name}`);
    console.log(`   ID: ${template.id}\n`);
    
    // Parser le JSON
    const workflowJson = typeof template.json === 'string' 
      ? JSON.parse(template.json) 
      : template.json;
    
    // Trouver le nœud "Normaliser Emails2"
    const normaliserNode = workflowJson.nodes?.find(n => n.name === 'Normaliser Emails2');
    
    if (!normaliserNode) {
      console.error('❌ [VerifyFix] Nœud "Normaliser Emails2" non trouvé');
      return false;
    }
    
    const code = normaliserNode.parameters?.jsCode || '';
    
    // Vérifier si la correction est présente
    const hasFix1 = code.includes('skip: true') && code.includes('Aucun email à traiter');
    const hasFix2 = code.includes('skip: true') && code.includes('Aucun email valide à traiter');
    const hasReturnEmpty = code.includes('return [];') && code.includes('items.length === 0');
    
    console.log('📋 [VerifyFix] Analyse du code:');
    console.log(`   - Contient "skip: true" et "Aucun email à traiter": ${hasFix1 ? '✅ OUI' : '❌ NON'}`);
    console.log(`   - Contient "skip: true" et "Aucun email valide": ${hasFix2 ? '✅ OUI' : '❌ NON'}`);
    console.log(`   - Contient encore "return []" pour items.length === 0: ${hasReturnEmpty ? '⚠️ OUI (problème)' : '✅ NON'}`);
    
    if (hasFix1 || hasFix2) {
      console.log('\n✅ [VerifyFix] CORRECTION PRÉSENTE - Le template est bien corrigé!');
      
      // Afficher un extrait du code corrigé
      const fixIndex = code.indexOf('skip: true');
      if (fixIndex > -1) {
        const start = Math.max(0, fixIndex - 50);
        const end = Math.min(code.length, fixIndex + 150);
        console.log('\n📝 [VerifyFix] Extrait du code corrigé:');
        console.log('   ' + code.substring(start, end).replace(/\n/g, '\n   '));
      }
      
      return true;
    } else {
      console.log('\n❌ [VerifyFix] CORRECTION ABSENTE - Le template n\'a pas été corrigé!');
      return false;
    }
    
  } catch (error) {
    console.error('❌ [VerifyFix] Erreur:', error);
    console.error('❌ [VerifyFix] Stack:', error.stack);
    return false;
  } finally {
    await db.pool.end();
  }
}

// Exécuter la vérification
if (require.main === module) {
  verifyFix()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de la vérification:', error);
      process.exit(1);
    });
}

module.exports = { verifyFix };

