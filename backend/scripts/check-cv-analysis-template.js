// Script pour examiner le template CV Analysis et voir comment les credentials sont configurés

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool(config.database);
const CV_ANALYSIS_TEMPLATE_ID = 'aa3ba641-9bfb-429c-8b42-506d4f33ff40';

async function checkCVAnalysisTemplate() {
  console.log('🔍 [Check CV Analysis] Examen du template...\n');
  
  try {
    const result = await pool.query('SELECT id, name, json FROM templates WHERE id = $1', [CV_ANALYSIS_TEMPLATE_ID]);
    const template = result.rows[0];
    
    if (!template) {
      console.error('❌ Template non trouvé');
      return;
    }
    
    console.log('✅ Template trouvé:', template.name);
    
    const workflow = typeof template.json === 'string' ? JSON.parse(template.json) : template.json;
    
    // Trouver tous les nœuds HTTP Request
    const httpNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');
    
    console.log(`\n📊 Nombre de nœuds HTTP Request: ${httpNodes.length}\n`);
    
    httpNodes.forEach((node, index) => {
      console.log(`\n--- Nœud ${index + 1}: ${node.name} ---`);
      console.log('URL:', node.parameters?.url || 'N/A');
      console.log('Authentication:', node.parameters?.authentication || 'N/A');
      console.log('Node Credential Type:', node.parameters?.nodeCredentialType || 'N/A');
      console.log('Credentials présents:', Object.keys(node.credentials || {}));
      
      if (node.credentials?.httpHeaderAuth) {
        console.log('httpHeaderAuth ID:', node.credentials.httpHeaderAuth.id);
        console.log('httpHeaderAuth Name:', node.credentials.httpHeaderAuth.name);
      }
      
      if (node.parameters?.authentication === 'headerAuth') {
        console.log('⚠️ Utilise headerAuth (pas httpHeaderAuth credential)');
        console.log('Header Auth Name:', node.parameters?.headerAuth?.name || 'N/A');
        console.log('Header Auth Value:', node.parameters?.headerAuth?.value || 'N/A');
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
  }
}

checkCVAnalysisTemplate();

