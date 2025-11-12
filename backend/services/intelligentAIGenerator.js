// Service d'AI Generator intelligent avec contexte de l'application
const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl
});

class IntelligentAIGenerator {
  
  // Nœuds n8n validés et disponibles
  static VALID_NODES = {
    // TRIGGERS
    triggers: [
      'n8n-nodes-base.webhook',
      'n8n-nodes-base.schedule', 
      'n8n-nodes-base.manualTrigger',
      'n8n-nodes-base.files'
    ],
    
    // EMAIL
    email: [
      'n8n-nodes-base.emailReadImap',
      'n8n-nodes-base.emailSend',
      'n8n-nodes-imap.imap'
    ],
    
    // COMMUNICATION
    communication: [
      'n8n-nodes-base.slack',
      'n8n-nodes-base.discord',
      'n8n-nodes-base.telegram'
    ],
    
    // APIS & DATA
    apis: [
      'n8n-nodes-base.httpRequest',
      'n8n-nodes-base.postgres',
      'n8n-nodes-base.mysql',
      'n8n-nodes-base.mongoDb'
    ],
    
    // PROCESSING
    processing: [
      'n8n-nodes-base.aggregate',
      'n8n-nodes-base.set',
      'n8n-nodes-base.code',
      'n8n-nodes-base.splitInBatches',
      'n8n-nodes-base.markdown',
      'n8n-nodes-base.function'
    ],
    
    // AI & LANGCHAIN
    ai: [
      '@n8n/n8n-nodes-langchain.agent',
      '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
      '@n8n/n8n-nodes-langchain.toolCalculator',
      '@n8n/n8n-nodes-langchain.memoryBufferWindow'
    ]
  };
  
  // Patterns de workflows éprouvés basés sur vos templates
  static WORKFLOW_PATTERNS = {
    email_analysis: {
      name: "Email Analysis",
      description: "Analyse et résumé d'emails avec IA",
      nodes: [
        { type: 'n8n-nodes-base.schedule', role: 'trigger' },
        { type: 'n8n-nodes-imap.imap', role: 'email_reader' },
        { type: 'n8n-nodes-base.aggregate', role: 'data_processor' },
        { type: '@n8n/n8n-nodes-langchain.agent', role: 'ai_processor' },
        { type: 'n8n-nodes-base.emailSend', role: 'email_sender' }
      ],
      connections: [
        'schedule -> imap',
        'imap -> aggregate', 
        'aggregate -> agent',
        'agent -> emailSend'
      ]
    },
    
    pdf_analysis: {
      name: "PDF Analysis",
      description: "Analyse de documents PDF avec IA",
      nodes: [
        { type: 'n8n-nodes-base.webhook', role: 'trigger' },
        { type: 'n8n-nodes-base.extractFromFile', role: 'pdf_extractor' },
        { type: '@n8n/n8n-nodes-langchain.agent', role: 'ai_processor' },
        { type: 'n8n-nodes-base.emailSend', role: 'result_sender' }
      ],
      connections: [
        'webhook -> extractFromFile',
        'extractFromFile -> agent',
        'agent -> emailSend'
      ]
    },
    
    data_processing: {
      name: "Data Processing",
      description: "Traitement de données avec IA",
      nodes: [
        { type: 'n8n-nodes-base.webhook', role: 'trigger' },
        { type: 'n8n-nodes-base.httpRequest', role: 'data_fetcher' },
        { type: '@n8n/n8n-nodes-langchain.agent', role: 'ai_processor' },
        { type: 'n8n-nodes-base.postgres', role: 'data_storage' }
      ],
      connections: [
        'webhook -> httpRequest',
        'httpRequest -> agent',
        'agent -> postgres'
      ]
    }
  };
  
