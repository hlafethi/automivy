// Service de validation des nœuds n8n
class N8nNodeValidator {
  
  // Base de données des nœuds n8n validés
  static VALIDATED_NODES = {
    // TRIGGERS - Nœuds de déclenchement
    triggers: {
      'n8n-nodes-base.webhook': {
        name: 'Webhook',
        description: 'Déclencheur HTTP pour recevoir des données',
        parameters: {
          httpMethod: 'POST',
          path: 'webhook',
          responseMode: 'responseNode'
        },
        position: [250, 300]
      },
      'n8n-nodes-base.schedule': {
        name: 'Schedule Trigger',
        description: 'Déclencheur programmé',
        parameters: {
          rule: {
            interval: [{ field: 'hours', hoursInterval: 1 }]
          }
        },
        position: [250, 300]
      },
      'n8n-nodes-base.manualTrigger': {
        name: 'Manual Trigger',
        description: 'Déclencheur manuel',
        parameters: {},
        position: [250, 300]
      }
    },
    
    // EMAIL - Nœuds de messagerie
    email: {
      'n8n-nodes-base.emailReadImap': {
        name: 'IMAP Email',
        description: 'Lecture d\'emails IMAP',
        parameters: {
          mailbox: 'INBOX',
          markSeen: true,
          downloadAttachments: true
        },
        credentials: 'imap',
        position: [500, 300]
      },
      'n8n-nodes-base.emailSend': {
        name: 'Send Email',
        description: 'Envoi d\'email',
        parameters: {
          fromEmail: '{{ $json.from }}',
          toEmail: '{{ $json.to }}',
          subject: '{{ $json.subject }}',
          message: '{{ $json.message }}'
        },
        credentials: 'smtp',
        position: [1000, 300]
      },
      'n8n-nodes-imap.imap': {
        name: 'IMAP',
        description: 'Connexion IMAP',
        parameters: {
          operation: 'getAll',
          mailbox: 'INBOX'
        },
        credentials: 'imap',
        position: [500, 300]
      }
    },
    
    // COMMUNICATION - Nœuds de communication
    communication: {
      'n8n-nodes-base.slack': {
        name: 'Slack',
        description: 'Intégration Slack',
        parameters: {
          operation: 'postMessage',
          channel: '{{ $json.channel }}',
          text: '{{ $json.message }}'
        },
        credentials: 'slack',
        position: [750, 300]
      },
      'n8n-nodes-base.discord': {
        name: 'Discord',
        description: 'Intégration Discord',
        parameters: {
          operation: 'postMessage',
          channel: '{{ $json.channel }}',
          content: '{{ $json.message }}'
        },
        credentials: 'discord',
        position: [750, 300]
      }
    },
    
    // APIS & DATA - Nœuds d'API et données
    apis: {
      'n8n-nodes-base.httpRequest': {
        name: 'HTTP Request',
        description: 'Requête HTTP',
        parameters: {
          url: '{{ $json.url }}',
          method: 'GET',
          headers: {}
        },
        position: [750, 300]
      },
      'n8n-nodes-base.postgres': {
        name: 'PostgreSQL',
        description: 'Base de données PostgreSQL',
        parameters: {
          operation: 'executeQuery',
          query: '{{ $json.query }}'
        },
        credentials: 'postgres',
        position: [750, 300]
      },
      'n8n-nodes-base.mysql': {
        name: 'MySQL',
        description: 'Base de données MySQL',
        parameters: {
          operation: 'executeQuery',
          query: '{{ $json.query }}'
        },
        credentials: 'mysql',
        position: [750, 300]
      }
    },
    
    // PROCESSING - Nœuds de traitement
    processing: {
      'n8n-nodes-base.aggregate': {
        name: 'Aggregate',
        description: 'Agrégation de données',
        parameters: {
          operation: 'aggregateItems',
          aggregate: 'aggregateAllItemData'
        },
        position: [750, 300]
      },
      'n8n-nodes-base.set': {
        name: 'Set',
        description: 'Définition de variables',
        parameters: {
          values: {
            string: [
              { name: 'processed', value: 'true' }
            ]
          }
        },
        position: [750, 300]
      },
      'n8n-nodes-base.code': {
        name: 'Code',
        description: 'Code JavaScript personnalisé',
        parameters: {
          jsCode: '// Code personnalisé\nreturn items;'
        },
        position: [750, 300]
      },
      'n8n-nodes-base.markdown': {
        name: 'Markdown',
        description: 'Conversion Markdown',
        parameters: {
          operation: 'toHtml',
          markdown: '{{ $json.markdown }}'
        },
        position: [750, 300]
      }
    },
    
    // AI & LANGCHAIN - Nœuds d'IA
    ai: {
      '@n8n/n8n-nodes-langchain.agent': {
        name: 'AI Agent',
        description: 'Agent IA avec outils',
        parameters: {
          promptType: 'define',
          text: '{{ $json.prompt }}',
          options: {}
        },
        position: [750, 300]
      },
      '@n8n/n8n-nodes-langchain.lmChatOpenRouter': {
        name: 'OpenRouter Chat Model',
        description: 'Modèle de chat OpenRouter',
        parameters: {
          model: 'claude-3.5-sonnet',
          temperature: 0.7,
          maxTokens: 4000
        },
        credentials: 'openRouterApi',
        position: [750, 500]
      },
      '@n8n/n8n-nodes-langchain.toolCalculator': {
        name: 'Calculator Tool',
        description: 'Outil de calcul',
        parameters: {
          name: 'calculator',
          description: 'Calculate mathematical expressions'
        },
        position: [750, 650]
      },
      '@n8n/n8n-nodes-langchain.memoryBufferWindow': {
        name: 'Buffer Window Memory',
        description: 'Mémoire tampon',
        parameters: {
          sessionId: '{{ $json.sessionId }}',
          k: 5
        },
        position: [750, 800]
      }
    }
  };
  
