// Script pour vérifier les credentials dans le template CV Analysis

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool(config.database);
const CV_ANALYSIS_TEMPLATE_ID = 'aa3ba641-9bfb-429c-8b42-506d4f33ff40';

async function checkTemplateCredentials() {
  console.log('🔍 [Check] Vérification des credentials dans le template...\n');
  
  try {
    const result = await pool.query('SELECT json FROM templates WHERE id = $1', [CV_ANALYSIS_TEMPLATE_ID]);
    const template = result.rows[0];
    
    if (!template) {
      console.error('❌ Template non trouvé');
      return;
    }
    
    const workflow = typeof template.json === 'string' ? JSON.parse(template.json) : template.json;
    
    const httpNodes = workflow.nodes.filter(n => 
      n.type === 'n8n-nodes-base.httpRequest' && 
      (n.parameters?.url?.includes('openrouter.ai') || n.name?.toLowerCase().includes('openrouter'))
    );
    
    console.log(`📊 Nombre de nœuds HTTP Request: ${httpNodes.length}\n`);
    
    httpNodes.forEach((node, index) => {
      console.log(`\n--- Nœud ${index + 1}: ${node.name} ---`);
      console.log('Credentials:', JSON.stringify(node.credentials, null, 2));
      
      if (node.credentials?.openRouterApi) {
        console.log('openRouterApi ID:', node.credentials.openRouterApi.id);
        if (node.credentials.openRouterApi.id.includes('ADMIN_OPENROUTER')) {
          console.log('✅ Utilise placeholder générique');
        } else {
          console.log('⚠️ Utilise ID hardcodé:', node.credentials.openRouterApi.id);
        }
      }
      
      if (node.credentials?.httpHeaderAuth) {
        console.log('httpHeaderAuth ID:', node.credentials.httpHeaderAuth.id);
        if (node.credentials.httpHeaderAuth.id.includes('ADMIN_OPENROUTER')) {
          console.log('✅ Utilise placeholder générique');
        } else {
          console.log('⚠️ Utilise ID hardcodé:', node.credentials.httpHeaderAuth.id);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
  }
}

checkTemplateCredentials();

