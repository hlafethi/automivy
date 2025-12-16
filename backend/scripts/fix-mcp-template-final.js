// Script pour corriger le template MCP :
// 1. Supprimer les nœuds Google Ads et Google Tasks
// 2. S'assurer que OpenRouter a les bons placeholders/credentials

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../database');

async function fixMcpTemplate() {
  console.log('🔧 Correction du template MCP...\n');
  
  try {
    // Récupérer le template
    const result = await db.query(
      "SELECT * FROM templates WHERE name ILIKE '%test mcp%' ORDER BY created_at DESC LIMIT 1"
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Template "test mcp" non trouvé');
      process.exit(1);
    }
    
    const template = result.rows[0];
    console.log('✅ Template trouvé:', template.name);
    console.log('   ID:', template.id);
    console.log('   Colonnes disponibles:', Object.keys(template));
    
    // Parser le workflow - vérifier plusieurs colonnes possibles
    let workflowData = template.json || template.workflow_json || template.n8n_workflow_json || template.workflow;
    console.log('   Type json:', typeof workflowData);
    
    if (!workflowData) {
      console.log('❌ Aucune donnée de workflow trouvée');
      process.exit(1);
    }
    
    let workflow = typeof workflowData === 'string' 
      ? JSON.parse(workflowData) 
      : workflowData;
    
    if (!workflow.nodes) {
      console.log('❌ Pas de nœuds dans le workflow');
      console.log('   Contenu:', JSON.stringify(workflow).substring(0, 500));
      process.exit(1);
    }
    
    console.log('\n📋 Nœuds avant modification:');
    workflow.nodes.forEach(node => {
      console.log(`   - ${node.name} (${node.type})`);
    });
    
    // Supprimer les nœuds Google Ads et Google Tasks
    const nodesToRemove = [
      'n8n-nodes-base.googleAdsTool',
      'n8n-nodes-base.googleAds',
      'n8n-nodes-base.googleTasksTool',
      'n8n-nodes-base.googleTasks'
    ];
    
    const nodeNamesToRemove = [];
    workflow.nodes = workflow.nodes.filter(node => {
      if (nodesToRemove.includes(node.type) || 
          node.name.toLowerCase().includes('google ads') ||
          node.name.toLowerCase().includes('google tasks')) {
        nodeNamesToRemove.push(node.name);
        console.log(`\n🗑️  Suppression du nœud: ${node.name} (${node.type})`);
        return false;
      }
      return true;
    });
    
    // Supprimer les connexions vers ces nœuds
    if (workflow.connections) {
      for (const nodeName of nodeNamesToRemove) {
        delete workflow.connections[nodeName];
      }
      
      // Supprimer les connexions vers ces nœuds depuis d'autres nœuds
      for (const [sourceName, outputs] of Object.entries(workflow.connections)) {
        for (const outputType in outputs) {
          if (Array.isArray(outputs[outputType])) {
            outputs[outputType] = outputs[outputType].map(connections => {
              if (Array.isArray(connections)) {
                return connections.filter(conn => !nodeNamesToRemove.includes(conn.node));
              }
              return connections;
            }).filter(connections => connections.length > 0);
          }
        }
      }
    }
    
    // Récupérer le credential OpenRouter admin depuis les variables d'environnement
    const openRouterId = process.env.ADMIN_OPENROUTER_CREDENTIAL_ID || 
                         process.env.OPENROUTER_CREDENTIAL_ID || 
                         process.env.OPENROUTER_USER_CREDENTIAL_ID;
    const openRouterName = process.env.ADMIN_OPENROUTER_CREDENTIAL_NAME || 
                           process.env.OPENROUTER_CREDENTIAL_NAME || 
                           process.env.OPENROUTER_USER_CREDENTIAL_NAME || 
                           'Header Auth account 2';
    
    console.log('\n🔑 Credential OpenRouter:');
    console.log('   ID:', openRouterId);
    console.log('   Name:', openRouterName);
    
    // Configurer le nœud OpenRouter avec le credential admin
    let openRouterNodeFound = false;
    workflow.nodes = workflow.nodes.map(node => {
      // Configurer OpenRouter
      if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter' ||
          node.name.toLowerCase().includes('openrouter') ||
          node.name.toLowerCase().includes('chat model')) {
        openRouterNodeFound = true;
        console.log(`\n🔧 Configuration du nœud OpenRouter: ${node.name}`);
        
        // S'assurer que le modèle est défini
        if (!node.parameters) node.parameters = {};
        if (!node.parameters.model) {
          node.parameters.model = 'openai/gpt-4o-mini';
        }
        node.parameters.options = node.parameters.options || {};
        
        // Assigner le credential OpenRouter admin directement (pas de placeholder)
        if (openRouterId) {
          node.credentials = {
            openRouterApi: {
              id: openRouterId,
              name: openRouterName
            }
          };
          console.log(`   ✅ Credential assigné: ${openRouterId} (${openRouterName})`);
        } else {
          console.log('   ⚠️ Aucun credential OpenRouter trouvé dans les variables d\'environnement');
        }
      }
      
      return node;
    });
    
    // Si aucun nœud OpenRouter n'existe, en créer un
    if (!openRouterNodeFound) {
      console.log('\n⚠️ Aucun nœud OpenRouter trouvé, création...');
      
      // Trouver le nœud AI Agent pour positionner OpenRouter près de lui
      const aiAgentNode = workflow.nodes.find(n => 
        n.type === '@n8n/n8n-nodes-langchain.agent' || 
        n.name.toLowerCase().includes('ai agent')
      );
      
      const openRouterNode = {
        parameters: {
          model: 'openai/gpt-4o-mini',
          options: {}
        },
        id: `openrouter-${Date.now()}`,
        name: 'OpenRouter Chat Model',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        typeVersion: 1,
        position: aiAgentNode ? [aiAgentNode.position[0], aiAgentNode.position[1] + 200] : [-448, 64],
        credentials: openRouterId ? {
          openRouterApi: {
            id: openRouterId,
            name: openRouterName
          }
        } : {}
      };
      
      workflow.nodes.push(openRouterNode);
      console.log('   ✅ Nœud OpenRouter créé');
      
      // Connecter au AI Agent
      if (aiAgentNode) {
        if (!workflow.connections['OpenRouter Chat Model']) {
          workflow.connections['OpenRouter Chat Model'] = {};
        }
        workflow.connections['OpenRouter Chat Model'].ai_languageModel = [[{
          node: aiAgentNode.name,
          type: 'ai_languageModel',
          index: 0
        }]];
        console.log('   ✅ Connexion au AI Agent créée');
      }
    }
    
    console.log('\n📋 Nœuds après modification:');
    workflow.nodes.forEach(node => {
      const creds = node.credentials ? Object.keys(node.credentials).join(', ') : 'aucun';
      console.log(`   - ${node.name} (${node.type}) [creds: ${creds}]`);
    });
    
    // Mettre à jour le template
    await db.query(
      'UPDATE templates SET json = $1 WHERE id = $2',
      [JSON.stringify(workflow), template.id]
    );
    
    console.log('\n✅ Template mis à jour avec succès!');
    console.log('\n📝 Redéployez maintenant le workflow "test mcp" pour appliquer les changements.');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
  
  process.exit();
}

fixMcpTemplate();