  // Nœuds invalides connus (à éviter)
  static INVALID_NODES = [
    'n8n-nodes-base.watchFolder',
    'n8n-nodes-base.pdfParser', 
    'n8n-nodes-base.pdfExtract',
    'n8n-nodes-base.readBinaryFiles',
    'n8n-nodes-base.writeFile',
    'n8n-nodes-base.readFile',
    'n8n-nodes-base.moveFile',
    'n8n-nodes-base.copyFile'
  ];
  
  // Valider un nœud
  static validateNode(node) {
    const allValidNodes = this.getAllValidNodes();
    
    if (this.INVALID_NODES.includes(node.type)) {
      return {
        valid: false,
        error: `Node type '${node.type}' is invalid and not supported`,
        suggestion: this.suggestAlternative(node.type)
      };
    }
    
    if (!allValidNodes.includes(node.type)) {
      return {
        valid: false,
        error: `Node type '${node.type}' is not recognized`,
        suggestion: this.findClosestMatch(node.type)
      };
    }
    
    return {
      valid: true,
      node: this.getNodeDefinition(node.type)
    };
  }
  
  // Obtenir tous les nœuds valides
  static getAllValidNodes() {
    return Object.values(this.VALIDATED_NODES)
      .flatMap(category => Object.keys(category));
  }
  
  // Obtenir la définition d'un nœud
  static getNodeDefinition(nodeType) {
    for (const category of Object.values(this.VALIDATED_NODES)) {
      if (category[nodeType]) {
        return category[nodeType];
      }
    }
    return null;
  }
  
  // Suggérer une alternative pour un nœud invalide
  static suggestAlternative(invalidType) {
    const alternatives = {
      'n8n-nodes-base.watchFolder': 'n8n-nodes-base.schedule + n8n-nodes-base.httpRequest',
      'n8n-nodes-base.pdfParser': 'n8n-nodes-base.httpRequest (to PDF processing API)',
      'n8n-nodes-base.pdfExtract': 'n8n-nodes-base.extractFromFile',
      'n8n-nodes-base.readBinaryFiles': 'n8n-nodes-base.httpRequest (to file storage API)',
      'n8n-nodes-base.writeFile': 'n8n-nodes-base.httpRequest (to file storage API)',
      'n8n-nodes-base.readFile': 'n8n-nodes-base.httpRequest (to file storage API)',
      'n8n-nodes-base.moveFile': 'n8n-nodes-base.httpRequest (to file storage API)',
      'n8n-nodes-base.copyFile': 'n8n-nodes-base.httpRequest (to file storage API)'
    };
    
    return alternatives[invalidType] || 'n8n-nodes-base.code';
  }
  
  // Trouver le nœud le plus proche
  static findClosestMatch(nodeType) {
    const allValidNodes = this.getAllValidNodes();
    const lowerType = nodeType.toLowerCase();
    
    // Recherche par mots-clés
    if (lowerType.includes('email') || lowerType.includes('mail')) {
      return 'n8n-nodes-base.emailSend';
    } else if (lowerType.includes('http') || lowerType.includes('api')) {
      return 'n8n-nodes-base.httpRequest';
    } else if (lowerType.includes('ai') || lowerType.includes('agent')) {
      return '@n8n/n8n-nodes-langchain.agent';
    } else if (lowerType.includes('database') || lowerType.includes('db')) {
      return 'n8n-nodes-base.postgres';
    } else if (lowerType.includes('slack')) {
      return 'n8n-nodes-base.slack';
    } else if (lowerType.includes('discord')) {
      return 'n8n-nodes-base.discord';
    }
    
    return 'n8n-nodes-base.code';
  }
  
