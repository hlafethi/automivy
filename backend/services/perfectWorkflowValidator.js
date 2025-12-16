/**
 * Validateur de workflow PARFAIT et ultra-strict
 * 
 * Ce validateur vérifie CHAQUE aspect d'un workflow n8n :
 * 1. Structure JSON valide
 * 2. Présence de tous les champs obligatoires
 * 3. Types de nœuds valides
 * 4. Versions de nœuds correctes
 * 5. Paramètres requis présents
 * 6. Connexions valides et complètes
 * 7. Chaîne de flux complète (trigger → output)
 * 8. Credentials correctement formatés
 * 9. Positions des nœuds valides
 * 10. IDs uniques pour chaque nœud
 */

const PerfectN8nNodesRegistry = require('./perfectN8nNodesRegistry');

class PerfectWorkflowValidator {
  
  /**
   * Valide un workflow complet et retourne un rapport détaillé
   * @param {Object} workflow - Le workflow à valider
   * @returns {Object} Rapport de validation
   */
  static validate(workflow) {
    console.log('🔍 [PerfectValidator] Validation du workflow...');
    
    const report = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      fixes: [], // Corrections auto-appliquées
      stats: {
        totalNodes: 0,
        validNodes: 0,
        invalidNodes: 0,
        connections: 0,
        hasTrigger: false,
        hasOutput: false
      }
    };
    
    // 1. Vérification de la structure de base
    this.validateStructure(workflow, report);
    if (report.errors.length > 0) {
      report.valid = false;
      return report;
    }
    
    // 2. Vérification des métadonnées du workflow
    this.validateMetadata(workflow, report);
    
    // 3. Vérification de chaque nœud
    this.validateNodes(workflow, report);
    
    // 4. Vérification des connexions
    this.validateConnections(workflow, report);
    
    // 5. Vérification de la chaîne de flux
    this.validateFlowChain(workflow, report);
    
    // 6. Vérification des credentials
    this.validateCredentials(workflow, report);
    
    // 7. Vérification des positions
    this.validatePositions(workflow, report);
    
    // 8. Vérification des IDs
    this.validateNodeIds(workflow, report);
    
    // Déterminer si le workflow est valide
    report.valid = report.errors.length === 0;
    
    console.log(`✅ [PerfectValidator] Validation terminée: ${report.valid ? 'VALIDE' : 'INVALIDE'}`);
    console.log(`   - Erreurs: ${report.errors.length}`);
    console.log(`   - Warnings: ${report.warnings.length}`);
    console.log(`   - Suggestions: ${report.suggestions.length}`);
    
