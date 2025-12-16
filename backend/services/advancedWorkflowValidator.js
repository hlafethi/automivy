// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCED WORKFLOW VALIDATOR - Validation et correction automatique des workflows
// ═══════════════════════════════════════════════════════════════════════════════
// Ce service valide et corrige automatiquement les workflows n8n générés par l'IA
// ═══════════════════════════════════════════════════════════════════════════════

const N8nNodesDatabase = require('./n8nNodesDatabase');

class AdvancedWorkflowValidator {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN VALIDATION - Point d'entrée principal
  // ═══════════════════════════════════════════════════════════════════════════
  
  static validateAndFix(workflow) {
    console.log('🔍 [AdvancedValidator] Début de la validation...');
    
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      fixes: [],
      originalWorkflow: JSON.parse(JSON.stringify(workflow)),
      fixedWorkflow: null
    };
    
    try {
      // Créer une copie pour les corrections
      let fixedWorkflow = JSON.parse(JSON.stringify(workflow));
      
      // 1. Valider et corriger la structure de base
      const structureResult = this.validateAndFixStructure(fixedWorkflow);
      result.errors.push(...structureResult.errors);
      result.fixes.push(...structureResult.fixes);
      fixedWorkflow = structureResult.workflow;
      
      // 2. Valider et corriger les nœuds
      const nodesResult = this.validateAndFixNodes(fixedWorkflow);
      result.errors.push(...nodesResult.errors);
      result.warnings.push(...nodesResult.warnings);
      result.fixes.push(...nodesResult.fixes);
      fixedWorkflow = nodesResult.workflow;
      
      // 3. Valider et corriger les connexions
      const connectionsResult = this.validateAndFixConnections(fixedWorkflow);
      result.errors.push(...connectionsResult.errors);
      result.warnings.push(...connectionsResult.warnings);
      result.fixes.push(...connectionsResult.fixes);
      fixedWorkflow = connectionsResult.workflow;
      
      // 4. Valider et corriger les credentials
      const credentialsResult = this.validateAndFixCredentials(fixedWorkflow);
      result.errors.push(...credentialsResult.errors);
      result.fixes.push(...credentialsResult.fixes);
      fixedWorkflow = credentialsResult.workflow;
      
      // 5. Vérifier la cohérence globale
      const coherenceResult = this.checkWorkflowCoherence(fixedWorkflow);
      result.warnings.push(...coherenceResult.warnings);
      
      result.fixedWorkflow = fixedWorkflow;
      result.valid = result.errors.filter(e => !e.fixed).length === 0;
      
      console.log(`✅ [AdvancedValidator] Validation terminée: ${result.valid ? 'VALIDE' : 'INVALIDE'}`);
      console.log(`   - Erreurs: ${result.errors.length}`);
      console.log(`   - Warnings: ${result.warnings.length}`);
      console.log(`   - Corrections: ${result.fixes.length}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ [AdvancedValidator] Erreur lors de la validation:', error);
      result.valid = false;
      result.errors.push({ type: 'critical', message: error.message });
      return result;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTURE VALIDATION - Validation de la structure de base
  // ═══════════════════════════════════════════════════════════════════════════
  
  static validateAndFixStructure(workflow) {
    const errors = [];
    const fixes = [];
    
    // Vérifier/corriger le nom
    if (!workflow.name || typeof workflow.name !== 'string' || workflow.name.trim() === '') {
      workflow.name = 'AI Generated Workflow';
      fixes.push({ type: 'name', message: 'Nom du workflow ajouté' });
    } else if (workflow.name.length > 100) {
      workflow.name = workflow.name.substring(0, 100);
      fixes.push({ type: 'name', message: 'Nom du workflow tronqué à 100 caractères' });
    }
    
    // Vérifier/corriger nodes
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      workflow.nodes = [];
      errors.push({ type: 'structure', message: 'Array nodes manquant' });
    }
    
    // Vérifier/corriger connections
    if (!workflow.connections || typeof workflow.connections !== 'object') {
      workflow.connections = {};
      fixes.push({ type: 'connections', message: 'Objet connections créé' });
    }
    
    // Vérifier/corriger settings
    if (!workflow.settings || typeof workflow.settings !== 'object') {
      workflow.settings = {};
      fixes.push({ type: 'settings', message: 'Objet settings créé' });
    }
    
    // Vérifier/corriger active
    if (typeof workflow.active !== 'boolean') {
      workflow.active = false;
      fixes.push({ type: 'active', message: 'Champ active défini à false' });
    }
    
    // Vérifier/corriger versionId
    if (!workflow.versionId) {
      workflow.versionId = '1';
      fixes.push({ type: 'versionId', message: 'versionId ajouté' });
    }
    
    return { workflow, errors, fixes };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NODES VALIDATION - Validation et correction des nœuds
  // ═══════════════════════════════════════════════════════════════════════════
  
  static validateAndFixNodes(workflow) {
    const errors = [];
    const warnings = [];
    const fixes = [];
    
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push({ type: 'nodes', message: 'Aucun nœud dans le workflow' });
      return { workflow, errors, warnings, fixes };
    }
    
    const usedIds = new Set();
    const usedNames = new Set();
    
    workflow.nodes = workflow.nodes.map((node, index) => {
      const nodeResult = this.validateAndFixNode(node, index, usedIds, usedNames);
      errors.push(...nodeResult.errors);
      warnings.push(...nodeResult.warnings);
      fixes.push(...nodeResult.fixes);
      return nodeResult.node;
    });
    
    // Vérifier qu'il y a au moins un trigger
    const hasTrigger = workflow.nodes.some(node => this.isTriggerNode(node.type));
    if (!hasTrigger) {
      warnings.push({ type: 'trigger', message: 'Aucun nœud trigger détecté' });
    }
    
    return { workflow, errors, warnings, fixes };
  }
  
  static validateAndFixNode(node, index, usedIds, usedNames) {
    const errors = [];
    const warnings = [];
    const fixes = [];
    
    // 1. Valider/corriger l'ID
    if (!node.id || typeof node.id !== 'string' || node.id.trim() === '') {
      node.id = this.generateUniqueId(node.name || `node-${index}`, usedIds);
      fixes.push({ type: 'nodeId', node: node.name, message: `ID généré: ${node.id}` });
    } else if (usedIds.has(node.id)) {
      const oldId = node.id;
      node.id = this.generateUniqueId(node.id, usedIds);
      fixes.push({ type: 'nodeId', node: node.name, message: `ID dupliqué corrigé: ${oldId} → ${node.id}` });
    }
    usedIds.add(node.id);
    
    // 2. Valider/corriger le nom
    if (!node.name || typeof node.name !== 'string' || node.name.trim() === '') {
      node.name = `Node ${index + 1}`;
      fixes.push({ type: 'nodeName', message: `Nom généré: ${node.name}` });
    } else if (usedNames.has(node.name)) {
      const oldName = node.name;
      node.name = `${node.name} ${index + 1}`;
      fixes.push({ type: 'nodeName', message: `Nom dupliqué corrigé: ${oldName} → ${node.name}` });
    }
    usedNames.add(node.name);
    
    // 3. Valider/corriger le type
    if (!node.type || typeof node.type !== 'string') {
      errors.push({ type: 'nodeType', node: node.name, message: 'Type de nœud manquant' });
    } else {
      // Corriger les erreurs de typo communes
      node.type = this.fixNodeType(node.type);
    }
    
    // 4. Valider/corriger typeVersion
    if (typeof node.typeVersion !== 'number' || isNaN(node.typeVersion)) {
      const nodeDb = N8nNodesDatabase.getNode(node.type);
      node.typeVersion = nodeDb?.typeVersion || 1;
      fixes.push({ type: 'typeVersion', node: node.name, message: `typeVersion défini à ${node.typeVersion}` });
    }
    
    // 5. Valider/corriger position
    if (!Array.isArray(node.position) || node.position.length !== 2 ||
        typeof node.position[0] !== 'number' || typeof node.position[1] !== 'number' ||
        isNaN(node.position[0]) || isNaN(node.position[1])) {
      node.position = [250 + (index * 250), 300];
      fixes.push({ type: 'position', node: node.name, message: `Position définie à [${node.position}]` });
    }
    
    // 6. Valider/corriger parameters
    if (!node.parameters || typeof node.parameters !== 'object') {
      const nodeDb = N8nNodesDatabase.getNode(node.type);
      node.parameters = nodeDb?.defaultParameters || {};
      fixes.push({ type: 'parameters', node: node.name, message: 'Paramètres par défaut appliqués' });
    } else {
      // Vérifier les paramètres requis
      const paramResult = this.validateAndFixParameters(node);
      warnings.push(...paramResult.warnings);
      fixes.push(...paramResult.fixes);
      node.parameters = paramResult.parameters;
    }
    
    return { node, errors, warnings, fixes };
  }
  
  static validateAndFixParameters(node) {
    const warnings = [];
    const fixes = [];
    let parameters = node.parameters;
    
    const nodeDb = N8nNodesDatabase.getNode(node.type);
    if (!nodeDb) {
      return { parameters, warnings, fixes };
    }
    
    // Ajouter les paramètres requis manquants
    (nodeDb.requiredParameters || []).forEach(param => {
      if (!(param in parameters) || parameters[param] === undefined || parameters[param] === null || parameters[param] === '') {
        if (nodeDb.defaultParameters && param in nodeDb.defaultParameters) {
          parameters[param] = nodeDb.defaultParameters[param];
          fixes.push({ type: 'parameter', node: node.name, message: `Paramètre ${param} ajouté avec valeur par défaut` });
        } else {
          warnings.push({ type: 'parameter', node: node.name, message: `Paramètre requis manquant: ${param}` });
        }
      }
    });
    
    // Nettoyer les valeurs vides ou invalides
    parameters = this.cleanParameters(parameters);
    
    return { parameters, warnings, fixes };
  }
  
  static cleanParameters(params) {
    if (typeof params !== 'object' || params === null) {
      return {};
    }
    
    const cleaned = {};
    
    Object.entries(params).forEach(([key, value]) => {
      // Ignorer les valeurs undefined ou null
      if (value === undefined || value === null) {
        return;
      }
      
      // Nettoyer récursivement les objets
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedObj = this.cleanParameters(value);
        if (Object.keys(cleanedObj).length > 0) {
          cleaned[key] = cleanedObj;
        }
      }
      // Nettoyer les arrays
      else if (Array.isArray(value)) {
        const cleanedArray = value.filter(v => v !== undefined && v !== null);
        if (cleanedArray.length > 0) {
          cleaned[key] = cleanedArray;
        }
      }
      // Garder les valeurs valides
      else {
        cleaned[key] = value;
      }
    });
    
    return cleaned;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTIONS VALIDATION - Validation et correction des connexions
  // ═══════════════════════════════════════════════════════════════════════════
  
  static validateAndFixConnections(workflow) {
    const errors = [];
    const warnings = [];
    const fixes = [];
    
    if (!workflow.connections || typeof workflow.connections !== 'object') {
      workflow.connections = {};
      fixes.push({ type: 'connections', message: 'Objet connections créé' });
      return { workflow, errors, warnings, fixes };
    }
    
    const nodeNames = new Set(workflow.nodes.map(n => n.name));
    const fixedConnections = {};
    
    Object.entries(workflow.connections).forEach(([fromNode, nodeConnections]) => {
      // Vérifier que le nœud source existe
      if (!nodeNames.has(fromNode)) {
        warnings.push({ type: 'connection', message: `Connexion depuis nœud inconnu: ${fromNode}` });
        return;
      }
      
      fixedConnections[fromNode] = {};
      
      Object.entries(nodeConnections).forEach(([connectionType, connections]) => {
        const fixedType = this.normalizeConnectionType(connectionType);
        const fixedConns = this.fixConnectionStructure(connections, nodeNames, fromNode, fixedType, fixes, warnings);
        
        if (fixedConns.length > 0) {
          fixedConnections[fromNode][fixedType] = fixedConns;
        }
      });
      
      // Supprimer les nœuds sans connexions
      if (Object.keys(fixedConnections[fromNode]).length === 0) {
        delete fixedConnections[fromNode];
      }
    });
    
    // Ajouter les nœuds AI manquants et leurs connexions
    const aiFixResult = this.addMissingAIConnections(workflow.nodes, fixedConnections, nodeNames);
    fixes.push(...aiFixResult.fixes);
    
    // Mettre à jour les nodes si des nœuds AI ont été ajoutés
    if (aiFixResult.nodes) {
      workflow.nodes = aiFixResult.nodes;
    }
    
    workflow.connections = aiFixResult.connections;
    
    return { workflow, errors, warnings, fixes };
  }
  
  static normalizeConnectionType(type) {
    const typeMap = {
      'next': 'main',
      'output': 'main',
      'ai_language_model': 'ai_languageModel',
      'ai_model': 'ai_languageModel',
      'language_model': 'ai_languageModel',
      'ai_tools': 'ai_tool',
      'tools': 'ai_tool',
      'ai_mem': 'ai_memory',
      'memory': 'ai_memory'
    };
    return typeMap[type.toLowerCase()] || type;
  }
  
  static fixConnectionStructure(connections, nodeNames, fromNode, connectionType, fixes, warnings) {
    if (!Array.isArray(connections)) {
      return [];
    }
    
    // Si c'est déjà le bon format [[{...}]], le garder
    if (connections.length > 0 && Array.isArray(connections[0])) {
      return connections.map(connArray => {
        if (!Array.isArray(connArray)) return [];
        return connArray.filter(conn => {
          if (!conn || typeof conn !== 'object' || !conn.node) return false;
          if (!nodeNames.has(conn.node)) {
            warnings.push({ type: 'connection', message: `Connexion vers nœud inconnu: ${conn.node}` });
            return false;
          }
          return true;
        }).map(conn => ({
          node: conn.node,
          type: conn.type || connectionType,
          index: typeof conn.index === 'number' ? conn.index : 0
        }));
      }).filter(arr => arr.length > 0);
    }
    
    // Si c'est le format [{...}], convertir en [[{...}]]
    if (connections.length > 0 && typeof connections[0] === 'object' && !Array.isArray(connections[0])) {
      const fixedConns = connections.filter(conn => {
        if (!conn || typeof conn !== 'object' || !conn.node) return false;
        if (!nodeNames.has(conn.node)) {
          warnings.push({ type: 'connection', message: `Connexion vers nœud inconnu: ${conn.node}` });
          return false;
        }
        return true;
      }).map(conn => ({
        node: conn.node,
        type: conn.type || connectionType,
        index: typeof conn.index === 'number' ? conn.index : 0
      }));
      
      if (fixedConns.length > 0) {
        fixes.push({ type: 'connectionStructure', from: fromNode, message: 'Structure de connexion corrigée: [{...}] → [[{...}]]' });
        return [fixedConns];
      }
    }
    
    return [];
  }
  
  static addMissingAIConnections(nodes, connections, nodeNames) {
    const fixes = [];
    
    // Trouver les nœuds AI
    const aiAgentNode = nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.agent');
    let openRouterNode = nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter');
    let calculatorNode = nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.toolCalculator');
    let memoryNode = nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow');
    
    if (!aiAgentNode) {
      return { connections, fixes, nodes };
    }
    
    const aiAgentName = aiAgentNode.name;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // AJOUT DES NŒUDS AI MANQUANTS (CRITIQUE)
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Si pas de LLM, en ajouter un (OBLIGATOIRE pour que l'AI Agent fonctionne)
    if (!openRouterNode) {
      const newLLMNode = {
        id: 'openrouter-chat-model',
        name: 'OpenRouter Chat Model',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        typeVersion: 1,
        position: [aiAgentNode.position[0], aiAgentNode.position[1] + 200],
        parameters: {
          model: 'meta-llama/llama-3.1-8b-instruct',
          temperature: 0.3,
          maxTokens: 4000
        },
        credentials: {
          openRouterApi: {
            id: 'ADMIN_OPENROUTER_CREDENTIAL_ID',
            name: 'ADMIN_OPENROUTER_CREDENTIAL_NAME'
          }
        }
      };
      nodes.push(newLLMNode);
      openRouterNode = newLLMNode;
      nodeNames.add(newLLMNode.name);
      fixes.push({ type: 'aiNodeAdded', message: `Nœud OpenRouter Chat Model ajouté (OBLIGATOIRE pour AI Agent)` });
    }
    
    // Si pas de Calculator, en ajouter un
    if (!calculatorNode) {
      const newCalculatorNode = {
        id: 'calculator-tool',
        name: 'Calculator Tool',
        type: '@n8n/n8n-nodes-langchain.toolCalculator',
        typeVersion: 1,
        position: [aiAgentNode.position[0], aiAgentNode.position[1] + 350],
        parameters: {}
      };
      nodes.push(newCalculatorNode);
      calculatorNode = newCalculatorNode;
      nodeNames.add(newCalculatorNode.name);
      fixes.push({ type: 'aiNodeAdded', message: `Nœud Calculator Tool ajouté` });
    }
    
    // Si pas de Memory, en ajouter un
    if (!memoryNode) {
      const newMemoryNode = {
        id: 'buffer-window-memory',
        name: 'Buffer Window Memory',
        type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        typeVersion: 1.2,
        position: [aiAgentNode.position[0], aiAgentNode.position[1] + 500],
        parameters: {
          sessionId: '={{ $json.sessionId || "default" }}',
          contextWindowLength: 10
        }
      };
      nodes.push(newMemoryNode);
      memoryNode = newMemoryNode;
      nodeNames.add(newMemoryNode.name);
      fixes.push({ type: 'aiNodeAdded', message: `Nœud Buffer Window Memory ajouté` });
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // AJOUT DES CONNEXIONS AI
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Ajouter connexion OpenRouter → AI Agent
    if (openRouterNode) {
      const openRouterName = openRouterNode.name;
      if (!connections[openRouterName]?.ai_languageModel) {
        if (!connections[openRouterName]) connections[openRouterName] = {};
        connections[openRouterName].ai_languageModel = [[{ node: aiAgentName, type: 'ai_languageModel', index: 0 }]];
        fixes.push({ type: 'aiConnection', message: `Connexion ${openRouterName} → ${aiAgentName} (ai_languageModel) ajoutée` });
      }
    }
    
    // Ajouter connexion Calculator → AI Agent
    if (calculatorNode) {
      const calculatorName = calculatorNode.name;
      if (!connections[calculatorName]?.ai_tool) {
        if (!connections[calculatorName]) connections[calculatorName] = {};
        connections[calculatorName].ai_tool = [[{ node: aiAgentName, type: 'ai_tool', index: 0 }]];
        fixes.push({ type: 'aiConnection', message: `Connexion ${calculatorName} → ${aiAgentName} (ai_tool) ajoutée` });
      }
    }
    
    // Ajouter connexion Memory → AI Agent
    if (memoryNode) {
      const memoryName = memoryNode.name;
      if (!connections[memoryName]?.ai_memory) {
        if (!connections[memoryName]) connections[memoryName] = {};
        connections[memoryName].ai_memory = [[{ node: aiAgentName, type: 'ai_memory', index: 0 }]];
        fixes.push({ type: 'aiConnection', message: `Connexion ${memoryName} → ${aiAgentName} (ai_memory) ajoutée` });
      }
    }
    
    // Supprimer les connexions AI incorrectes depuis l'AI Agent
    if (connections[aiAgentName]) {
      ['ai_languageModel', 'ai_tool', 'ai_memory'].forEach(type => {
        if (connections[aiAgentName][type]) {
          delete connections[aiAgentName][type];
          fixes.push({ type: 'aiConnection', message: `Connexion ${type} incorrecte supprimée de ${aiAgentName}` });
        }
      });
    }
    
    return { connections, fixes, nodes };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREDENTIALS VALIDATION - Validation et correction des credentials
  // ═══════════════════════════════════════════════════════════════════════════
  
  static validateAndFixCredentials(workflow) {
    const errors = [];
    const fixes = [];
    
    workflow.nodes = workflow.nodes.map(node => {
      const credResult = this.validateAndFixNodeCredentials(node);
      errors.push(...credResult.errors);
      fixes.push(...credResult.fixes);
      return credResult.node;
    });
    
    return { workflow, errors, fixes };
  }
  
  static validateAndFixNodeCredentials(node) {
    const errors = [];
    const fixes = [];
    
    const nodeDb = N8nNodesDatabase.getNode(node.type);
    if (!nodeDb || !nodeDb.credentials) {
      return { node, errors, fixes };
    }
    
    // Vérifier si credentials existe et est un objet
    if (!node.credentials || typeof node.credentials !== 'object') {
      node.credentials = {};
    }
    
    // Corriger les credentials string en objets
    Object.entries(node.credentials).forEach(([credType, credValue]) => {
      if (typeof credValue === 'string') {
        const placeholder = nodeDb.credentialPlaceholder?.[credType] || {
          id: credValue || `USER_${credType.toUpperCase()}_ID`,
          name: `USER_${credType.toUpperCase()}_NAME`
        };
        node.credentials[credType] = placeholder;
        fixes.push({ type: 'credential', node: node.name, message: `Credential ${credType} converti en objet` });
      } else if (typeof credValue === 'object' && credValue !== null) {
        // S'assurer que id et name sont présents
        if (!credValue.id) {
          credValue.id = `USER_${credType.toUpperCase()}_ID`;
          fixes.push({ type: 'credential', node: node.name, message: `ID credential ${credType} ajouté` });
        }
        if (!credValue.name) {
          credValue.name = `USER_${credType.toUpperCase()}_NAME`;
          fixes.push({ type: 'credential', node: node.name, message: `Nom credential ${credType} ajouté` });
        }
      }
    });
    
    // Ajouter les credentials manquants
    (nodeDb.credentials || []).forEach(credType => {
      if (!node.credentials[credType]) {
        const placeholder = nodeDb.credentialPlaceholder?.[credType] || {
          id: `USER_${credType.toUpperCase()}_ID`,
          name: `USER_${credType.toUpperCase()}_NAME`
        };
        node.credentials[credType] = placeholder;
        fixes.push({ type: 'credential', node: node.name, message: `Credential ${credType} ajouté` });
      }
    });
    
    return { node, errors, fixes };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COHERENCE CHECK - Vérification de la cohérence globale
  // ═══════════════════════════════════════════════════════════════════════════
  
  static checkWorkflowCoherence(workflow) {
    const warnings = [];
    
    // Vérifier les nœuds non connectés
    const connectedNodes = new Set();
    Object.entries(workflow.connections).forEach(([fromNode, nodeConnections]) => {
      connectedNodes.add(fromNode);
      Object.values(nodeConnections).forEach(connections => {
        connections.forEach(connArray => {
          connArray.forEach(conn => {
            if (conn.node) connectedNodes.add(conn.node);
          });
        });
      });
    });
    
    workflow.nodes.forEach(node => {
      if (!connectedNodes.has(node.name) && !this.isTriggerNode(node.type) && !this.isAISubNode(node.type)) {
        warnings.push({ type: 'orphan', node: node.name, message: `Nœud non connecté: ${node.name}` });
      }
    });
    
    // Vérifier les cycles (basique)
    // TODO: Implémentation complète de la détection de cycles
    
    return { warnings };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS - Méthodes utilitaires
  // ═══════════════════════════════════════════════════════════════════════════
  
  static generateUniqueId(baseName, usedIds) {
    let id = baseName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!usedIds.has(id)) return id;
    
    let counter = 1;
    while (usedIds.has(`${id}-${counter}`)) {
      counter++;
    }
    return `${id}-${counter}`;
  }
  
  static fixNodeType(type) {
    // Corriger les erreurs de typo communes
    const typeCorrections = {
      'nn-nodes-base': 'n8n-nodes-base',
      'n8n-nodes-imap': 'n8n-nodes-base',
      '@n8n/n8n-nodes-langchain.lmChatOpenRouter': '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
      'n8n-nodes-base.emailImap': 'n8n-nodes-base.emailReadImap',
      'n8n-nodes-base.imap': 'n8n-nodes-base.emailReadImap'
    };
    
    // Appliquer les corrections connues
    for (const [wrong, correct] of Object.entries(typeCorrections)) {
      if (type.includes(wrong)) {
        type = type.replace(wrong, correct);
      }
    }
    
    return type;
  }
  
  static isTriggerNode(type) {
    const triggerTypes = [
      'n8n-nodes-base.webhook',
      'n8n-nodes-base.schedule',
      'n8n-nodes-base.scheduleTrigger',
      'n8n-nodes-base.manualTrigger',
      'n8n-nodes-base.emailTrigger'
    ];
    return triggerTypes.some(t => type.includes(t));
  }
  
  static isAISubNode(type) {
    const aiSubNodes = [
      '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
      '@n8n/n8n-nodes-langchain.toolCalculator',
      '@n8n/n8n-nodes-langchain.toolCode',
      '@n8n/n8n-nodes-langchain.memoryBufferWindow'
    ];
    return aiSubNodes.some(t => type === t);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JSON REPAIR - Réparation du JSON malformé
  // ═══════════════════════════════════════════════════════════════════════════
  
  static repairJSON(jsonString) {
    console.log('🔧 [JSONRepair] Tentative de réparation du JSON...');
    
    let repaired = jsonString;
    const repairs = [];
    
    // 1. Supprimer le markdown
    if (repaired.includes('```')) {
      repaired = repaired.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      repairs.push('Markdown supprimé');
    }
    
    // 2. Trouver le JSON valide
    const firstBrace = repaired.indexOf('{');
    const lastBrace = repaired.lastIndexOf('}');
    if (firstBrace > 0 || lastBrace < repaired.length - 1) {
      repaired = repaired.substring(firstBrace, lastBrace + 1);
      repairs.push('Texte extra supprimé');
    }
    
    // 3. Corriger les virgules trailing
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    if (jsonString !== repaired) repairs.push('Virgules trailing corrigées');
    
    // 4. Corriger les valeurs vides
    repaired = repaired.replace(/:\s*,/g, ': null,');
    repaired = repaired.replace(/:\s*}/g, ': null}');
    repaired = repaired.replace(/:\s*]/g, ': null]');
    if (jsonString !== repaired) repairs.push('Valeurs vides corrigées');
    
    // 5. Corriger les arrays vides malformés
    repaired = repaired.replace(/\[\s*,\s*\]/g, '[]');
    repaired = repaired.replace(/\[\s*,/g, '[');
    repaired = repaired.replace(/,\s*\]/g, ']');
    
    // 6. Corriger les nombres invalides
    repaired = repaired.replace(/"typeVersion":\s*,/g, '"typeVersion": 1,');
    repaired = repaired.replace(/"typeVersion":\s*}/g, '"typeVersion": 1}');
    repaired = repaired.replace(/"temperature":\s*\./g, '"temperature": 0.');
    repaired = repaired.replace(/"position":\s*\[\s*,\s*\]/g, '"position": [250, 300]');
    
    // 7. Corriger les doubles virgules
    repaired = repaired.replace(/,,+/g, ',');
    
    console.log(`✅ [JSONRepair] Réparations effectuées: ${repairs.join(', ') || 'Aucune'}`);
    
    return { repaired, repairs };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARSE & VALIDATE - Parse et valide le JSON
  // ═══════════════════════════════════════════════════════════════════════════
  
  static parseAndValidate(jsonString) {
    // Essayer de parser directement
    try {
      const workflow = JSON.parse(jsonString);
      return this.validateAndFix(workflow);
    } catch (parseError) {
      console.log('⚠️ [AdvancedValidator] Erreur de parsing, tentative de réparation...');
      
      // Tenter de réparer le JSON
      const { repaired, repairs } = this.repairJSON(jsonString);
      
      try {
        const workflow = JSON.parse(repaired);
        const result = this.validateAndFix(workflow);
        result.jsonRepairs = repairs;
        return result;
      } catch (repairError) {
        console.error('❌ [AdvancedValidator] Impossible de réparer le JSON:', repairError.message);
        return {
          valid: false,
          errors: [{ type: 'json', message: `JSON invalide: ${repairError.message}` }],
          warnings: [],
          fixes: [],
          jsonRepairs: repairs,
          originalJson: jsonString
        };
      }
    }
  }
}

module.exports = AdvancedWorkflowValidator;