  // Valider un workflow complet
  static validateWorkflow(workflow) {
    const errors = [];
    const warnings = [];
    const suggestions = [];
    
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push('Workflow must have a nodes array');
      return { errors, warnings, suggestions, valid: false };
    }
    
    if (workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
      return { errors, warnings, suggestions, valid: false };
    }
    
    // Valider chaque nœud
    workflow.nodes.forEach((node, index) => {
      const validation = this.validateNode(node);
      
      if (!validation.valid) {
        errors.push(`Node ${index + 1} (${node.name || 'unnamed'}): ${validation.error}`);
        if (validation.suggestion) {
          suggestions.push(`Node ${index + 1}: Consider using ${validation.suggestion}`);
        }
      }
    });
    
    // Vérifier les connexions
    if (workflow.connections) {
      const connectionValidation = this.validateConnections(workflow.connections, workflow.nodes);
      errors.push(...connectionValidation.errors);
      warnings.push(...connectionValidation.warnings);
    }
    
    // Vérifier qu'il y a au moins un déclencheur
    const hasTrigger = workflow.nodes.some(node => 
      Object.keys(this.VALIDATED_NODES.triggers).includes(node.type)
    );
    
    if (!hasTrigger) {
      warnings.push('Workflow should have at least one trigger node');
      suggestions.push('Consider adding a Schedule Trigger or Webhook Trigger');
    }
    
    return {
      errors,
      warnings,
      suggestions,
      valid: errors.length === 0
    };
  }
  
  // Valider les connexions
  static validateConnections(connections, nodes) {
    const errors = [];
    const warnings = [];
    const nodeNames = nodes.map(node => node.name);
    
    Object.entries(connections).forEach(([fromNode, nodeConnections]) => {
      if (!nodeNames.includes(fromNode)) {
        errors.push(`Connection from unknown node: ${fromNode}`);
        return;
      }
      
      // Parcourir tous les types de connexions (main, ai_languageModel, ai_tool, ai_memory, etc.)
      Object.keys(nodeConnections).forEach(connectionType => {
        const connectionArray = nodeConnections[connectionType];
        
        if (!Array.isArray(connectionArray)) {
          warnings.push(`Connection type ${connectionType} from ${fromNode} is not an array`);
          return;
        }
        
        connectionArray.forEach(connection => {
          // Gérer le cas où connection est un tableau (format standard n8n)
          if (Array.isArray(connection)) {
            connection.forEach(conn => {
              if (conn && typeof conn === 'object' && conn.node) {
                if (!nodeNames.includes(conn.node)) {
                  errors.push(`Connection to unknown node: ${conn.node}`);
                }
              }
            });
          } 
          // Gérer le cas où connection est un objet (format simplifié)
          else if (connection && typeof connection === 'object' && connection.node) {
            if (!nodeNames.includes(connection.node)) {
              errors.push(`Connection to unknown node: ${connection.node}`);
            }
          }
        });
      });
    });
    
    return { errors, warnings };
  }
  
  // Corriger un workflow
  static fixWorkflow(workflow) {
    console.log('🔧 [NodeValidator] Correction du workflow...');
    
    const fixedWorkflow = { ...workflow };
    
    // Corriger les nœuds invalides
    fixedWorkflow.nodes = workflow.nodes.map(node => {
      const validation = this.validateNode(node);
      
      if (!validation.valid) {
        console.log(`🔧 [NodeValidator] Correction du nœud: ${node.type} -> ${validation.suggestion}`);
        
        const alternative = validation.suggestion.split(' + ')[0]; // Prendre la première alternative
        return {
          ...node,
          type: alternative,
          parameters: this.getNodeDefinition(alternative)?.parameters || {}
        };
      }
      
      return node;
    });
    
    // Corriger les connexions
    fixedWorkflow.connections = this.fixConnections(fixedWorkflow.connections, fixedWorkflow.nodes);
    
    console.log('✅ [NodeValidator] Workflow corrigé');
    return fixedWorkflow;
  }
  
  // Corriger les connexions
  static fixConnections(connections, nodes) {
    const nodeNames = nodes.map(node => node.name);
    const fixedConnections = {};
    
    Object.entries(connections || {}).forEach(([fromNode, nodeConnections]) => {
      if (nodeNames.includes(fromNode)) {
        fixedConnections[fromNode] = nodeConnections;
      }
    });
    
    return fixedConnections;
  }
}

module.exports = N8nNodeValidator;
