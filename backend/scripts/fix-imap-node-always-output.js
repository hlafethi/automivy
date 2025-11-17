/**
 * Script pour corriger le template IMAP Tri Automatique BAL
 * Active l'option "Always Output Data" sur le nœud IMAP "Lire INBOX2"
 * pour que le workflow continue même si aucun email n'est trouvé
 */

const db = require('../database');

async function fixImapNodeAlwaysOutput() {
  console.log('🔧 [FixImapNode] Début de la correction du nœud IMAP...');
  
  try {
    // 1. Récupérer le template depuis la base de données
    const templates = await db.query(
      `SELECT * FROM templates WHERE name ILIKE '%IMAP Tri Automatique BAL%'`
    );
    
    if (!templates.rows || templates.rows.length === 0) {
      console.error('❌ [FixImapNode] Aucun template IMAP Tri Automatique BAL trouvé');
      return;
    }
    
    console.log(`✅ [FixImapNode] ${templates.rows.length} template(s) trouvé(s)`);
    
    for (const template of templates.rows) {
      console.log(`\n🔧 [FixImapNode] Traitement du template: ${template.name} (ID: ${template.id})`);
      
      // 2. Parser le JSON du template
      let workflowJson;
      try {
        workflowJson = typeof template.json === 'string' 
          ? JSON.parse(template.json) 
          : template.json;
      } catch (error) {
        console.error(`❌ [FixImapNode] Erreur lors du parsing du JSON:`, error.message);
        continue;
      }
      
      if (!workflowJson.nodes) {
        console.error(`❌ [FixImapNode] Aucun nœud trouvé dans le workflow`);
        continue;
      }
      
      // 3. Trouver et modifier le nœud IMAP "Lire INBOX2"
      let modified = false;
      const modifiedNodes = workflowJson.nodes.map((node) => {
        // Trouver le nœud IMAP qui lit INBOX (peut s'appeler "Lire INBOX2" ou similaire)
        if (node.type === 'n8n-nodes-imap.imap' && 
            node.parameters?.resource === 'email' &&
            (node.name?.toLowerCase().includes('lire') || 
             node.name?.toLowerCase().includes('read') ||
             node.parameters?.mailboxPath?.value === 'INBOX')) {
          
          // Vérifier si l'option est déjà activée
          if (node.alwaysOutputData === true) {
            console.log(`  ✅ [FixImapNode] Le nœud "${node.name}" a déjà "alwaysOutputData" activé`);
            return node;
          }
          
          // Activer l'option "Always Output Data"
          node.alwaysOutputData = true;
          modified = true;
          console.log(`  ✅ [FixImapNode] Option "alwaysOutputData" activée pour "${node.name}"`);
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
        
        console.log(`✅ [FixImapNode] Template "${template.name}" mis à jour avec succès`);
      } else {
        console.log(`ℹ️ [FixImapNode] Aucune modification nécessaire pour "${template.name}"`);
      }
    }
    
    console.log('\n✅ [FixImapNode] Correction terminée avec succès!');
    
  } catch (error) {
    console.error('❌ [FixImapNode] Erreur:', error);
    console.error('❌ [FixImapNode] Stack:', error.stack);
    throw error;
  } finally {
    // Fermer la connexion à la base de données
    await db.pool.end();
  }
}

// Exécuter le script
if (require.main === module) {
  fixImapNodeAlwaysOutput()
    .then(() => {
      console.log('✅ Script terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur lors de l\'exécution du script:', error);
      process.exit(1);
    });
}

module.exports = { fixImapNodeAlwaysOutput };

