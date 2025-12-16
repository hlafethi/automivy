require('dotenv').config();
const db = require('../database');

const TEMPLATE_ID = '5916c2c3-d2f8-4895-8165-5048b367d16a'; // ID du template "test mcp"

(async () => {
  try {
    console.log('🔧 Correction complète du template "test mcp"...\n');
    
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
    console.log('📊 Nombre de nœuds avant:', workflow.nodes?.length || 0);
    
    let modified = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 1. SUPPRIMER LES WEBHOOKS EN DOUBLE - GARDER SEULEMENT LE PREMIER
    // ═══════════════════════════════════════════════════════════════════════════
    const webhookNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.webhook');
    console.log(`\n🔍 Webhooks trouvés: ${webhookNodes.length}`);
    webhookNodes.forEach((w, i) => {
      console.log(`   ${i + 1}. ${w.name} (ID: ${w.id})`);
    });
    
    if (webhookNodes.length > 1) {
      console.log('⚠️  Plusieurs webhooks détectés, conservation du premier uniquement');
      
      // Garder seulement le premier webhook (celui qui est connecté à l'AI Agent)
      const firstWebhook = webhookNodes[0];
      const webhookIdsToRemove = webhookNodes.slice(1).map(n => n.id);
      const webhookNamesToRemove = webhookNodes.slice(1).map(n => n.name);
      
      console.log(`   Conservation: ${firstWebhook.name} (ID: ${firstWebhook.id})`);
      console.log(`   Suppression: ${webhookNamesToRemove.join(', ')}`);
      
      // Supprimer les webhooks en double par ID (plus fiable que par nom)
      workflow.nodes = workflow.nodes.filter(n => 
        n.type !== 'n8n-nodes-base.webhook' || n.id === firstWebhook.id
      );
      
      // Supprimer les connexions des webhooks supprimés
      if (workflow.connections) {
        webhookNamesToRemove.forEach(name => {
          if (workflow.connections[name]) {
            delete workflow.connections[name];
            console.log(`   ✅ Connexions supprimées pour "${name}"`);
          }
        });
      }
      
      console.log(`✅ ${webhookNamesToRemove.length} webhook(s) supprimé(s), seul "${firstWebhook.name}" est conservé`);
      modified = true;
    } else if (webhookNodes.length === 1) {
      console.log(`✅ Un seul webhook trouvé: "${webhookNodes[0].name}"`);
    } else {
      console.log('⚠️  Aucun webhook trouvé, création d\'un nouveau webhook...');
      
      // Créer un nouveau webhook
      const aiAgentNode = workflow.nodes.find(n => 
        n.type === '@n8n/n8n-nodes-langchain.agent' || 
        (n.name && n.name.toLowerCase().includes('ai agent'))
      );
      
      const position = aiAgentNode 
        ? [aiAgentNode.position[0] - 300, aiAgentNode.position[1]]
        : [250, 300];
      
      const newWebhook = {
        id: `webhook-${Date.now()}`,
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: position,
        parameters: {
          httpMethod: 'POST',
          path: 'MCP_CHAT_WEBHOOK_PATH', // Placeholder pour l'injecteur
          responseMode: 'responseNode',
          options: {}
        }
      };
      
      workflow.nodes.push(newWebhook);
      
      // Connecter le webhook à l'AI Agent
      if (aiAgentNode && workflow.connections) {
        if (!workflow.connections[newWebhook.name]) {
          workflow.connections[newWebhook.name] = {};
        }
        workflow.connections[newWebhook.name].main = [[{
          node: aiAgentNode.name,
          type: 'main',
          index: 0
        }]];
      }
      
      console.log('✅ Nouveau webhook créé et connecté à l\'AI Agent');
      modified = true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 2. CONFIGURER LE WEBHOOK RESTANT
    // ═══════════════════════════════════════════════════════════════════════════
    const remainingWebhook = workflow.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
    if (remainingWebhook) {
      if (!remainingWebhook.parameters) {
        remainingWebhook.parameters = {};
      }
      remainingWebhook.parameters.httpMethod = 'POST';
      remainingWebhook.parameters.path = 'MCP_CHAT_WEBHOOK_PATH'; // Placeholder
      remainingWebhook.parameters.responseMode = 'responseNode';
      console.log(`✅ Webhook "${remainingWebhook.name}" configuré`);
      modified = true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 3. VÉRIFIER ET AJOUTER LE NŒUD "Respond to Webhook"
    // ═══════════════════════════════════════════════════════════════════════════
    const respondToWebhookNode = workflow.nodes.find(n => 
      n.type === 'n8n-nodes-base.respondToWebhook' ||
      (n.name && n.name.toLowerCase().includes('respond') && n.name.toLowerCase().includes('webhook'))
    );
    
    if (!respondToWebhookNode) {
      console.log('⚠️  Nœud "Respond to Webhook" introuvable, création en cours...');
      
      const aiAgentNode = workflow.nodes.find(n => 
        n.type === '@n8n/n8n-nodes-langchain.agent' || 
        (n.name && n.name.toLowerCase().includes('ai agent'))
      );
      
      const position = aiAgentNode 
        ? [aiAgentNode.position[0] + 300, aiAgentNode.position[1]]
        : [800, 500];
      
      const respondNode = {
        id: `respond-webhook-${Date.now()}`,
        name: 'Respond to Webhook',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: position,
        parameters: {
          respondWith: 'json',
          responseBody: '={{ { "response": $json.output || $json.text || $json.message || "Message traité" } }}'
        }
      };
      
      workflow.nodes.push(respondNode);
      
      // Connecter l'AI Agent au nœud Respond to Webhook
      if (aiAgentNode && workflow.connections) {
        if (!workflow.connections[aiAgentNode.name]) {
          workflow.connections[aiAgentNode.name] = {};
        }
        if (!workflow.connections[aiAgentNode.name].main) {
          workflow.connections[aiAgentNode.name].main = [];
        }
        // Vérifier si l'AI Agent n'est pas déjà connecté à un autre nœud
        const existingConnections = workflow.connections[aiAgentNode.name].main;
        if (existingConnections.length === 0 || 
            !existingConnections[0].some(conn => conn.node === respondNode.name)) {
          workflow.connections[aiAgentNode.name].main.push([{
            node: respondNode.name,
            type: 'main',
            index: 0
          }]);
        }
      }
      
      console.log('✅ Nœud "Respond to Webhook" créé et connecté');
      modified = true;
    } else {
      console.log(`✅ Nœud "Respond to Webhook" déjà présent: ${respondToWebhookNode.name}`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 4. CONFIGURER LES CREDENTIALS GOOGLE AVEC DES PLACEHOLDERS
    // ═══════════════════════════════════════════════════════════════════════════
    const googleServices = [
      { type: 'googleSheetsOAuth2Api', key: 'googleSheetsOAuth2', placeholderId: 'USER_GOOGLESHEETSOAUTH2_CREDENTIAL_ID', placeholderName: 'USER_GOOGLESHEETSOAUTH2_CREDENTIAL_NAME' },
      { type: 'googleDocsOAuth2Api', key: 'googleDocsOAuth2', placeholderId: 'USER_GOOGLEDOCSOAUTH2_CREDENTIAL_ID', placeholderName: 'USER_GOOGLEDOCSOAUTH2_CREDENTIAL_NAME' },
      { type: 'googleDriveOAuth2Api', key: 'googleDriveOAuth2', placeholderId: 'USER_GOOGLEDRIVEOAUTH2_CREDENTIAL_ID', placeholderName: 'USER_GOOGLEDRIVEOAUTH2_CREDENTIAL_NAME' },
      { type: 'gmailOAuth2', key: 'gmailOAuth2', placeholderId: 'USER_GMAILOAUTH2_CREDENTIAL_ID', placeholderName: 'USER_GMAILOAUTH2_CREDENTIAL_NAME' },
      { type: 'googleCalendarOAuth2Api', key: 'googleCalendarOAuth2', placeholderId: 'USER_GOOGLECALENDAROAUTH2_CREDENTIAL_ID', placeholderName: 'USER_GOOGLECALENDAROAUTH2_CREDENTIAL_NAME' },
      { type: 'googleAdsOAuth2Api', key: 'googleAdsOAuth2', placeholderId: 'USER_GOOGLEADSOAUTH2_CREDENTIAL_ID', placeholderName: 'USER_GOOGLEADSOAUTH2_CREDENTIAL_NAME' },
      { type: 'googleTasksOAuth2Api', key: 'googleTasksOAuth2', placeholderId: 'USER_GOOGLETASKSOAUTH2_CREDENTIAL_ID', placeholderName: 'USER_GOOGLETASKSOAUTH2_CREDENTIAL_NAME' },
      { type: 'googleSlidesOAuth2Api', key: 'googleSlidesOAuth2', placeholderId: 'USER_GOOGLESLIDESOAUTH2_CREDENTIAL_ID', placeholderName: 'USER_GOOGLESLIDESOAUTH2_CREDENTIAL_NAME' }
    ];
    
    let credentialsModified = 0;
    workflow.nodes.forEach(node => {
      // Détecter le type de nœud Google et assigner seulement le credential approprié
      let assignedService = null;
      
      // Google Sheets
      if (node.type && (node.type.includes('googleSheets') || node.type.includes('googleSheetsTool'))) {
        assignedService = googleServices.find(s => s.key === 'googleSheetsOAuth2');
      }
      // Google Docs
      else if (node.type && (node.type.includes('googleDocs') || node.type.includes('googleDocsTool'))) {
        assignedService = googleServices.find(s => s.key === 'googleDocsOAuth2');
      }
      // Google Drive
      else if (node.type && (node.type.includes('googleDrive') || node.type.includes('googleDriveTool'))) {
        assignedService = googleServices.find(s => s.key === 'googleDriveOAuth2');
      }
      // Gmail
      else if (node.type && node.type.includes('gmail')) {
        assignedService = googleServices.find(s => s.key === 'gmailOAuth2');
      }
      // Google Calendar
      else if (node.type && (node.type.includes('googleCalendar') || node.type.includes('calendar'))) {
        assignedService = googleServices.find(s => s.key === 'googleCalendarOAuth2');
      }
      // Google Ads
      else if (node.type && (node.type.includes('googleAds') || node.type.includes('ads'))) {
        assignedService = googleServices.find(s => s.key === 'googleAdsOAuth2');
      }
      // Google Tasks
      else if (node.type && (node.type.includes('googleTasks') || node.type.includes('tasks'))) {
        assignedService = googleServices.find(s => s.key === 'googleTasksOAuth2');
      }
      // Google Slides
      else if (node.type && (node.type.includes('googleSlides') || node.type.includes('slides') || node.type.includes('presentation'))) {
        assignedService = googleServices.find(s => s.key === 'googleSlidesOAuth2');
      }
      // Vérifier aussi dans les credentials existants
      else if (node.credentials) {
        for (const service of googleServices) {
          if (node.credentials[service.type]) {
            assignedService = service;
            break;
          }
        }
      }
      
      // Assigner seulement le credential approprié
      if (assignedService) {
        if (!node.credentials) {
          node.credentials = {};
        }
        
        // Nettoyer les autres credentials Google qui ne sont pas appropriés
        googleServices.forEach(service => {
          if (service.key !== assignedService.key && node.credentials[service.type]) {
            delete node.credentials[service.type];
          }
        });
        
        // Assigner le placeholder pour le service approprié
        if (!node.credentials[assignedService.type] || 
            (node.credentials[assignedService.type].id && !node.credentials[assignedService.type].id.includes('USER_'))) {
          node.credentials[assignedService.type] = {
            id: assignedService.placeholderId,
            name: assignedService.placeholderName
          };
          credentialsModified++;
          console.log(`✅ Credential ${assignedService.key} configuré avec placeholder pour ${node.name} (${node.type})`);
        }
      }
    });
    
    if (credentialsModified > 0) {
      console.log(`\n✅ ${credentialsModified} credential(s) Google configuré(s) avec des placeholders`);
      modified = true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 5. SAUVEGARDER LE TEMPLATE MODIFIÉ
    // ═══════════════════════════════════════════════════════════════════════════
    if (modified) {
      console.log('\n💾 Mise à jour du template dans la base de données...');
      await db.query(
        'UPDATE templates SET json = $1 WHERE id = $2',
        [JSON.stringify(workflow), TEMPLATE_ID]
      );
      
      console.log('\n✅ Template mis à jour avec succès!');
      console.log('\n📝 Résumé des modifications:');
      console.log('   1. ✅ Un seul webhook déclencheur conservé');
      console.log('   2. ✅ Webhook configuré avec responseMode: responseNode');
      console.log('   3. ✅ Nœud "Respond to Webhook" présent et connecté');
      console.log(`   4. ✅ ${credentialsModified} credential(s) Google configuré(s) avec des placeholders`);
      console.log('\n⚠️  IMPORTANT: Les workflows existants doivent être redéployés pour utiliser les nouvelles configurations!');
    } else {
      console.log('\n⚠️  Aucune modification nécessaire');
    }
    
    console.log(`\n📊 Nombre de nœuds après: ${workflow.nodes?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
})();

