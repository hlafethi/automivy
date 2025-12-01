// Script pour mettre à jour le template Gmail Tri Automatique
// - Remplace emailReadImap par n8n-nodes-base.gmail
// - Utilise des placeholders génériques pour les credentials
// - Supprime la nécessité d'IMAP

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool(config.database);
const GMAIL_TRI_TEMPLATE_ID = '5114f297-e56e-4fec-be2b-1afbb5ea8619';

async function updateGmailTriTemplate() {
  console.log('🔧 [Update Gmail Tri] Début de la mise à jour du template...\n');
  
  try {
    // 1. Récupérer le template actuel
    console.log('📥 [Update Gmail Tri] Récupération du template depuis la BDD...');
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [GMAIL_TRI_TEMPLATE_ID]);
    const template = result.rows[0];
    
    if (!template) {
      console.error('❌ [Update Gmail Tri] Template non trouvé avec ID:', GMAIL_TRI_TEMPLATE_ID);
      console.log('🔍 [Update Gmail Tri] Recherche de tous les templates Gmail...');
      const allTemplates = await pool.query("SELECT id, name FROM templates WHERE name ILIKE '%gmail%' OR name ILIKE '%Gmail%'");
      console.log('📋 [Update Gmail Tri] Templates Gmail trouvés:', allTemplates.rows);
      return;
    }
    
    console.log('✅ [Update Gmail Tri] Template trouvé:', template.name);
    console.log('📊 [Update Gmail Tri] Nombre de nœuds:', template.json?.nodes?.length || 0);
    
    // 2. Parser le JSON du workflow
    let workflow = typeof template.json === 'string' ? JSON.parse(template.json) : template.json;
    
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      console.error('❌ [Update Gmail Tri] Structure de workflow invalide: pas de nodes');
      return;
    }
    
    // 3. Trouver et remplacer le nœud emailReadImap par Gmail
    let modified = false;
    const updatedNodes = workflow.nodes.map((node, index) => {
      // Si c'est un nœud emailReadImap, le remplacer par Gmail
      if (node.type === 'n8n-nodes-base.emailReadImap') {
        console.log(`🔄 [Update Gmail Tri] Remplacement du nœud ${node.name} (${node.type}) par Gmail API`);
        
        modified = true;
        
        // Créer un nouveau nœud Gmail
        const gmailNode = {
          ...node,
          type: 'n8n-nodes-base.gmail',
          typeVersion: node.typeVersion || 1,
          parameters: {
            operation: 'getAll',
            returnAll: true,
            filters: {
              q: 'in:inbox',
              maxResults: 50
            },
            options: {}
          },
          credentials: {
            gmailOAuth2: {
              id: 'USER_GMAIL_OAUTH2_CREDENTIAL_ID',
              name: 'USER_GMAIL_OAUTH2_CREDENTIAL_NAME'
            }
          }
        };
        
        // Conserver le nom et la position si possible
        if (node.name) {
          gmailNode.name = node.name.replace(/imap|IMAP|emailReadImap/gi, 'Gmail').trim();
        }
        
        console.log(`✅ [Update Gmail Tri] Nouveau nœud Gmail créé: ${gmailNode.name}`);
        return gmailNode;
      }
      
      // Nettoyer les credentials existants pour utiliser des placeholders génériques
      if (node.credentials) {
        const cleanedCredentials = {};
        let credentialsModified = false;
        
        // Remplacer les credentials Gmail OAuth2 par des placeholders
        if (node.credentials.gmailOAuth2) {
          const oldCred = node.credentials.gmailOAuth2;
          if (oldCred.id && !oldCred.id.includes('USER_GMAIL_OAUTH2_CREDENTIAL_ID')) {
            cleanedCredentials.gmailOAuth2 = {
              id: 'USER_GMAIL_OAUTH2_CREDENTIAL_ID',
              name: 'USER_GMAIL_OAUTH2_CREDENTIAL_NAME'
            };
            credentialsModified = true;
            console.log(`🔄 [Update Gmail Tri] Credential Gmail OAuth2 remplacé dans ${node.name}`);
          } else {
            cleanedCredentials.gmailOAuth2 = node.credentials.gmailOAuth2;
          }
        }
        
        // Supprimer les credentials IMAP
        if (node.credentials.imap) {
          console.log(`⚠️ [Update Gmail Tri] Credential IMAP trouvé dans ${node.name}, suppression...`);
          credentialsModified = true;
          // Ne pas inclure IMAP dans les credentials nettoyés
        }
        
        // Conserver les autres credentials (OpenRouter, SMTP admin, etc.)
        Object.keys(node.credentials).forEach(key => {
          if (key !== 'imap' && key !== 'gmailOAuth2') {
            cleanedCredentials[key] = node.credentials[key];
          }
        });
        
        if (credentialsModified) {
          modified = true;
          return {
            ...node,
            credentials: cleanedCredentials
          };
        }
      }
      
      // Remplacer les placeholders OpenRouter s'ils existent
      if (node.credentials && node.credentials.openRouterApi) {
        const oldCred = node.credentials.openRouterApi;
        if (oldCred.id && !oldCred.id.includes('ADMIN_OPENROUTER')) {
          modified = true;
          return {
            ...node,
            credentials: {
              ...node.credentials,
              openRouterApi: {
                id: 'ADMIN_OPENROUTER_CREDENTIAL_ID',
                name: 'ADMIN_OPENROUTER_CREDENTIAL_NAME'
              }
            }
          };
        }
      }
      
      return node;
    });
    
    if (!modified) {
      console.log('ℹ️ [Update Gmail Tri] Aucune modification nécessaire');
      return;
    }
    
    // 4. Mettre à jour le workflow
    workflow.nodes = updatedNodes;
    
    // 5. Sauvegarder dans la base de données
    console.log('\n💾 [Update Gmail Tri] Sauvegarde du template mis à jour...');
    const updateResult = await pool.query(
      'UPDATE templates SET json = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(workflow), GMAIL_TRI_TEMPLATE_ID]
    );
    
    if (updateResult.rows.length > 0) {
      const updatedTemplate = updateResult.rows[0];
      const updatedWorkflow = typeof updatedTemplate.json === 'string' 
        ? JSON.parse(updatedTemplate.json) 
        : updatedTemplate.json;
      console.log('✅ [Update Gmail Tri] Template mis à jour avec succès!');
      console.log(`📊 [Update Gmail Tri] Nombre de nœuds après mise à jour: ${updatedWorkflow?.nodes?.length || 0}`);
    } else {
      console.error('❌ [Update Gmail Tri] Erreur lors de la sauvegarde');
    }
    
  } catch (error) {
    console.error('❌ [Update Gmail Tri] Erreur:', error);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Exécuter le script
updateGmailTriTemplate();
