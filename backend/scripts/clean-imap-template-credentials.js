/**
 * Script pour nettoyer le template IMAP Tri Automatique BAL
 * Supprime tous les credentials utilisateur spécifiques et les remplace par des placeholders
 */

const db = require('../database');

async function cleanImapTemplateCredentials() {
  console.log('🔧 [CleanImapTemplate] Début du nettoyage du template IMAP Tri Automatique BAL...');
  
  try {
    // 1. Récupérer le template depuis la base de données
    const templates = await db.query(
      `SELECT * FROM templates WHERE name ILIKE '%IMAP Tri Automatique BAL%' OR name ILIKE '%imap Tri Automatique BAL%'`
    );
    
    if (!templates.rows || templates.rows.length === 0) {
      console.error('❌ [CleanImapTemplate] Aucun template IMAP Tri Automatique BAL trouvé');
      return;
    }
    
    console.log(`✅ [CleanImapTemplate] ${templates.rows.length} template(s) trouvé(s)`);
    
    for (const template of templates.rows) {
      console.log(`\n🔍 [CleanImapTemplate] Traitement du template: ${template.name} (ID: ${template.id})`);
      
      // Parser le JSON
      let workflowJson;
      try {
        workflowJson = typeof template.json === 'string' 
          ? JSON.parse(template.json) 
          : template.json;
      } catch (parseError) {
        console.error(`❌ [CleanImapTemplate] Erreur parsing JSON pour ${template.name}:`, parseError.message);
        continue;
      }
      
      if (!workflowJson || !workflowJson.nodes) {
        console.error(`❌ [CleanImapTemplate] Workflow JSON invalide pour ${template.name}`);
        continue;
      }
      
      // Liste des anciens credentials connus à supprimer
      const oldCredentialIds = [
        'TzbdyviB9rwphQKY',
        'LHBrt9bgHWvgfN4C',
        'zDtY5xDI7IO0bwOY',
        'MyExjQHQcE7OQq3k',
        'uTAvaVgPIcQtnKbj',
        '7tcFf2ZH4qlW6GtS',
        'rnhJlsgeO6dznTJE'
      ];
      
      let credentialsCleaned = 0;
      let nodesModified = 0;
      
      // Parcourir tous les nœuds et nettoyer les credentials
      workflowJson.nodes = workflowJson.nodes.map((node) => {
        const cleanedNode = { ...node };
        let nodeModified = false;
        
        // Nettoyer les credentials IMAP
        if (node.type === 'n8n-nodes-imap.imap' || 
            node.type === 'n8n-nodes-base.emailReadImap' ||
            node.type === 'n8n-nodes-imap-enhanced.imapEnhanced') {
          if (node.credentials) {
            const imapCred = node.credentials.imapApi || node.credentials.imap;
            if (imapCred && imapCred.id) {
              // Vérifier si c'est un ancien credential à supprimer
              if (oldCredentialIds.includes(imapCred.id)) {
                console.log(`  🗑️ [CleanImapTemplate] Suppression de l'ancien credential ${imapCred.id} du nœud ${node.name}`);
                // Supprimer complètement les credentials IMAP (seront injectés lors du déploiement)
                delete cleanedNode.credentials.imapApi;
                delete cleanedNode.credentials.imap;
                // Si credentials est vide, le supprimer complètement
                if (Object.keys(cleanedNode.credentials).length === 0) {
                  delete cleanedNode.credentials;
                }
                credentialsCleaned++;
                nodeModified = true;
              } else {
                // Même si ce n'est pas un ancien credential connu, supprimer quand même
                // car le template admin ne devrait pas avoir de credentials utilisateur
                console.log(`  🗑️ [CleanImapTemplate] Suppression du credential ${imapCred.id} du nœud ${node.name} (template admin doit être vierge)`);
                delete cleanedNode.credentials.imapApi;
                delete cleanedNode.credentials.imap;
                if (Object.keys(cleanedNode.credentials || {}).length === 0) {
                  delete cleanedNode.credentials;
                }
                credentialsCleaned++;
                nodeModified = true;
              }
            }
          }
        }
        
        // Nettoyer les credentials SMTP (sauf ceux de l'admin)
        if (node.type === 'n8n-nodes-base.emailSend') {
          if (node.credentials && node.credentials.smtp) {
            const smtpCred = node.credentials.smtp;
            // Garder uniquement les credentials SMTP admin (ceux qui contiennent "admin@heleam.com")
            if (smtpCred.name && !smtpCred.name.includes('admin@heleam.com')) {
              console.log(`  🗑️ [CleanImapTemplate] Suppression du credential SMTP utilisateur ${smtpCred.id} du nœud ${node.name}`);
              delete cleanedNode.credentials.smtp;
              if (Object.keys(cleanedNode.credentials || {}).length === 0) {
                delete cleanedNode.credentials;
              }
              credentialsCleaned++;
              nodeModified = true;
            }
          }
        }
        
        if (nodeModified) {
          nodesModified++;
        }
        
        return cleanedNode;
      });
      
      if (credentialsCleaned > 0) {
        console.log(`\n✅ [CleanImapTemplate] ${credentialsCleaned} credential(s) supprimé(s) de ${nodesModified} nœud(s)`);
        
        // Sauvegarder le template nettoyé
        const updatedJson = JSON.stringify(workflowJson);
        await db.query(
          `UPDATE templates SET json = $1 WHERE id = $2`,
          [updatedJson, template.id]
        );
        
        console.log(`✅ [CleanImapTemplate] Template ${template.name} mis à jour dans la base de données`);
      } else {
        console.log(`ℹ️ [CleanImapTemplate] Aucun credential à nettoyer pour ${template.name}`);
      }
    }
    
    console.log('\n✅ [CleanImapTemplate] Nettoyage terminé avec succès!');
    
  } catch (error) {
    console.error('❌ [CleanImapTemplate] Erreur:', error);
    console.error('❌ [CleanImapTemplate] Stack:', error.stack);
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  cleanImapTemplateCredentials()
    .then(() => {
      console.log('✅ Script terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { cleanImapTemplateCredentials };

