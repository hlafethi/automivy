const db = require('../database');

async function fixTemplate() {
  try {
    console.log('🔍 Recherche du template Production Vidéo IA...');
    
    const result = await db.query(
      "SELECT id, name, json FROM templates WHERE id = '6a60e84e-b5c1-414d-9f27-5770bc438a64'"
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Template non trouvé');
      process.exit(1);
    }
    
    const template = result.rows[0];
    console.log('✅ Template trouvé:', template.name);
    
    let json = template.json;
    if (typeof json === 'object') {
      json = JSON.stringify(json);
    }
    
    // Compter les occurrences avant
    const countBefore = (json.match(/openai_api_key/g) || []).length;
    console.log(`📊 Occurrences de openai_api_key avant: ${countBefore}`);
    
    // Supprimer le bloc openai_api_key (format LangChain)
    // Pattern pour matcher: "openai_api_key": { "lc": 1, "type": "secret", "id": ["OPENAI_API_KEY"] }
    json = json.replace(/"openai_api_key"\s*:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*,?/g, '');
    
    // Nettoyer les virgules
    json = json.replace(/,\s*,/g, ',');
    json = json.replace(/,\s*\}/g, '}');
    json = json.replace(/\{\s*,/g, '{');
    
    // Compter les occurrences après
    const countAfter = (json.match(/openai_api_key/g) || []).length;
    console.log(`📊 Occurrences de openai_api_key après: ${countAfter}`);
    
    // Mettre à jour le template
    await db.query(
      "UPDATE templates SET json = $1 WHERE id = '6a60e84e-b5c1-414d-9f27-5770bc438a64'",
      [json]
    );
    
    console.log('✅ Template mis à jour avec succès!');
    console.log('');
    console.log('👉 Maintenant:');
    console.log('   1. Supprime le workflow "Production Vidéo IA" dans n8n');
    console.log('   2. Redéploie-le depuis ton application');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
  
  process.exit(0);
}

fixTemplate();

