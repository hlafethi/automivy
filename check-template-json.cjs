const db = require('./backend/database');

async function checkTemplateJson() {
  try {
    console.log('🔍 Vérification du template JSON...');
    
    const result = await db.query('SELECT id, name, json FROM templates WHERE id = $1', ['77a79f77-188c-45df-a799-bdaaf06acaeb']);
    
    if (result.rows.length > 0) {
      const template = result.rows[0];
      console.log('✅ Template trouvé:');
      console.log('- ID:', template.id);
      console.log('- Name:', template.name);
      console.log('- JSON type:', typeof template.json);
      console.log('- JSON length:', template.json?.length);
      
      if (template.json) {
        console.log('- JSON type:', typeof template.json);
        console.log('- JSON keys:', Object.keys(template.json || {}));
        
        // Le JSON est déjà un objet
        const workflowJson = template.json;
        console.log('✅ JSON valide (déjà parsé)');
        console.log('- Workflow type:', typeof workflowJson);
        console.log('- Workflow keys:', Object.keys(workflowJson || {}));
        
        if (workflowJson.nodes) {
          console.log('- Nodes count:', workflowJson.nodes.length);
          console.log('- First node:', workflowJson.nodes[0]?.name || 'N/A');
        }
        
        if (workflowJson.connections) {
          console.log('- Connections count:', Object.keys(workflowJson.connections).length);
        }
        
        // Vérifier la structure complète
        console.log('- Full JSON structure:');
        console.log(JSON.stringify(workflowJson, null, 2));
      } else {
        console.log('❌ JSON manquant');
      }
    } else {
      console.log('❌ Template non trouvé');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

checkTemplateJson();
