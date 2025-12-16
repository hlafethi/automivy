require('dotenv').config();
const db = require('../database');

const TEMPLATE_ID = '5916c2c3-d2f8-4895-8165-5048b367d16a'; // ID du template "test mcp"

(async () => {
  try {
    console.log('🔧 Modification du template "test mcp" pour utiliser un webhook au lieu du chatTrigger...\n');
    
    // 1. Récupérer le template
    const result = await db.query('SELECT * FROM templates WHERE id = $1', [TEMPLATE_ID]);
    
    if (result.rows.length === 0) {
      console.log('❌ Template non trouvé');
      return;
    }
    
    const template = result.rows[0];
    let workflow = typeof template.json === 'string' 
      ? JSON.parse(template.json) 
      : template.json;
    
    console.log('📋 Template:', template.name);
    console.log('📊 Nombre de nœuds:', workflow.nodes?.length || 0);
    
    // 2. Trouver et remplacer le chatTrigger par un webhook
    let modified = false;
    let chatTriggerNode = null;
    let chatTriggerIndex = -1;
    
    // Trouver le nœud chatTrigger (uniquement le trigger, pas les autres nœuds)
    workflow.nodes.forEach((node, index) => {
      if (node.type === '@n8n/n8n-nodes-langchain.chatTrigger' || 
          (node.type && node.type.includes('chatTrigger') && !node.type.includes('lmChat'))) {
        chatTriggerNode = node;
        chatTriggerIndex = index;
        console.log(`\n🔍 Nœud chatTrigger trouvé: ${node.name} (index: ${index}, type: ${node.type})`);
      }
    });
    
    if (!chatTriggerNode) {
      console.log('⚠️  Aucun nœud chatTrigger trouvé. Le template utilise peut-être déjà un webhook.');
      return;
    }
    
    // 3. Créer un nouveau nœud webhook à la place
    const webhookNode = {
      id: chatTriggerNode.id, // Garder le même ID pour préserver les connexions
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: chatTriggerNode.position || [250, 300],
      parameters: {
        httpMethod: 'POST',
        path: 'mcp-chat', // Path par défaut, sera remplacé par l'injecteur si nécessaire
        responseMode: 'responseNode', // Pour permettre une réponse dans le workflow
        options: {}
      },
      webhookId: `mcp-chat-${TEMPLATE_ID.substring(0, 8)}`
    };
    
    console.log('\n🔄 Remplacement du chatTrigger par un webhook:');
    console.log('   Avant:', chatTriggerNode.type, chatTriggerNode.name);
    console.log('   Après:', webhookNode.type, webhookNode.name);
    
    // Remplacer le nœud
    workflow.nodes[chatTriggerIndex] = webhookNode;
    modified = true;
    
    // 4. Vérifier les connexions - le webhook doit être connecté au même nœud suivant
    // Les connexions devraient être préservées car on garde le même ID
    
    // 5. Mettre à jour le template dans la base de données
    if (modified) {
      console.log('\n💾 Mise à jour du template dans la base de données...');
      await db.query(
        'UPDATE templates SET json = $1 WHERE id = $2',
        [JSON.stringify(workflow), TEMPLATE_ID]
      );
      
      console.log('\n✅ Template mis à jour avec succès!');
      console.log('\n📝 Modifications apportées:');
      console.log('   1. chatTrigger remplacé par webhook');
      console.log('   2. Path webhook: mcp-chat (sera personnalisé lors du déploiement)');
      console.log('   3. responseMode: responseNode (pour permettre les réponses)');
      console.log('\n⚠️  IMPORTANT: Les workflows existants doivent être redéployés pour utiliser le nouveau trigger!');
    } else {
      console.log('\n⚠️  Aucune modification nécessaire');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
})();

