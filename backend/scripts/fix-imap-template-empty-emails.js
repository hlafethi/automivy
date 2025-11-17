/**
 * Script pour corriger le template IMAP Tri Automatique BAL
 * Modifie le nœud "Normaliser Emails2" pour qu'il continue même si aucun email n'est trouvé
 */

const db = require('../database');
const config = require('../config');

async function fixImapTemplate() {
  console.log('🔧 [FixImapTemplate] Début de la correction du template IMAP Tri Automatique BAL...');
  
  try {
    // 1. Récupérer le template depuis la base de données
    const templates = await db.query(
      `SELECT * FROM templates WHERE name ILIKE '%IMAP Tri Automatique BAL%' OR name ILIKE '%imap Tri Automatique BAL%'`
    );
    
    if (!templates.rows || templates.rows.length === 0) {
      console.error('❌ [FixImapTemplate] Aucun template IMAP Tri Automatique BAL trouvé');
      return;
    }
    
    console.log(`✅ [FixImapTemplate] ${templates.rows.length} template(s) trouvé(s)`);
    
    for (const template of templates.rows) {
      console.log(`\n🔧 [FixImapTemplate] Traitement du template: ${template.name} (ID: ${template.id})`);
      
      // 2. Parser le JSON du template
      let workflowJson;
      try {
        workflowJson = typeof template.json === 'string' 
          ? JSON.parse(template.json) 
          : template.json;
      } catch (error) {
        console.error(`❌ [FixImapTemplate] Erreur lors du parsing du JSON:`, error.message);
        continue;
      }
      
      if (!workflowJson.nodes) {
        console.error(`❌ [FixImapTemplate] Aucun nœud trouvé dans le workflow`);
        continue;
      }
      
      // 3. Trouver et modifier le nœud "Normaliser Emails2"
      let modified = false;
      const modifiedNodes = workflowJson.nodes.map((node) => {
        if (node.name === 'Normaliser Emails2' && node.type === 'n8n-nodes-base.code') {
          const originalCode = node.parameters?.jsCode || '';
          
          // Vérifier si le code a déjà été modifié
          if (originalCode.includes('skip: true') && originalCode.includes('Aucun email à traiter')) {
            console.log(`  ✅ [FixImapTemplate] Le nœud "${node.name}" a déjà été corrigé`);
            return node;
          }
          
          // Modifier le code pour retourner un item avec skip: true au lieu de []
          let modifiedCode = originalCode;
          
          // Pattern 1: Remplacer "return [];" quand items.length === 0
          modifiedCode = modifiedCode.replace(
            /if\s*\(!items\s*\|\|\s*items\.length\s*===\s*0\)\s*\{[\s\S]*?return\s*\[\];[\s\S]*?\}/g,
            `if (!items || items.length === 0) {
  console.log('❌ Aucun email reçu');
  return [{ json: { skip: true, message: 'Aucun email à traiter', emails: [] } }];
}`
          );
          
          // Pattern 2: Remplacer "return [];" quand emails.length === 0
          modifiedCode = modifiedCode.replace(
            /if\s*\(emails\.length\s*===\s*0\)\s*\{[\s\S]*?return\s*\[\];[\s\S]*?\}/g,
            `if (emails.length === 0) {
  console.log('⚠️ Aucun email valide à traiter');
  return [{ json: { skip: true, message: 'Aucun email valide à traiter', emails: [] } }];
}`
          );
          
          if (modifiedCode !== originalCode) {
            node.parameters.jsCode = modifiedCode;
            modified = true;
            console.log(`  ✅ [FixImapTemplate] Code du nœud "${node.name}" modifié`);
          } else {
            console.log(`  ⚠️ [FixImapTemplate] Aucune modification nécessaire pour "${node.name}"`);
          }
        }
        
        return node;
      });
      
      if (modified) {
        // 4. Mettre à jour le template dans la base de données
        workflowJson.nodes = modifiedNodes;
        
        await db.query(
          'UPDATE templates SET json = $1 WHERE id = $2',
          [JSON.stringify(workflowJson), template.id]
        );
        
        console.log(`✅ [FixImapTemplate] Template "${template.name}" mis à jour avec succès`);
      } else {
        console.log(`ℹ️ [FixImapTemplate] Aucune modification nécessaire pour "${template.name}"`);
      }
    }
    
    console.log('\n✅ [FixImapTemplate] Correction terminée avec succès!');
    
  } catch (error) {
    console.error('❌ [FixImapTemplate] Erreur:', error);
    console.error('❌ [FixImapTemplate] Stack:', error.stack);
    throw error;
  } finally {
    // Fermer la connexion à la base de données
    await db.pool.end();
  }
}

// Exécuter le script
if (require.main === module) {
  fixImapTemplate()
    .then(() => {
      console.log('✅ Script terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de l\'exécution du script:', error);
      process.exit(1);
    });
}

module.exports = { fixImapTemplate };