  // Analyser le contexte de l'application
  static async getApplicationContext() {
    try {
      console.log('🧠 [IntelligentAI] Analyse du contexte de l\'application...');
      
      // Récupérer tous les templates existants
      const templatesResult = await pool.query(`
        SELECT name, description, json 
        FROM templates 
        ORDER BY created_at DESC
      `);
      
      // Analyser les patterns des templates
      const patterns = this.analyzeTemplatePatterns(templatesResult.rows);
      
      // Récupérer les statistiques d'utilisation
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_workflows,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_workflows
        FROM workflows
      `);
      
      const context = {
        templates: templatesResult.rows,
        patterns: patterns,
        stats: statsResult.rows[0],
        validNodes: this.VALID_NODES,
        workflowPatterns: this.WORKFLOW_PATTERNS
      };
      
      console.log('📊 [IntelligentAI] Contexte analysé:', {
        templates: templatesResult.rows.length,
        patterns: Object.keys(patterns).length,
        totalWorkflows: statsResult.rows[0].total_workflows,
        activeWorkflows: statsResult.rows[0].active_workflows
      });
      
      return context;
      
    } catch (error) {
      console.error('❌ [IntelligentAI] Erreur lors de l\'analyse du contexte:', error);
      throw error;
    }
  }
  
  // Analyser les patterns des templates existants
  static analyzeTemplatePatterns(templates) {
    const patterns = {
      commonNodes: {},
      commonConnections: {},
      nodeSequences: {},
      triggerTypes: {},
      actionTypes: {}
    };
    
    templates.forEach(template => {
      if (!template.json.nodes) return;
      
      // Analyser les nœuds
      template.json.nodes.forEach(node => {
        patterns.commonNodes[node.type] = (patterns.commonNodes[node.type] || 0) + 1;
      });
      
      // Analyser les connexions
      if (template.json.connections) {
        Object.entries(template.json.connections).forEach(([fromNode, connections]) => {
          connections.main?.forEach(connection => {
            connection.forEach(conn => {
              const connectionKey = `${fromNode} -> ${conn.node}`;
              patterns.commonConnections[connectionKey] = (patterns.commonConnections[connectionKey] || 0) + 1;
            });
          });
        });
      }
      
      // Analyser les séquences de nœuds
      const nodeSequence = template.json.nodes
        .sort((a, b) => a.position[0] - b.position[0])
        .map(node => node.type);
      
      const sequenceKey = nodeSequence.join(' -> ');
      patterns.nodeSequences[sequenceKey] = (patterns.nodeSequences[sequenceKey] || 0) + 1;
    });
    
    return patterns;
  }
  
  // Générer un workflow intelligent basé sur le contexte
  static async generateIntelligentWorkflow(description, aiProvider = 'openrouter') {
    try {
      console.log('🤖 [IntelligentAI] Génération intelligente de workflow...');
      
      // Récupérer le contexte de l'application
      const context = await this.getApplicationContext();
      
      // Déterminer le pattern le plus approprié
      const bestPattern = this.selectBestPattern(description, context);
      
      // Générer le prompt intelligent
      const intelligentPrompt = this.buildIntelligentPrompt(description, context, bestPattern);
      
      // Appeler l'AI avec le prompt contextuel
      const workflow = await this.callAIWithContext(intelligentPrompt, aiProvider);
      
      // Valider et corriger le workflow
      const validatedWorkflow = this.validateAndFixWorkflow(workflow, context);
      
      console.log('✅ [IntelligentAI] Workflow généré et validé');
      return validatedWorkflow;
      
    } catch (error) {
      console.error('❌ [IntelligentAI] Erreur lors de la génération:', error);
      throw error;
    }
  }
  
  // Sélectionner le meilleur pattern basé sur la description
  static selectBestPattern(description, context) {
    const lowerDesc = description.toLowerCase();
    
    // Détecter le type de workflow demandé
    if (lowerDesc.includes('email') || lowerDesc.includes('mail')) {
      return 'email_analysis';
    } else if (lowerDesc.includes('pdf') || lowerDesc.includes('document')) {
      return 'pdf_analysis';
    } else if (lowerDesc.includes('data') || lowerDesc.includes('database')) {
      return 'data_processing';
    }
    
    // Par défaut, utiliser le pattern le plus utilisé
    return 'email_analysis';
  }
  
  // Construire un prompt intelligent avec contexte
  static buildIntelligentPrompt(description, context, pattern) {
    const patternInfo = this.WORKFLOW_PATTERNS[pattern];
    
    return `You are an expert n8n workflow designer with deep knowledge of the Automivy application.

APPLICATION CONTEXT:
- This is a multi-user n8n automation platform
- Users have access to templates and can create workflows
- The system uses OpenRouter for AI processing
- Credentials are dynamically injected

EXISTING SUCCESSFUL PATTERNS:
${JSON.stringify(context.patterns, null, 2)}

RECOMMENDED PATTERN: ${pattern}
${JSON.stringify(patternInfo, null, 2)}

VALID NODES ONLY (use ONLY these):
${JSON.stringify(this.VALID_NODES, null, 2)}

USER REQUEST: ${description}

Generate a COMPLETE, FUNCTIONAL workflow that:
1. Uses ONLY valid n8n node types from the list above
2. Follows the recommended pattern: ${pattern}
3. Includes proper connections between all nodes
4. Uses credential placeholders for dynamic injection
5. Is ready to deploy without modifications

CRITICAL REQUIREMENTS:
- Every node MUST have complete parameters (never empty {})
- ALL connections must be properly defined
- Use the exact node types from the valid list
- Follow the pattern structure but adapt to user needs
- Include AI Agent with OpenRouter for intelligent processing

Return ONLY valid JSON with complete workflow structure.`;
  }
  
  // Appeler l'AI avec le contexte
  static async callAIWithContext(prompt, aiProvider) {
    // Ici, vous intégreriez votre service AI existant
    // Pour l'instant, retournons un workflow de base
    return {
      name: "Intelligent Generated Workflow",
      nodes: [],
      connections: {}
    };
  }
  
  // Valider et corriger le workflow généré
  static validateAndFixWorkflow(workflow, context) {
    console.log('🔍 [IntelligentAI] Validation du workflow...');
    
    // Vérifier que tous les nœuds sont valides
    const allValidNodes = Object.values(this.VALID_NODES).flat();
    const invalidNodes = workflow.nodes?.filter(node => 
      !allValidNodes.includes(node.type)
    ) || [];
    
    if (invalidNodes.length > 0) {
      console.warn('⚠️ [IntelligentAI] Nœuds invalides détectés:', invalidNodes);
      // Corriger les nœuds invalides
      workflow.nodes = this.fixInvalidNodes(workflow.nodes, context);
    }
    
    // Vérifier les connexions
    workflow.connections = this.validateConnections(workflow.connections, workflow.nodes);
    
    console.log('✅ [IntelligentAI] Workflow validé et corrigé');
    return workflow;
  }
  
  // Corriger les nœuds invalides
  static fixInvalidNodes(nodes, context) {
    return nodes.map(node => {
      const allValidNodes = Object.values(this.VALID_NODES).flat();
      
      if (!allValidNodes.includes(node.type)) {
        console.log(`🔧 [IntelligentAI] Correction du nœud: ${node.type}`);
        
        // Remplacer par un nœud valide équivalent
        if (node.type.includes('email')) {
          node.type = 'n8n-nodes-base.emailSend';
        } else if (node.type.includes('http')) {
          node.type = 'n8n-nodes-base.httpRequest';
        } else if (node.type.includes('ai') || node.type.includes('agent')) {
          node.type = '@n8n/n8n-nodes-langchain.agent';
        } else {
          node.type = 'n8n-nodes-base.code';
        }
      }
      
      return node;
    });
  }
  
  // Valider les connexions
  static validateConnections(connections, nodes) {
    const nodeNames = nodes.map(node => node.name);
    const validConnections = {};
    
    Object.entries(connections || {}).forEach(([fromNode, nodeConnections]) => {
      if (nodeNames.includes(fromNode)) {
        validConnections[fromNode] = nodeConnections;
      }
    });
    
    return validConnections;
  }
}

module.exports = IntelligentAIGenerator;
