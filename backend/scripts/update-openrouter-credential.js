// Script pour mettre à jour le credential OpenRouter dans le template MCP
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../database');

const OPENROUTER_ID = 'DJ4JtAswl4vKWvdI';
const OPENROUTER_NAME = 'OpenRouter Admin';
const MODEL = 'openai/gpt-4o-mini';

async function updateOpenRouterCredential() {
  console.log('🔧 Mise à jour du credential OpenRouter...\n');
  console.log('   ID:', OPENROUTER_ID);
  console.log('   Modèle:', MODEL);
  
  try {
    const result = await db.query(
      "SELECT * FROM templates WHERE name ILIKE '%test mcp%' ORDER BY created_at DESC LIMIT 1"
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Template non trouvé');
      process.exit(1);
    }
    
    const template = result.rows[0];
    let workflow = template.json;
    
    console.log('\n✅ Template trouvé:', template.name);
    
    // Mettre à jour ou créer le nœud OpenRouter
    let openRouterFound = false;
    workflow.nodes = workflow.nodes.map(node => {
      if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter' || 
          node.name.toLowerCase().includes('openrouter') ||
          node.name.toLowerCase().includes('chat model')) {
        openRouterFound = true;
        node.parameters = node.parameters || {};
        node.parameters.model = MODEL;
        node.parameters.options = node.parameters.options || {};
        node.credentials = {
          openRouterApi: {
            id: OPENROUTER_ID,
            name: OPENROUTER_NAME
          }
        };
        console.log(`\n✅ Nœud "${node.name}" mis à jour avec credential ${OPENROUTER_ID}`);
      }
      return node;
    });
    
    if (!openRouterFound) {
      console.log('\n⚠️ Aucun nœud OpenRouter trouvé, création...');
      const aiAgent = workflow.nodes.find(n => 
        n.type === '@n8n/n8n-nodes-langchain.agent' || 
        n.name.toLowerCase().includes('ai agent')
      );
      
      const newNode = {
        parameters: { model: MODEL, options: {} },
        id: 'openrouter-' + Date.now(),
        name: 'OpenRouter Chat Model',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        typeVersion: 1,
        position: aiAgent ? [aiAgent.position[0], aiAgent.position[1] + 200] : [-448, 264],
        credentials: {
          openRouterApi: {
            id: OPENROUTER_ID,
            name: OPENROUTER_NAME
          }
        }
      };
      
      workflow.nodes.push(newNode);
      
      // Ajouter la connexion au AI Agent
      if (!workflow.connections['OpenRouter Chat Model']) {
        workflow.connections['OpenRouter Chat Model'] = {};
      }
      workflow.connections['OpenRouter Chat Model'].ai_languageModel = [[{
        node: 'AI Agent',
        type: 'ai_languageModel',
        index: 0
      }]];
      
      console.log('✅ Nœud OpenRouter créé et connecté au AI Agent');
    }
    
    // Mettre à jour le template
    await db.query(
      'UPDATE templates SET json = $1 WHERE id = $2',
      [JSON.stringify(workflow), template.id]
    );
    
    console.log('\n✅ Template mis à jour avec succès!');
    console.log('\n📝 Redéployez le workflow "test mcp" pour appliquer les changements.');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
  
  process.exit();
}

updateOpenRouterCredential();

