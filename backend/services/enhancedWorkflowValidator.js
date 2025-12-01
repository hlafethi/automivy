// Service de validation avancée des workflows
// Valide la structure ET la logique métier

class EnhancedWorkflowValidator {
  
  // Validation complète (structure + logique)
  static validateComplete(workflow, analysis) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      structure: this.validateStructure(workflow),
      businessLogic: this.validateBusinessLogic(workflow, analysis),
      parameters: this.validateParameters(workflow),
      connections: this.validateConnections(workflow),
      credentials: this.validateCredentials(workflow, analysis)
    };
    
    // Agréger les résultats
    validation.errors = [
      ...validation.structure.errors,
      ...validation.businessLogic.errors,
      ...validation.parameters.errors,
      ...validation.connections.errors,
      ...validation.credentials.errors
    ];
    
    validation.warnings = [
      ...validation.structure.warnings,
      ...validation.businessLogic.warnings,
      ...validation.parameters.warnings,
      ...validation.connections.warnings,
      ...validation.credentials.warnings
    ];
    
    validation.suggestions = [
      ...validation.structure.suggestions,
      ...validation.businessLogic.suggestions,
      ...validation.parameters.suggestions,
      ...validation.connections.suggestions,
      ...validation.credentials.suggestions
    ];
    
    validation.valid = validation.errors.length === 0;
    
    return validation;
  }
  
  // Validation de la structure
  static validateStructure(workflow) {
    const errors = [];
    const warnings = [];
    const suggestions = [];
    
    // Vérifier les champs obligatoires
    if (!workflow.name) {
      errors.push('Workflow must have a name');
    }
    
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push('Workflow must have a nodes array');
      return { valid: false, errors, warnings, suggestions };
    }
    
    if (workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }
    
    if (!workflow.connections || typeof workflow.connections !== 'object') {
      warnings.push('Workflow has no connections defined');
    }
    
    if (!workflow.settings) {
      warnings.push('Workflow should have settings object (even if empty)');
      suggestions.push('Add "settings": {} to workflow');
    }
    
    if (workflow.active === undefined) {
      warnings.push('Workflow should have active field (set to false)');
    }
    
    // Vérifier chaque nœud
    workflow.nodes.forEach((node, index) => {
      if (!node.id) {
        errors.push(`Node ${index + 1} (${node.name || 'unnamed'}): Missing id`);
      }
      
      if (!node.name) {
        errors.push(`Node ${index + 1}: Missing name`);
      }
      
      if (!node.type) {
        errors.push(`Node ${index + 1} (${node.name || 'unnamed'}): Missing type`);
      }
      
      if (!node.typeVersion) {
        warnings.push(`Node ${index + 1} (${node.name}): Missing typeVersion`);
        suggestions.push(`Add typeVersion: 1 to node "${node.name}"`);
      }
      
      if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
        warnings.push(`Node ${index + 1} (${node.name}): Invalid or missing position`);
        suggestions.push(`Add position: [${250 + index * 250}, 300] to node "${node.name}"`);
      }
      
      if (!node.parameters) {
        warnings.push(`Node ${index + 1} (${node.name}): Missing parameters object`);
      }
    });
    
    return { valid: errors.length === 0, errors, warnings, suggestions };
  }
  
  // Validation de la logique métier
  static validateBusinessLogic(workflow, analysis) {
    const errors = [];
    const warnings = [];
    const suggestions = [];
    
    const nodeTypes = workflow.nodes.map(n => n.type);
    const nodeNames = workflow.nodes.map(n => n.name);
    
    // Vérifier qu'il y a un trigger
    const hasTrigger = nodeTypes.some(type => 
      type.includes('webhook') || type.includes('schedule') || type.includes('trigger') || type.includes('emailReadImap')
    );
    
    if (!hasTrigger) {
      errors.push('Workflow must have at least one trigger node');
      suggestions.push('Add a Webhook Trigger, Schedule Trigger, or IMAP Email Read node');
    }
    
    // Vérifier les nœuds requis selon l'analyse
    if (analysis && analysis.requiredNodes) {
      analysis.requiredNodes.forEach(requiredNode => {
        const hasNode = nodeTypes.some(type => type === requiredNode || type.includes(requiredNode.split('.')[1]));
        if (!hasNode) {
          errors.push(`Required node missing: ${requiredNode}`);
          suggestions.push(`Add node of type: ${requiredNode}`);
        }
      });
    }
    
    // Vérifier les workflows email (sauf newsletters)
    if (analysis && (analysis.workflowType === 'email-automation' || analysis.workflowType === 'email-summary')) {
      const hasImap = nodeTypes.some(type => type === 'n8n-nodes-base.emailReadImap');
      const hasAggregate = nodeTypes.some(type => type === 'n8n-nodes-base.aggregate');
      const hasAgent = nodeTypes.some(type => type.includes('agent'));
      
      if (!hasImap) {
        errors.push('Email workflow must have IMAP Email Read node');
      }
      
      if (!hasAggregate && hasAgent) {
        errors.push('Email workflow with AI Agent must have Aggregate node between IMAP and Agent');
        suggestions.push('Add Aggregate node: destinationFieldName: "data"');
      }
    }
    
    // Vérifier les newsletters (pas besoin d'IMAP, mais besoin de RSS)
    if (analysis && analysis.workflowType === 'newsletter') {
      const hasRss = nodeTypes.some(type => type === 'n8n-nodes-base.rssFeed');
      const hasSchedule = nodeTypes.some(type => type === 'n8n-nodes-base.schedule');
      const hasEmailSend = nodeTypes.some(type => type === 'n8n-nodes-base.emailSend');
      const hasAgent = nodeTypes.some(type => type.includes('agent'));
      const hasAggregate = nodeTypes.some(type => type === 'n8n-nodes-base.aggregate');
      
      if (!hasRss) {
        warnings.push('Newsletter workflow should have RSS Feed node to collect articles');
      }
      
      if (!hasSchedule) {
        warnings.push('Newsletter workflow should have Schedule Trigger for automated sending');
      }
      
      if (!hasEmailSend) {
        errors.push('Newsletter workflow must have Email Send node');
      }
      
      // Vérifier le prompt de l'agent
      if (hasAgent) {
        const agentNode = workflow.nodes.find(n => n.type.includes('agent'));
        if (agentNode && agentNode.parameters) {
          const prompt = agentNode.parameters.text || agentNode.parameters.prompt || '';
          if (hasAggregate && !prompt.includes('$json.data')) {
            warnings.push('AI Agent prompt should use {{ $json.data.toJsonString() }} for aggregated emails');
            suggestions.push('Update AI Agent prompt to use {{ $json.data.toJsonString() }}');
          }
        }
      }
    }
    
    // Vérifier les workflows AI
    if (analysis && analysis.aiRequirements && analysis.aiRequirements.needsAI) {
      const hasAgent = nodeTypes.some(type => type.includes('agent'));
      const hasModel = nodeTypes.some(type => type.includes('lmChatOpenRouter') || type.includes('lmChat'));
      const hasTool = nodeTypes.some(type => type.includes('toolCalculator'));
      const hasMemory = nodeTypes.some(type => type.includes('memory'));
      
      if (!hasAgent) {
        errors.push('AI workflow must have AI Agent node');
      }
      
      if (!hasModel) {
        errors.push('AI Agent workflow must have OpenRouter Chat Model node');
      }
      
      if (analysis.aiRequirements.needsTools && !hasTool) {
        warnings.push('AI Agent should have Calculator Tool for calculations');
      }
      
      if (analysis.aiRequirements.needsMemory && !hasMemory) {
        warnings.push('AI Agent should have Buffer Window Memory for context');
      }
    }
    
    // Vérifier la connexion logique
    if (workflow.connections) {
      const connectedNodes = new Set();
      Object.keys(workflow.connections).forEach(fromNode => {
        connectedNodes.add(fromNode);
        const nodeConns = workflow.connections[fromNode];
        Object.values(nodeConns).forEach(connArray => {
          if (Array.isArray(connArray)) {
            connArray.forEach(conn => {
              if (Array.isArray(conn)) {
                conn.forEach(c => {
                  if (c && c.node) connectedNodes.add(c.node);
                });
              } else if (conn && conn.node) {
                connectedNodes.add(conn.node);
              }
            });
          }
        });
      });
      
      // Vérifier les nœuds isolés
      workflow.nodes.forEach(node => {
        if (!connectedNodes.has(node.name)) {
          warnings.push(`Node "${node.name}" is not connected to the workflow`);
          suggestions.push(`Connect node "${node.name}" to the workflow`);
        }
      });
    }
    
    return { valid: errors.length === 0, errors, warnings, suggestions };
  }
  
  // Validation des paramètres
  static validateParameters(workflow) {
    const errors = [];
    const warnings = [];
    const suggestions = [];
    
    workflow.nodes.forEach((node, index) => {
      if (!node.parameters) {
        return;
      }
      
      const params = node.parameters;
      
      // Vérifier les paramètres critiques selon le type
      if (node.type === 'n8n-nodes-base.webhook') {
        if (!params.path) {
          errors.push(`Webhook node "${node.name}": Missing path parameter`);
        }
        if (!params.httpMethod) {
          warnings.push(`Webhook node "${node.name}": Missing httpMethod (defaults to GET)`);
        }
      }
      
      if (node.type === 'n8n-nodes-base.emailReadImap') {
        if (!params.mailbox) {
          warnings.push(`IMAP node "${node.name}": Missing mailbox (defaults to INBOX)`);
        }
      }
      
      if (node.type === 'n8n-nodes-base.aggregate') {
        if (!params.destinationFieldName) {
          errors.push(`Aggregate node "${node.name}": Missing destinationFieldName (should be "data")`);
          suggestions.push(`Set destinationFieldName: "data" in Aggregate node`);
        }
        if (params.destinationFieldName !== 'data') {
          warnings.push(`Aggregate node "${node.name}": destinationFieldName should be "data" for email workflows`);
        }
      }
      
      if (node.type === '@n8n/n8n-nodes-langchain.agent') {
        if (!params.text && !params.prompt) {
          errors.push(`AI Agent node "${node.name}": Missing prompt text`);
        }
        if (params.text && !params.text.includes('$json')) {
          warnings.push(`AI Agent node "${node.name}": Prompt should reference $json data`);
        }
      }
      
      if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter') {
        if (!params.model) {
          errors.push(`OpenRouter node "${node.name}": Missing model parameter`);
        }
      }
      
      if (node.type === 'n8n-nodes-base.emailSend') {
        if (!params.toEmail) {
          errors.push(`Email Send node "${node.name}": Missing toEmail parameter`);
        }
        if (params.toEmail && !params.toEmail.includes('USER_EMAIL') && !params.toEmail.includes('@')) {
          warnings.push(`Email Send node "${node.name}": toEmail should use {{USER_EMAIL}} or a valid email`);
        }
      }
      
      // Vérifier les placeholders TODO
      const paramString = JSON.stringify(params);
      if (paramString.includes('TODO') || paramString.includes('?') || paramString.includes('PLACEHOLDER')) {
        warnings.push(`Node "${node.name}": Contains placeholder values (TODO, ?, PLACEHOLDER)`);
        suggestions.push(`Replace placeholders with real values in node "${node.name}"`);
      }
    });
    
    return { valid: errors.length === 0, errors, warnings, suggestions };
  }
  
  // Validation des connexions
  static validateConnections(workflow) {
    const errors = [];
    const warnings = [];
    const suggestions = [];
    
    if (!workflow.connections) {
      warnings.push('No connections defined in workflow');
      return { valid: true, errors, warnings, suggestions };
    }
    
    const nodeNames = workflow.nodes.map(n => n.name);
    
    Object.entries(workflow.connections).forEach(([fromNode, nodeConnections]) => {
      // Vérifier que le nœud source existe
      if (!nodeNames.includes(fromNode)) {
        errors.push(`Connection from unknown node: "${fromNode}"`);
        return; // Continue to next fromNode
      }
      
      // Vérifier chaque type de connexion
      Object.entries(nodeConnections).forEach(([connectionType, connections]) => {
        if (!Array.isArray(connections)) {
          errors.push(`Connection type "${connectionType}" from "${fromNode}" must be an array`);
          return; // Continue to next connectionType
        }
        
        connections.forEach((connection, connIndex) => {
          if (!Array.isArray(connection)) {
            errors.push(`Connection ${connIndex} from "${fromNode}" must be array of arrays`);
            return; // Continue to next connection
          }
          
          connection.forEach(conn => {
            if (!conn || typeof conn !== 'object') {
              errors.push(`Invalid connection object from "${fromNode}"`);
              return; // Continue to next conn
            }
            
            if (!conn.node) {
              errors.push(`Connection from "${fromNode}" missing node name`);
              return; // Continue to next conn
            }
            
            if (!nodeNames.includes(conn.node)) {
              errors.push(`Connection to unknown node: "${conn.node}" from "${fromNode}"`);
              suggestions.push(`Check if node name "${conn.node}" matches a node name in the workflow`);
            }
            
            if (!conn.type) {
              errors.push(`Connection from "${fromNode}" to "${conn.node}" missing type`);
            }
            
            if (conn.type === 'next') {
              errors.push(`Connection type "next" is invalid - use "main" instead`);
              suggestions.push(`Change connection type from "next" to "main"`);
            }
          });
        });
      });
    });
    
    // Vérifier les connexions AI
    const agentNodes = workflow.nodes.filter(n => n.type.includes('agent'));
    const openRouterNodes = workflow.nodes.filter(n => n.type.includes('lmChatOpenRouter'));
    const calculatorNodes = workflow.nodes.filter(n => n.type.includes('toolCalculator'));
    const memoryNodes = workflow.nodes.filter(n => n.type.includes('memory'));
    
    if (agentNodes.length > 0 && openRouterNodes.length > 0) {
      const agentName = agentNodes[0].name;
      let hasLanguageModelConnection = false;
      
      openRouterNodes.forEach(openRouterNode => {
        const openRouterConns = workflow.connections[openRouterNode.name];
        if (openRouterConns && openRouterConns.ai_languageModel) {
          const aiConns = openRouterConns.ai_languageModel.flat().flat();
          if (aiConns.some(c => c.node === agentName)) {
            hasLanguageModelConnection = true;
          }
        }
      });
      
      if (!hasLanguageModelConnection) {
        errors.push(`OpenRouter Chat Model must connect to AI Agent via ai_languageModel`);
        suggestions.push(`Add connection: "OpenRouter Chat Model": { "ai_languageModel": [[{"node": "${agentName}", "type": "ai_languageModel", "index": 0}]] }`);
      }
    }
    
    return { valid: errors.length === 0, errors, warnings, suggestions };
  }
  
  // Validation des credentials
  static validateCredentials(workflow, analysis) {
    const errors = [];
    const warnings = [];
    const suggestions = [];
    
    const requiredCredentials = analysis && analysis.credentials ? analysis.credentials : [];
    
    workflow.nodes.forEach((node, index) => {
      if (!node.credentials || Object.keys(node.credentials).length === 0) {
        // Vérifier si le nœud nécessite des credentials
        if (node.type.includes('emailReadImap') || node.type.includes('imap')) {
          if (requiredCredentials.includes('imap')) {
            errors.push(`IMAP node "${node.name}" missing credentials`);
            suggestions.push(`Add credentials: {"imap": {"id": "USER_IMAP_CREDENTIAL_ID", "name": "USER_IMAP_CREDENTIAL_NAME"}}`);
          }
        }
        
        if (node.type.includes('emailSend') || node.type.includes('smtp')) {
          if (requiredCredentials.includes('smtp')) {
            errors.push(`SMTP node "${node.name}" missing credentials`);
            suggestions.push(`Add credentials: {"smtp": {"id": "USER_SMTP_CREDENTIAL_ID", "name": "USER_SMTP_CREDENTIAL_NAME"}}`);
          }
        }
        
        if (node.type.includes('lmChatOpenRouter') || node.type.includes('openRouter')) {
          if (requiredCredentials.includes('openrouter')) {
            errors.push(`OpenRouter node "${node.name}" missing credentials`);
            suggestions.push(`Add credentials: {"openRouterApi": {"id": "ADMIN_OPENROUTER_CREDENTIAL_ID", "name": "ADMIN_OPENROUTER_CREDENTIAL_NAME"}}`);
          }
        }
        
        if (node.type.includes('slack')) {
          if (requiredCredentials.includes('slack')) {
            errors.push(`Slack node "${node.name}" missing credentials`);
          }
        }
      } else {
        // Vérifier le format des credentials
        Object.entries(node.credentials).forEach(([credType, credValue]) => {
          if (typeof credValue === 'string') {
            errors.push(`Node "${node.name}": Credential "${credType}" is a string, must be an object`);
            suggestions.push(`Change credential format to: {"${credType}": {"id": "...", "name": "..."}}`);
          } else if (typeof credValue === 'object' && credValue !== null) {
            if (!credValue.id || !credValue.name) {
              warnings.push(`Node "${node.name}": Credential "${credType}" should have id and name`);
            }
          }
        });
      }
    });
    
    return { valid: errors.length === 0, errors, warnings, suggestions };
  }
  
  // Corriger automatiquement les erreurs détectées
  static autoFix(workflow, validation, analysis = null) {
    const fixed = JSON.parse(JSON.stringify(workflow)); // Deep clone
    
    // Corriger la structure
    if (!fixed.settings) {
      fixed.settings = {};
    }
    
    if (fixed.active === undefined) {
      fixed.active = false;
    }
    
    if (!fixed.versionId) {
      fixed.versionId = '1';
    }
    
    // S'assurer que nodes existe
    if (!fixed.nodes || !Array.isArray(fixed.nodes)) {
      fixed.nodes = [];
    }
    
    const nodeTypes = fixed.nodes.map(n => n.type);
    const nodeNames = fixed.nodes.map(n => n.name);
    
    // CORRECTION 1: Ajouter le Schedule Trigger manquant pour les newsletters
    if (analysis && analysis.workflowType === 'newsletter') {
      const hasSchedule = nodeTypes.some(type => 
        type === 'n8n-nodes-base.schedule' || 
        type === 'n8n-nodes-base.scheduleTrigger' ||
        type.includes('schedule')
      );
      
      if (!hasSchedule) {
        console.log('🔧 [AutoFix] Ajout du Schedule Trigger manquant pour newsletter...');
        const scheduleNode = {
          id: 'schedule-trigger',
          name: 'Schedule Trigger',
          type: 'n8n-nodes-base.schedule',
          position: [250, 300],
          parameters: {
            rule: {
              interval: [{
                field: 'cronExpression',
                cronExpression: analysis.scheduling?.time ? 
                  `${analysis.scheduling.time.split(':')[1] || '0'} ${analysis.scheduling.time.split(':')[0] || '6'} * * *` :
                  '0 6 * * *' // Par défaut: 6h00
              }]
            }
          },
          typeVersion: 1.1
        };
        fixed.nodes.unshift(scheduleNode); // Ajouter au début
        nodeNames.unshift('Schedule Trigger');
        console.log('✅ [AutoFix] Schedule Trigger ajouté');
      }
    }
    
    // CORRECTION 2: Ajouter un trigger générique si aucun trigger n'existe
    const hasTrigger = nodeTypes.some(type => 
      type.includes('webhook') || 
      type.includes('schedule') || 
      type.includes('trigger') || 
      type.includes('emailReadImap') ||
      type.includes('manualTrigger')
    );
    
    if (!hasTrigger && fixed.nodes.length > 0) {
      console.log('🔧 [AutoFix] Ajout d\'un trigger manquant...');
      // Déterminer le type de trigger selon l'analyse
      let triggerNode;
      if (analysis && analysis.triggers && analysis.triggers.includes('schedule')) {
        triggerNode = {
          id: 'schedule-trigger',
          name: 'Schedule Trigger',
          type: 'n8n-nodes-base.schedule',
          position: [250, 300],
          parameters: {
            rule: {
              interval: [{
                field: 'cronExpression',
                cronExpression: analysis.scheduling?.time ? 
                  `${analysis.scheduling.time.split(':')[1] || '0'} ${analysis.scheduling.time.split(':')[0] || '6'} * * *` :
                  '0 6 * * *'
              }]
            }
          },
          typeVersion: 1.1
        };
      } else {
        triggerNode = {
          id: 'webhook-trigger',
          name: 'Webhook Trigger',
          type: 'n8n-nodes-base.webhook',
          position: [250, 300],
          parameters: {
            path: 'workflow-endpoint',
            httpMethod: 'POST',
            responseMode: 'responseNode'
          },
          typeVersion: 1.1
        };
      }
      fixed.nodes.unshift(triggerNode);
      nodeNames.unshift(triggerNode.name);
      console.log(`✅ [AutoFix] Trigger ajouté: ${triggerNode.name}`);
    }
    
    // CORRECTION 3: Ajouter les nœuds requis manquants selon l'analyse
    if (analysis && analysis.requiredNodes) {
      analysis.requiredNodes.forEach(requiredNode => {
        const hasNode = nodeTypes.some(type => 
          type === requiredNode || 
          type.includes(requiredNode.split('.').pop() || '')
        );
        
        if (!hasNode) {
          console.log(`🔧 [AutoFix] Ajout du nœud requis manquant: ${requiredNode}...`);
          
          // Créer le nœud selon son type
          let newNode = null;
          const nodeId = requiredNode.split('.').pop()?.toLowerCase().replace(/-/g, '-') || 'node';
          
          if (requiredNode === 'n8n-nodes-base.schedule') {
            newNode = {
              id: 'schedule-trigger',
              name: 'Schedule Trigger',
              type: 'n8n-nodes-base.schedule',
              position: [250, 300],
              parameters: {
                rule: {
                  interval: [{
                    field: 'cronExpression',
                    cronExpression: analysis.scheduling?.time ? 
                      `${analysis.scheduling.time.split(':')[1] || '0'} ${analysis.scheduling.time.split(':')[0] || '6'} * * *` :
                      '0 6 * * *'
                  }]
                }
              },
              typeVersion: 1.1
            };
          } else if (requiredNode === 'n8n-nodes-base.rssFeed') {
            newNode = {
              id: 'rss-feed',
              name: 'RSS Feed',
              type: 'n8n-nodes-base.rssFeed',
              position: [500, 300],
              parameters: {
                urls: ['https://example.com/feed/'],
                limit: 10,
                includeFullArticle: false
              },
              typeVersion: 1
            };
          } else if (requiredNode === 'n8n-nodes-base.code') {
            newNode = {
              id: 'code-node',
              name: 'Code',
              type: 'n8n-nodes-base.code',
              position: [750, 300],
              parameters: {
                jsCode: '// Code placeholder\nreturn items;'
              },
              typeVersion: 1
            };
          } else if (requiredNode === 'n8n-nodes-base.aggregate') {
            newNode = {
              id: 'aggregate',
              name: 'Aggregate',
              type: 'n8n-nodes-base.aggregate',
              position: [1000, 300],
              parameters: {
                aggregate: 'aggregateAllItemData',
                destinationFieldName: 'data'
              },
              typeVersion: 1
            };
          } else if (requiredNode === 'n8n-nodes-base.emailSend') {
            newNode = {
              id: 'send-email',
              name: 'Send Email',
              type: 'n8n-nodes-base.emailSend',
              position: [2000, 300],
              parameters: {
                fromEmail: '{{USER_EMAIL}}',
                toEmail: '{{USER_EMAIL}}',
                subject: 'Workflow Notification',
                emailType: 'html',
                message: '{{ $json }}'
              },
              typeVersion: 1,
              credentials: {
                smtp: {
                  id: 'USER_SMTP_CREDENTIAL_ID',
                  name: 'USER_SMTP_CREDENTIAL_NAME'
                }
              }
            };
          }
          
          if (newNode) {
            fixed.nodes.push(newNode);
            nodeNames.push(newNode.name);
            console.log(`✅ [AutoFix] Nœud ajouté: ${newNode.name}`);
          }
        }
      });
    }
    
    // Corriger les nœuds existants
    fixed.nodes = fixed.nodes.map((node, index) => {
      // Ajouter ID manquant
      if (!node.id) {
        node.id = node.name ? node.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : `node-${index}`;
      }
      
      // Ajouter typeVersion manquant
      if (!node.typeVersion) {
        node.typeVersion = 1;
      }
      
      // Ajouter position manquante (réajuster après ajout de nœuds)
      if (!node.position || !Array.isArray(node.position)) {
        node.position = [250 + index * 250, 300];
      }
      
      // Ajouter parameters manquant
      if (!node.parameters) {
        node.parameters = {};
      }
      
      // Corriger les credentials (string → objet)
      if (node.credentials) {
        const fixedCreds = {};
        Object.entries(node.credentials).forEach(([credType, credValue]) => {
          if (typeof credValue === 'string') {
            fixedCreds[credType] = {
              id: credValue,
              name: credValue.replace(/_/g, ' ').replace(/ID$/g, '').replace(/CREDENTIAL/g, '')
            };
          } else {
            fixedCreds[credType] = credValue;
          }
        });
        node.credentials = fixedCreds;
      }
      
      return node;
    });
    
    // Réajuster les positions après ajout de nœuds
    fixed.nodes.forEach((node, index) => {
      node.position = [250 + index * 250, 300];
    });
    
    // CORRECTION 4: Créer les connexions manquantes pour les nouveaux nœuds
    if (!fixed.connections) {
      fixed.connections = {};
    }
    
    const updatedNodeNames = fixed.nodes.map(n => n.name);
    
    // Si on a ajouté un Schedule Trigger, le connecter au premier nœud suivant
    const scheduleNode = fixed.nodes.find(n => 
      n.type === 'n8n-nodes-base.schedule' || 
      n.type === 'n8n-nodes-base.scheduleTrigger'
    );
    
    if (scheduleNode && fixed.nodes.length > 1) {
      const firstNonTriggerNode = fixed.nodes.find(n => 
        n.type !== 'n8n-nodes-base.schedule' && 
        n.type !== 'n8n-nodes-base.scheduleTrigger' &&
        n.type !== 'n8n-nodes-base.webhook' &&
        n.type !== 'n8n-nodes-base.manualTrigger'
      );
      
      if (firstNonTriggerNode && !fixed.connections[scheduleNode.name]) {
        fixed.connections[scheduleNode.name] = {
          main: [[{
            node: firstNonTriggerNode.name,
            type: 'main',
            index: 0
          }]]
        };
        console.log(`✅ [AutoFix] Connexion créée: ${scheduleNode.name} → ${firstNonTriggerNode.name}`);
      }
    }
    
    // Corriger les connexions existantes
    const fixedConnections = {};
    
    Object.entries(fixed.connections || {}).forEach(([fromNode, nodeConnections]) => {
      if (updatedNodeNames.includes(fromNode)) {
        fixedConnections[fromNode] = {};
        
        Object.entries(nodeConnections).forEach(([connType, connections]) => {
          // S'assurer que c'est un tableau de tableaux
          if (Array.isArray(connections)) {
            if (connections.length > 0 && !Array.isArray(connections[0])) {
              // Convertir en tableau de tableaux
              fixedConnections[fromNode][connType] = [connections];
            } else {
              // Filtrer les connexions vers des nœuds qui existent
              fixedConnections[fromNode][connType] = connections.map(connArray => 
                connArray.filter(conn => updatedNodeNames.includes(conn.node))
              ).filter(connArray => connArray.length > 0);
            }
          }
        });
      }
    });
    
    fixed.connections = fixedConnections;
    
    return fixed;
  }
}

module.exports = EnhancedWorkflowValidator;



