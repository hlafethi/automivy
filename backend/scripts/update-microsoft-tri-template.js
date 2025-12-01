/**
 * Script pour mettre à jour le template Microsoft Tri Automatique BAL
 * avec le JSON fourni par l'utilisateur, en nettoyant les credentials et adresses email
 */

const db = require('../database');
const fs = require('fs');
const path = require('path');

async function updateMicrosoftTriTemplate() {
  console.log('🔧 [UpdateMicrosoftTemplate] Début de la mise à jour du template Microsoft Tri...');
  
  try {
    // 1. Lire le JSON fourni depuis le chemin fourni par l'utilisateur
    const jsonPath = 'c:\\Users\\direc\\Downloads\\Microsoft Tri Automatique BAL - fetline@hotmail.fr.json';
    let workflowJson;
    
    try {
      const jsonContent = fs.readFileSync(jsonPath, 'utf8');
      workflowJson = JSON.parse(jsonContent);
    } catch (error) {
      console.error('❌ [UpdateMicrosoftTemplate] Erreur lecture JSON:', error);
      throw new Error(`Impossible de lire le fichier JSON: ${jsonPath}`);
    }
    
    console.log('✅ [UpdateMicrosoftTemplate] JSON lu avec succès');
    
    // 2. Nettoyer le workflow
    // 2.1. Retirer le nom avec email
    workflowJson.name = 'Microsoft Tri Automatique BAL';
    
    // 2.2. Nettoyer les credentials Microsoft Outlook (remplacer par placeholder)
    const microsoftCredentialPlaceholder = {
      id: 'MICROSOFT_OUTLOOK_OAUTH_PLACEHOLDER',
      name: 'Microsoft Outlook OAuth (à configurer)'
    };
    
    if (workflowJson.nodes) {
      workflowJson.nodes = workflowJson.nodes.map(node => {
        const cleanedNode = JSON.parse(JSON.stringify(node));
        
        // Nettoyer les credentials Microsoft Outlook
        if (cleanedNode.credentials && cleanedNode.credentials.microsoftOutlookOAuth2Api) {
          cleanedNode.credentials.microsoftOutlookOAuth2Api = microsoftCredentialPlaceholder;
        }
        
        // Nettoyer le webhook path
        if (cleanedNode.type === 'n8n-nodes-base.webhook' && cleanedNode.parameters && cleanedNode.parameters.path) {
          cleanedNode.parameters.path = 'WEBHOOK_PATH_PLACEHOLDER';
        }
        
        // Nettoyer les adresses email dans le code JavaScript
        if (cleanedNode.type === 'n8n-nodes-base.code' && cleanedNode.parameters && cleanedNode.parameters.jsCode) {
          let code = cleanedNode.parameters.jsCode;
          
          // Remplacer les emails hardcodés par placeholder
          code = code.replace(/let\s+mailboxOwner\s*=\s*['"][^'"]*@[^'"]*['"]/g, 'let mailboxOwner = \'USER_EMAIL_PLACEHOLDER\'');
          code = code.replace(/mailboxOwner\s*=\s*['"][^'"]*@[^'"]*['"]/g, 'mailboxOwner = \'USER_EMAIL_PLACEHOLDER\'');
          
          // Remplacer les emails dans les strings
          code = code.replace(/['"][a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}['"]/g, (match) => {
            // Garder admin@heleam.com (c'est l'admin)
            if (match.includes('admin@heleam.com')) {
              return match;
            }
            // Remplacer les autres emails
            return '\'USER_EMAIL_PLACEHOLDER\'';
          });
          
          cleanedNode.parameters.jsCode = code;
        }
        
        // Nettoyer les emails dans les paramètres
        if (cleanedNode.parameters) {
          if (cleanedNode.parameters.fromEmail && cleanedNode.parameters.fromEmail !== 'admin@heleam.com') {
            cleanedNode.parameters.fromEmail = 'admin@heleam.com';
          }
          if (cleanedNode.parameters.toEmail && cleanedNode.parameters.toEmail.includes('@') && !cleanedNode.parameters.toEmail.includes('{{')) {
            cleanedNode.parameters.toEmail = '={{ $json.mailboxOwner }}';
          }
        }
        
        return cleanedNode;
      });
    }
    
    // 2.3. Nettoyer les webhook IDs (générés automatiquement)
    if (workflowJson.nodes) {
      workflowJson.nodes.forEach(node => {
        if (node.webhookId) {
          delete node.webhookId;
        }
      });
    }
    
    // 2.4. Nettoyer les IDs de workflow et meta
    delete workflowJson.id;
    delete workflowJson.versionId;
    if (workflowJson.meta) {
      delete workflowJson.meta.instanceId;
    }
    
    // 2.5. Désactiver le workflow (sera activé lors du déploiement)
    workflowJson.active = false;
    
    // 3. Récupérer le template existant
    const templateResult = await db.query(
      `SELECT * FROM templates WHERE name = 'Microsoft Tri Automatique BAL' LIMIT 1`
    );
    
    if (!templateResult.rows || templateResult.rows.length === 0) {
      console.error('❌ [UpdateMicrosoftTemplate] Template Microsoft Tri Automatique BAL non trouvé');
      console.log('💡 [UpdateMicrosoftTemplate] Exécutez d\'abord create-microsoft-tri-template.js');
      return;
    }
    
    const template = templateResult.rows[0];
    console.log('✅ [UpdateMicrosoftTemplate] Template trouvé:', template.id);
    
    // 4. Mettre à jour le template
    await db.query(
      `UPDATE templates SET json = $1 WHERE id = $2`,
      [JSON.stringify(workflowJson), template.id]
    );
    
    console.log('✅ [UpdateMicrosoftTemplate] Template mis à jour avec succès');
    console.log('✅ [UpdateMicrosoftTemplate] Template ID:', template.id);
    console.log('\n📋 [UpdateMicrosoftTemplate] Modifications appliquées:');
    console.log('  - Credentials Microsoft Outlook remplacés par placeholder');
    console.log('  - Webhook path remplacé par placeholder');
    console.log('  - Emails hardcodés remplacés par placeholders');
    console.log('  - Nom du workflow nettoyé');
    console.log('  - IDs de workflow et meta supprimés');
    
  } catch (error) {
    console.error('❌ [UpdateMicrosoftTemplate] Erreur:', error);
    throw error;
  }
}

// Exécuter le script
if (require.main === module) {
  updateMicrosoftTriTemplate()
    .then(() => {
      console.log('✅ [UpdateMicrosoftTemplate] Script terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ [UpdateMicrosoftTemplate] Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { updateMicrosoftTriTemplate };