    return report;
  }
  
  /**
   * Vérifie la structure de base du workflow
   */
  static validateStructure(workflow, report) {
    if (!workflow || typeof workflow !== 'object') {
      report.errors.push('❌ STRUCTURE: Le workflow n\'est pas un objet valide');
      return;
    }
    
    const requiredFields = ['name', 'nodes', 'connections'];
    for (const field of requiredFields) {
      if (!(field in workflow)) {
        report.errors.push(`❌ STRUCTURE: Champ obligatoire manquant: "${field}"`);
      }
    }
    
    if (!Array.isArray(workflow.nodes)) {
      report.errors.push('❌ STRUCTURE: "nodes" doit être un tableau');
    } else if (workflow.nodes.length === 0) {
      report.errors.push('❌ STRUCTURE: Le workflow doit contenir au moins un nœud');
    }
    
    if (typeof workflow.connections !== 'object' || workflow.connections === null) {
      report.errors.push('❌ STRUCTURE: "connections" doit être un objet');
    }
    
    // Champs recommandés
    if (!('settings' in workflow)) {
      report.warnings.push('⚠️ STRUCTURE: Champ "settings" manquant (recommandé: {})');
    }
    
    if (!('active' in workflow)) {
      report.warnings.push('⚠️ STRUCTURE: Champ "active" manquant (recommandé: false)');
    }
  }
  
  /**
   * Vérifie les métadonnées du workflow
   */
  static validateMetadata(workflow, report) {
    // Nom du workflow
    if (!workflow.name || typeof workflow.name !== 'string') {
      report.errors.push('❌ METADATA: Le nom du workflow est manquant ou invalide');
    } else if (workflow.name.length > 100) {
      report.warnings.push('⚠️ METADATA: Le nom du workflow est trop long (max 100 caractères)');
    } else if (workflow.name.length < 3) {
      report.warnings.push('⚠️ METADATA: Le nom du workflow est trop court (min 3 caractères)');
    }
    
    // Vérifier que le nom n'est pas le prompt ou les instructions
    const badPatterns = ['You are', 'Generate', 'Create a workflow', 'Crée un workflow'];
    for (const pattern of badPatterns) {
      if (workflow.name?.includes(pattern)) {
        report.errors.push(`❌ METADATA: Le nom du workflow contient les instructions IA ("${pattern}...")`);
      }
    }
  }
  
  /**
   * Vérifie chaque nœud du workflow
   */
  static validateNodes(workflow, report) {
    report.stats.totalNodes = workflow.nodes.length;
    
    for (let index = 0; index < workflow.nodes.length; index++) {
      const node = workflow.nodes[index];
      const nodePrefix = `Nœud ${index + 1} (${node.name || 'sans nom'})`;
      
      // Champs obligatoires du nœud
      const requiredNodeFields = ['id', 'name', 'type', 'typeVersion', 'position', 'parameters'];
      for (const field of requiredNodeFields) {
        if (!(field in node)) {
          report.errors.push(`❌ NODE: ${nodePrefix} - Champ obligatoire manquant: "${field}"`);
        }
      }
      
      // Vérifier le type du nœud
      if (node.type) {
        if (!PerfectN8nNodesRegistry.nodeExists(node.type)) {
          const suggestion = PerfectN8nNodesRegistry.findClosestMatch(node.type);
          if (suggestion) {
            report.errors.push(`❌ NODE: ${nodePrefix} - Type invalide "${node.type}". Suggestion: "${suggestion}"`);
            report.suggestions.push(`💡 Remplacer "${node.type}" par "${suggestion}"`);
          } else {
            report.errors.push(`❌ NODE: ${nodePrefix} - Type inconnu "${node.type}"`);
          }
          report.stats.invalidNodes++;
        } else {
          report.stats.validNodes++;
          
          // Vérifier la version du nœud
          const expectedVersion = PerfectN8nNodesRegistry.getCorrectTypeVersion(node.type);
          if (node.typeVersion !== expectedVersion) {
            report.warnings.push(`⚠️ NODE: ${nodePrefix} - Version ${node.typeVersion}, attendue ${expectedVersion}`);
          }
          
          // Vérifier les paramètres requis
          const requiredParams = PerfectN8nNodesRegistry.getRequiredParameters(node.type);
          for (const param of requiredParams) {
            if (!(param in node.parameters) || node.parameters[param] === undefined) {
              report.errors.push(`❌ NODE: ${nodePrefix} - Paramètre requis manquant: "${param}"`);
            }
          }
          
          // Vérifier si c'est un trigger
          if (PerfectN8nNodesRegistry.isTriggerNode(node.type)) {
            report.stats.hasTrigger = true;
          }
        }
      }
      
      // Vérifier le nom du nœud
      if (!node.name || typeof node.name !== 'string' || node.name.trim() === '') {
        report.errors.push(`❌ NODE: ${nodePrefix} - Nom invalide ou vide`);
      }
      
      // Vérifier la position
      if (!Array.isArray(node.position) || node.position.length !== 2) {
        report.errors.push(`❌ NODE: ${nodePrefix} - Position invalide (doit être [x, y])`);
      } else {
        const [x, y] = node.position;
        if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
          report.errors.push(`❌ NODE: ${nodePrefix} - Coordonnées position invalides`);
        }
      }
      
      // Vérifier les paramètres (pas vides si requis)
      if (node.parameters && typeof node.parameters !== 'object') {
        report.errors.push(`❌ NODE: ${nodePrefix} - Parameters doit être un objet`);
      }
    }
    
    // Vérifier la présence d'un trigger
    if (!report.stats.hasTrigger) {
      report.errors.push('❌ FLOW: Aucun nœud trigger trouvé (webhook, schedule, manualTrigger, etc.)');
      report.suggestions.push('💡 Ajouter un trigger: n8n-nodes-base.webhook ou n8n-nodes-base.schedule');
    }
  }
  
  /**
   * Vérifie les connexions du workflow
   */
  static validateConnections(workflow, report) {
    const nodeNames = new Set(workflow.nodes.map(n => n.name));
    const connectedFromNodes = new Set();
    const connectedToNodes = new Set();
    
    for (const [fromNode, connectionTypes] of Object.entries(workflow.connections)) {
      // Vérifier que le nœud source existe
      if (!nodeNames.has(fromNode)) {
        report.errors.push(`❌ CONNEXION: Connexion depuis un nœud inexistant: "${fromNode}"`);
        continue;
      }
      
      connectedFromNodes.add(fromNode);
      
      // Vérifier chaque type de connexion
      for (const [connectionType, connections] of Object.entries(connectionTypes)) {
        // Valider le type de connexion
        const validConnectionTypes = ['main', 'ai_languageModel', 'ai_tool', 'ai_memory', 'ai_embedding', 'ai_outputParser'];
        if (!validConnectionTypes.includes(connectionType)) {
          report.warnings.push(`⚠️ CONNEXION: Type de connexion inhabituel: "${connectionType}" depuis "${fromNode}"`);
        }
        
        // Vérifier la structure [[{...}]]
        if (!Array.isArray(connections)) {
          report.errors.push(`❌ CONNEXION: "${fromNode}.${connectionType}" doit être un tableau`);
          continue;
        }
        
        for (let i = 0; i < connections.length; i++) {
          const connectionArray = connections[i];
          
          if (!Array.isArray(connectionArray)) {
            report.errors.push(`❌ CONNEXION: "${fromNode}.${connectionType}[${i}]" doit être un tableau (format: [[{...}]])`);
            continue;
          }
          
          for (const conn of connectionArray) {
            if (!conn || typeof conn !== 'object') {
              report.errors.push(`❌ CONNEXION: Connexion invalide depuis "${fromNode}"`);
              continue;
            }
            
            // Vérifier que le nœud cible existe
            if (!conn.node || !nodeNames.has(conn.node)) {
              report.errors.push(`❌ CONNEXION: Connexion vers un nœud inexistant: "${conn.node}" depuis "${fromNode}"`);
            } else {
              connectedToNodes.add(conn.node);
              report.stats.connections++;
            }
            
            // Vérifier le type de connexion
            if (conn.type && conn.type !== connectionType) {
              report.warnings.push(`⚠️ CONNEXION: Type incohérent dans "${fromNode}": "${conn.type}" vs "${connectionType}"`);
            }
          }
        }
      }
    }
    
    // Vérifier les nœuds orphelins (non connectés)
    for (const node of workflow.nodes) {
      const isTrigger = PerfectN8nNodesRegistry.isTriggerNode(node.type);
      const isAISubNode = PerfectN8nNodesRegistry.isAINode(node.type) && 
                          !['@n8n/n8n-nodes-langchain.agent', '@n8n/n8n-nodes-langchain.chainLlm'].includes(node.type);
      
      // Les triggers n'ont pas d'entrée
      if (!isTrigger && !isAISubNode && !connectedToNodes.has(node.name)) {
        report.warnings.push(`⚠️ ORPHELIN: Le nœud "${node.name}" n'a pas de connexion entrante`);
      }
      
      // Les nœuds de fin n'ont pas de sortie
      const isEndNode = ['n8n-nodes-base.respondToWebhook', 'n8n-nodes-base.stop'].includes(node.type);
      if (!isEndNode && !isAISubNode && !connectedFromNodes.has(node.name)) {
        report.warnings.push(`⚠️ ORPHELIN: Le nœud "${node.name}" n'a pas de connexion sortante`);
      }
    }
  }
  
  /**
   * Vérifie que la chaîne de flux est complète
   */
  static validateFlowChain(workflow, report) {
    // Trouver les triggers
    const triggers = workflow.nodes.filter(n => PerfectN8nNodesRegistry.isTriggerNode(n.type));
    
    if (triggers.length === 0) {
      // Déjà signalé dans validateNodes
      return;
    }
    
    // Vérifier que chaque trigger a une chaîne vers un output
    for (const trigger of triggers) {
      const reachableNodes = this.findReachableNodes(trigger.name, workflow.connections);
      
      if (reachableNodes.size <= 1) {
        report.errors.push(`❌ FLOW: Le trigger "${trigger.name}" n'est connecté à aucun autre nœud`);
      }
      
      // Vérifier qu'il y a au moins un nœud de traitement
      const hasProcessingNode = Array.from(reachableNodes).some(nodeName => {
        const node = workflow.nodes.find(n => n.name === nodeName);
        return node && !PerfectN8nNodesRegistry.isTriggerNode(node.type);
      });
      
      if (!hasProcessingNode) {
        report.warnings.push(`⚠️ FLOW: Le trigger "${trigger.name}" n'a pas de nœud de traitement`);
      }
    }
  }
  
  /**
   * Trouve tous les nœuds atteignables depuis un nœud source
   */
  static findReachableNodes(startNode, connections, visited = new Set()) {
    visited.add(startNode);
    
    const nodeConnections = connections[startNode];
    if (!nodeConnections) return visited;
    
    for (const connectionTypes of Object.values(nodeConnections)) {
      if (!Array.isArray(connectionTypes)) continue;
      
      for (const connectionArray of connectionTypes) {
        if (!Array.isArray(connectionArray)) continue;
        
        for (const conn of connectionArray) {
          if (conn?.node && !visited.has(conn.node)) {
            this.findReachableNodes(conn.node, connections, visited);
          }
        }
      }
    }
    
    return visited;
  }
  
  /**
   * Vérifie les credentials
   */
  static validateCredentials(workflow, report) {
    for (const node of workflow.nodes) {
      const requiredCreds = PerfectN8nNodesRegistry.getRequiredCredentials(node.type);
      
      if (requiredCreds && requiredCreds.length > 0) {
        if (!node.credentials || typeof node.credentials !== 'object') {
          report.errors.push(`❌ CREDENTIALS: "${node.name}" nécessite des credentials: ${requiredCreds.join(', ')}`);
          continue;
        }
        
        for (const credType of requiredCreds) {
          if (!(credType in node.credentials)) {
            report.errors.push(`❌ CREDENTIALS: "${node.name}" - credential manquant: "${credType}"`);
          } else {
            const credValue = node.credentials[credType];
            
            // Les credentials doivent être des objets avec id et name
            if (typeof credValue === 'string') {
              report.errors.push(`❌ CREDENTIALS: "${node.name}" - credential "${credType}" doit être un objet {id, name}, pas une string`);
              report.suggestions.push(`💡 Format correct: {"${credType}": {"id": "...", "name": "..."}}`);
            } else if (typeof credValue === 'object') {
              if (!credValue.id) {
                report.warnings.push(`⚠️ CREDENTIALS: "${node.name}" - credential "${credType}" n'a pas d'id`);
              }
              if (!credValue.name) {
                report.warnings.push(`⚠️ CREDENTIALS: "${node.name}" - credential "${credType}" n'a pas de name`);
              }
            }
          }
        }
      }
    }
  }
  
  /**
   * Vérifie les positions des nœuds
   */
  static validatePositions(workflow, report) {
    const positions = new Map();
    
    for (const node of workflow.nodes) {
      if (!Array.isArray(node.position) || node.position.length !== 2) continue;
      
      const [x, y] = node.position;
      const posKey = `${x},${y}`;
      
      if (positions.has(posKey)) {
        report.warnings.push(`⚠️ POSITION: "${node.name}" et "${positions.get(posKey)}" ont la même position [${x}, ${y}]`);
      } else {
        positions.set(posKey, node.name);
      }
      
      // Vérifier les positions négatives
      if (x < 0 || y < 0) {
        report.warnings.push(`⚠️ POSITION: "${node.name}" a une position négative [${x}, ${y}]`);
      }
    }
  }
  
  /**
   * Vérifie les IDs des nœuds
   */
  static validateNodeIds(workflow, report) {
    const ids = new Set();
    
    for (const node of workflow.nodes) {
      if (!node.id) {
        report.errors.push(`❌ ID: Le nœud "${node.name}" n'a pas d'ID`);
        continue;
      }
      
      if (ids.has(node.id)) {
        report.errors.push(`❌ ID: ID dupliqué "${node.id}" pour le nœud "${node.name}"`);
      } else {
        ids.add(node.id);
      }
      
      // Vérifier le format de l'ID
      if (typeof node.id !== 'string') {
        report.errors.push(`❌ ID: L'ID du nœud "${node.name}" doit être une string`);
      }
    }
  }
  
  /**
   * Corrige automatiquement les problèmes détectés
   * @param {Object} workflow - Le workflow à corriger
   * @returns {Object} Workflow corrigé + rapport de corrections
   */
  static autoFix(workflow) {
    console.log('🔧 [PerfectValidator] Auto-correction du workflow...');
    
    const fixes = [];
    const fixedWorkflow = JSON.parse(JSON.stringify(workflow)); // Deep clone
    
    // 1. Ajouter les champs manquants au workflow
    if (!fixedWorkflow.settings) {
      fixedWorkflow.settings = {};
      fixes.push('Ajout du champ "settings": {}');
    }
    
    if (!('active' in fixedWorkflow)) {
      fixedWorkflow.active = false;
      fixes.push('Ajout du champ "active": false');
    }
    
    if (!fixedWorkflow.versionId) {
      fixedWorkflow.versionId = '1';
      fixes.push('Ajout du champ "versionId": "1"');
    }
    
    // 2. Corriger chaque nœud
    for (let i = 0; i < fixedWorkflow.nodes.length; i++) {
      const node = fixedWorkflow.nodes[i];
      const nodeId = node.name || `node-${i}`;
      
      // Ajouter un ID si manquant
      if (!node.id) {
        node.id = nodeId.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        fixes.push(`Ajout ID "${node.id}" au nœud "${node.name}"`);
      }
      
      // Corriger le type de nœud invalide
      if (node.type && !PerfectN8nNodesRegistry.nodeExists(node.type)) {
        const suggestion = PerfectN8nNodesRegistry.findClosestMatch(node.type);
        if (suggestion) {
          fixes.push(`Type corrigé: "${node.type}" → "${suggestion}" pour "${node.name}"`);
          node.type = suggestion;
        }
      }
      
      // Corriger la typeVersion
      if (node.type && PerfectN8nNodesRegistry.nodeExists(node.type)) {
        const expectedVersion = PerfectN8nNodesRegistry.getCorrectTypeVersion(node.type);
        if (node.typeVersion !== expectedVersion) {
          fixes.push(`Version corrigée: ${node.typeVersion} → ${expectedVersion} pour "${node.name}"`);
          node.typeVersion = expectedVersion;
        }
        
        // Ajouter les paramètres par défaut si manquants
        const defaultParams = PerfectN8nNodesRegistry.getDefaultParameters(node.type);
        if (!node.parameters) {
          node.parameters = {};
        }
        
        const requiredParams = PerfectN8nNodesRegistry.getRequiredParameters(node.type);
        for (const param of requiredParams) {
          if (!(param in node.parameters) && param in defaultParams) {
            node.parameters[param] = defaultParams[param];
            fixes.push(`Paramètre "${param}" ajouté avec valeur par défaut pour "${node.name}"`);
          }
        }
      }
      
      // Corriger la position si invalide
      if (!Array.isArray(node.position) || node.position.length !== 2) {
        node.position = [250 + (i * 250), 300];
        fixes.push(`Position corrigée pour "${node.name}": [${node.position.join(', ')}]`);
      } else {
        const [x, y] = node.position;
        if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
          node.position = [250 + (i * 250), 300];
          fixes.push(`Position corrigée pour "${node.name}": [${node.position.join(', ')}]`);
        }
      }
      
      // Corriger les credentials (string → object)
      if (node.credentials) {
        for (const [credType, credValue] of Object.entries(node.credentials)) {
          if (typeof credValue === 'string') {
            node.credentials[credType] = {
              id: credValue,
              name: credValue.replace(/_/g, ' ').replace(/ID$/g, '')
            };
            fixes.push(`Credential "${credType}" converti en objet pour "${node.name}"`);
          }
        }
      }
    }
    
    // 3. Corriger la structure des connexions
    for (const [fromNode, connectionTypes] of Object.entries(fixedWorkflow.connections)) {
      for (const [connType, connections] of Object.entries(connectionTypes)) {
        if (!Array.isArray(connections)) continue;
        
        for (let i = 0; i < connections.length; i++) {
          // Si c'est un objet au lieu d'un tableau, le convertir
          if (!Array.isArray(connections[i]) && typeof connections[i] === 'object') {
            fixedWorkflow.connections[fromNode][connType] = [connections];
            fixes.push(`Structure connexion corrigée: ${fromNode}.${connType} → [[{...}]]`);
            break;
          }
        }
      }
    }
    
    // 4. Créer les connexions AI manquantes
    const aiAgentNode = fixedWorkflow.nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.agent');
    if (aiAgentNode) {
      const openRouterNode = fixedWorkflow.nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter');
      const calculatorNode = fixedWorkflow.nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.toolCalculator');
      const memoryNode = fixedWorkflow.nodes.find(n => n.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow');
      
      if (openRouterNode) {
        if (!fixedWorkflow.connections[openRouterNode.name]) {
          fixedWorkflow.connections[openRouterNode.name] = {};
        }
        if (!fixedWorkflow.connections[openRouterNode.name].ai_languageModel) {
          fixedWorkflow.connections[openRouterNode.name].ai_languageModel = [[{
            node: aiAgentNode.name,
            type: 'ai_languageModel',
            index: 0
          }]];
          fixes.push(`Connexion AI créée: ${openRouterNode.name} → ${aiAgentNode.name}`);
        }
      }
      
      if (calculatorNode) {
        if (!fixedWorkflow.connections[calculatorNode.name]) {
          fixedWorkflow.connections[calculatorNode.name] = {};
        }
        if (!fixedWorkflow.connections[calculatorNode.name].ai_tool) {
          fixedWorkflow.connections[calculatorNode.name].ai_tool = [[{
            node: aiAgentNode.name,
            type: 'ai_tool',
            index: 0
          }]];
          fixes.push(`Connexion AI créée: ${calculatorNode.name} → ${aiAgentNode.name}`);
        }
      }
      
      if (memoryNode) {
        if (!fixedWorkflow.connections[memoryNode.name]) {
          fixedWorkflow.connections[memoryNode.name] = {};
        }
        if (!fixedWorkflow.connections[memoryNode.name].ai_memory) {
          fixedWorkflow.connections[memoryNode.name].ai_memory = [[{
            node: aiAgentNode.name,
            type: 'ai_memory',
            index: 0
          }]];
          fixes.push(`Connexion AI créée: ${memoryNode.name} → ${aiAgentNode.name}`);
        }
      }
    }
    
    console.log(`✅ [PerfectValidator] ${fixes.length} correction(s) appliquée(s)`);
    
    return {
      workflow: fixedWorkflow,
      fixes: fixes,
      fixCount: fixes.length
    };
  }
  
  /**
   * Valide et corrige automatiquement un workflow
   * @param {Object} workflow - Le workflow à valider et corriger
   * @returns {Object} Résultat avec workflow corrigé et rapport
   */
  static validateAndFix(workflow) {
    console.log('🔍🔧 [PerfectValidator] Validation + Auto-correction...');
    
    // Première validation
    let report = this.validate(workflow);
    
    if (!report.valid) {
      // Tenter une correction automatique
      const fixResult = this.autoFix(workflow);
      
      // Re-valider après correction
      report = this.validate(fixResult.workflow);
      report.fixes = fixResult.fixes;
      report.autoFixed = true;
      
      if (report.valid) {
        console.log('✅ [PerfectValidator] Workflow corrigé avec succès');
        return {
          valid: true,
          workflow: fixResult.workflow,
          report: report
        };
      } else {
        console.log('❌ [PerfectValidator] Impossible de corriger automatiquement tous les problèmes');
        return {
          valid: false,
          workflow: fixResult.workflow,
          report: report
        };
      }
    }
    
    return {
      valid: true,
      workflow: workflow,
      report: report
    };
  }
}

module.exports = PerfectWorkflowValidator;

