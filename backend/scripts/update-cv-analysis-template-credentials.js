// Script pour mettre à jour le template CV Analysis
// - Remplace les credentials httpHeaderAuth hardcodés par des placeholders génériques

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool(config.database);
const CV_ANALYSIS_TEMPLATE_ID = 'aa3ba641-9bfb-429c-8b42-506d4f33ff40';

async function updateCVAnalysisTemplateCredentials() {
  console.log('🔧 [Update CV Analysis] Début de la mise à jour des credentials...\n');
  
  try {
    // 1. Récupérer le template actuel
    console.log('📥 [Update CV Analysis] Récupération du template depuis la BDD...');
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [CV_ANALYSIS_TEMPLATE_ID]);
    const template = result.rows[0];
    
    if (!template) {
      console.error('❌ [Update CV Analysis] Template non trouvé avec ID:', CV_ANALYSIS_TEMPLATE_ID);
      return;
    }
    
    console.log('✅ [Update CV Analysis] Template trouvé:', template.name);
    
    // 2. Parser le JSON du workflow
    let workflow = typeof template.json === 'string' ? JSON.parse(template.json) : template.json;
    
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      console.error('❌ [Update CV Analysis] Structure de workflow invalide: pas de nodes');
      return;
    }
    
    // 3. Trouver et remplacer les credentials hardcodés
    let modified = false;
    const updatedNodes = workflow.nodes.map((node, index) => {
      const cleanedNode = { ...node };
      let nodeModified = false;
      
      // Nœuds HTTP Request avec OpenRouter
      if (node.type === 'n8n-nodes-base.httpRequest' && 
          (node.parameters?.url?.includes('openrouter.ai') || node.name?.toLowerCase().includes('openrouter'))) {
        
        console.log(`\n🔍 [Update CV Analysis] Nœud ${index + 1}: ${node.name}`);
        console.log('  - Authentication:', node.parameters?.authentication);
        console.log('  - Node Credential Type:', node.parameters?.nodeCredentialType);
        console.log('  - Credentials présents:', Object.keys(node.credentials || {}));
        
        if (node.credentials) {
          // Si le nœud utilise openRouterApi, remplacer le credential
          if (node.parameters?.authentication === 'predefinedCredentialType' && 
              node.parameters?.nodeCredentialType === 'openRouterApi') {
            
            if (node.credentials.openRouterApi) {
              const oldId = node.credentials.openRouterApi.id;
              if (oldId && !oldId.includes('ADMIN_OPENROUTER')) {
                cleanedNode.credentials.openRouterApi = {
                  id: 'ADMIN_OPENROUTER_CREDENTIAL_ID',
                  name: 'ADMIN_OPENROUTER_CREDENTIAL_NAME'
                };
                nodeModified = true;
                console.log(`  ✅ [Update CV Analysis] Credential openRouterApi remplacé: ${oldId} -> ADMIN_OPENROUTER_CREDENTIAL_ID`);
              }
            }
            
            // Supprimer httpHeaderAuth s'il existe (ne devrait pas être là si on utilise openRouterApi)
            if (cleanedNode.credentials.httpHeaderAuth) {
              delete cleanedNode.credentials.httpHeaderAuth;
              nodeModified = true;
              console.log(`  🧹 [Update CV Analysis] Credential httpHeaderAuth supprimé (non nécessaire avec openRouterApi)`);
            }
          } else {
            // Si le nœud utilise httpHeaderAuth, remplacer le credential
            if (node.credentials.httpHeaderAuth) {
              const oldId = node.credentials.httpHeaderAuth.id;
              if (oldId && !oldId.includes('ADMIN_OPENROUTER')) {
                cleanedNode.credentials.httpHeaderAuth = {
                  id: 'ADMIN_OPENROUTER_CREDENTIAL_ID',
                  name: 'ADMIN_OPENROUTER_CREDENTIAL_NAME'
                };
                nodeModified = true;
                console.log(`  ✅ [Update CV Analysis] Credential httpHeaderAuth remplacé: ${oldId} -> ADMIN_OPENROUTER_CREDENTIAL_ID`);
              }
            }
          }
        }
      }
      
      if (nodeModified) {
        modified = true;
        return cleanedNode;
      }
      
      return node;
    });
    
    if (!modified) {
      console.log('\nℹ️ [Update CV Analysis] Aucune modification nécessaire');
      return;
    }
    
    // 4. Mettre à jour le workflow
    workflow.nodes = updatedNodes;
    
    // 5. Sauvegarder dans la base de données
    console.log('\n💾 [Update CV Analysis] Sauvegarde du template mis à jour...');
    const updateResult = await pool.query(
      'UPDATE templates SET json = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(workflow), CV_ANALYSIS_TEMPLATE_ID]
    );
    
    if (updateResult.rows.length > 0) {
      const updatedTemplate = updateResult.rows[0];
      const updatedWorkflow = typeof updatedTemplate.json === 'string' 
        ? JSON.parse(updatedTemplate.json) 
        : updatedTemplate.json;
      console.log('✅ [Update CV Analysis] Template mis à jour avec succès!');
      console.log(`📊 [Update CV Analysis] Nombre de nœuds après mise à jour: ${updatedWorkflow?.nodes?.length || 0}`);
    } else {
      console.error('❌ [Update CV Analysis] Erreur lors de la sauvegarde');
    }
    
  } catch (error) {
    console.error('❌ [Update CV Analysis] Erreur:', error);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Exécuter le script
updateCVAnalysisTemplateCredentials();

