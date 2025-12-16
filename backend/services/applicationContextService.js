// Service de contexte intelligent de l'application
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

class ApplicationContextService {
  
  // Analyser le contexte complet de l'application
  static async getFullContext() {
    try {
      console.log('🧠 [ApplicationContext] Analyse du contexte complet...');
      
      const context = {
        // Templates existants et leurs patterns
        templates: await this.analyzeTemplates(),
        
        // Nœuds les plus utilisés
        popularNodes: await this.getPopularNodes(),
        
        // Patterns de connexions réussies
        connectionPatterns: await this.getConnectionPatterns(),
        
        // Statistiques d'utilisation
        usageStats: await this.getUsageStats(),
        
        // Credentials disponibles
        availableCredentials: await this.getAvailableCredentials(),
        
        // Patterns de workflows qui fonctionnent
        workingPatterns: await this.getWorkingPatterns()
      };
      
      console.log('📊 [ApplicationContext] Contexte analysé:', {
        templates: context.templates.length,
        popularNodes: Object.keys(context.popularNodes).length,
        connectionPatterns: Object.keys(context.connectionPatterns).length,
        workingPatterns: Object.keys(context.workingPatterns).length
      });
      
      return context;
      
    } catch (error) {
      console.error('❌ [ApplicationContext] Erreur lors de l\'analyse:', error);
      throw error;
    }
  }
  
  // Analyser les templates existants
  static async analyzeTemplates() {
    const result = await pool.query(`
      SELECT 
        id, name, description, json, created_at,
        (SELECT COUNT(*) FROM workflows WHERE template_id = templates.id) as usage_count
      FROM templates 
      ORDER BY created_at DESC
    `);
    
    return result.rows.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      usageCount: parseInt(template.usage_count),
      nodeTypes: this.extractNodeTypes(template.json),
      connections: this.extractConnections(template.json),
      complexity: this.calculateComplexity(template.json),
      createdAt: template.created_at
    }));
  }
  
  // Extraire les types de nœuds d'un template
  static extractNodeTypes(templateJson) {
    if (!templateJson.nodes) return [];
    
    return templateJson.nodes.map(node => ({
      type: node.type,
      name: node.name,
      position: node.position,
      parameters: Object.keys(node.parameters || {})
    }));
  }
  
  // Extraire les connexions d'un template
  static extractConnections(templateJson) {
    if (!templateJson.connections) return {};
    
    const connections = {};
    Object.entries(templateJson.connections).forEach(([fromNode, nodeConnections]) => {
      if (nodeConnections.main) {
        connections[fromNode] = nodeConnections.main.flat().map(conn => conn.node);
      }
    });
    
    return connections;
  }
  
  // Calculer la complexité d'un template
  static calculateComplexity(templateJson) {
    const nodeCount = templateJson.nodes?.length || 0;
    const connectionCount = Object.keys(templateJson.connections || {}).length;
    
    if (nodeCount <= 3) return 'simple';
    if (nodeCount <= 8) return 'medium';
    return 'complex';
  }
  
  // Obtenir TOUS les nœuds disponibles depuis le registre local et l'API n8n
  static async getPopularNodes() {
    try {
      console.log('🔍 [ApplicationContext] Récupération de tous les nœuds disponibles...');
      
      // Utiliser le registre local comme source principale
      const PerfectN8nNodesRegistry = require('./perfectN8nNodesRegistry');
      const allTypes = PerfectN8nNodesRegistry.getAllValidTypes();
      
      console.log(`📋 [ApplicationContext] ${allTypes.length} nœuds depuis le registre local`);
      
      // Créer un map avec tous les nœuds (valeur = 1 pour indiquer disponibilité)
      const allNodes = {};
      allTypes.forEach(nodeType => {
        allNodes[nodeType] = 1;
      });
      
      // Essayer d'enrichir avec l'API n8n si disponible
      try {
        const n8nUrl = config.n8n.url;
        const n8nApiKey = config.n8n.apiKey;
        
        // Essayer plusieurs endpoints possibles
        const endpoints = [
          `${n8nUrl}/rest/node-types`,
          `${n8nUrl}/api/v1/node-types`,
          `${n8nUrl}/api/v1/nodes`
        ];
        
        for (const fullUrl of endpoints) {
          try {
            const response = await fetch(fullUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'X-N8N-API-KEY': n8nApiKey,
              },
            });
            
            if (response.ok) {
              const data = await response.json();
              
              // Extraire les nœuds supplémentaires depuis l'API
              if (Array.isArray(data)) {
                data.forEach(node => {
                  if (node.name && !allNodes[node.name]) {
                    allNodes[node.name] = 1;
                  }
                });
              } else if (typeof data === 'object') {
                for (const [category, nodes] of Object.entries(data)) {
                  if (Array.isArray(nodes)) {
                    nodes.forEach(node => {
                      if (node.name && !allNodes[node.name]) {
                        allNodes[node.name] = 1;
                      }
                    });
                  }
                }
              }
              
              console.log(`✅ [ApplicationContext] Nœuds enrichis depuis l'API n8n`);
              break;
            }
          } catch (err) {
            // Continuer avec le prochain endpoint
          }
        }
      } catch (apiError) {
        console.log(`⚠️ [ApplicationContext] API n8n non disponible, utilisation du registre local uniquement`);
      }
      
      console.log(`📊 [ApplicationContext] ${Object.keys(allNodes).length} nœuds disponibles au total`);
      
      return allNodes;
      
    } catch (error) {
      console.error('❌ [ApplicationContext] Erreur lors de la récupération des nœuds:', error);
      // Fallback: utiliser les nœuds populaires depuis les templates
      return await this.getPopularNodesFromTemplates();
    }
  }
  
  // Fallback: obtenir les nœuds populaires depuis les templates
  static async getPopularNodesFromTemplates() {
    console.log('📋 [ApplicationContext] Utilisation du fallback: nœuds depuis templates');
    const result = await pool.query(`
      SELECT 
        jsonb_array_elements(json->'nodes')->>'type' as node_type,
        COUNT(*) as usage_count
      FROM templates 
      WHERE json->'nodes' IS NOT NULL
      GROUP BY node_type
      ORDER BY usage_count DESC
    `);
    
    const popularNodes = {};
    result.rows.forEach(row => {
      popularNodes[row.node_type] = parseInt(row.usage_count);
    });
    
    return popularNodes;
  }
  
  // Obtenir les patterns de connexions
  static async getConnectionPatterns() {
    const result = await pool.query(`
      SELECT 
        json->'connections' as connections,
        json->'nodes' as nodes
      FROM templates 
      WHERE json->'connections' IS NOT NULL
    `);
    
    const patterns = {};
    
    result.rows.forEach(template => {
      if (template.connections && template.nodes) {
        Object.entries(template.connections).forEach(([fromNode, nodeConnections]) => {
          if (nodeConnections.main) {
            nodeConnections.main.forEach(connection => {
              connection.forEach(conn => {
                const patternKey = `${fromNode} -> ${conn.node}`;
                patterns[patternKey] = (patterns[patternKey] || 0) + 1;
              });
            });
          }
        });
      }
    });
    
    return patterns;
  }
  
  // Obtenir les statistiques d'utilisation
  static async getUsageStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_templates,
        COUNT(CASE WHEN json->'nodes' IS NOT NULL THEN 1 END) as templates_with_nodes,
        AVG(jsonb_array_length(json->'nodes')) as avg_nodes_per_template
      FROM templates
    `);
    
    // Compter les types de nœuds uniques séparément
    const nodeTypesResult = await pool.query(`
      SELECT COUNT(DISTINCT node_type) as unique_node_types
      FROM (
        SELECT jsonb_array_elements(json->'nodes')->>'type' as node_type
        FROM templates
        WHERE json->'nodes' IS NOT NULL
      ) t
    `);
    
    const workflowStats = await pool.query(`
      SELECT 
        COUNT(*) as total_workflows,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_workflows,
        COUNT(DISTINCT user_id) as unique_users
      FROM workflows
    `);
    
    return {
      templates: {
        ...result.rows[0],
        unique_node_types: nodeTypesResult.rows[0].unique_node_types
      },
      workflows: workflowStats.rows[0]
    };
  }
  
  // Obtenir les credentials disponibles
  static async getAvailableCredentials() {
    // Pour l'instant, retourner les credentials standards
    return {
      'imap': 'USER_IMAP_CREDENTIAL_ID',
      'smtp': 'USER_SMTP_CREDENTIAL_ID',
      'slack': 'USER_SLACK_CREDENTIAL_ID',
      'discord': 'USER_DISCORD_CREDENTIAL_ID',
      'postgres': 'USER_DB_CREDENTIAL_ID',
      'openRouter': 'ADMIN_OPENROUTER_CREDENTIAL_ID'
    };
  }
  
  // Obtenir les patterns qui fonctionnent
  static async getWorkingPatterns() {
    const result = await pool.query(`
      SELECT 
        t.name, t.description, t.json,
        COUNT(w.id) as workflow_count,
        COUNT(CASE WHEN w.is_active = true THEN 1 END) as active_workflow_count
      FROM templates t
      LEFT JOIN workflows w ON t.id = w.template_id
      GROUP BY t.id, t.name, t.description, t.json
      HAVING COUNT(w.id) > 0
      ORDER BY active_workflow_count DESC, workflow_count DESC
    `);
    
    const patterns = {};
    
    result.rows.forEach(template => {
      const nodeSequence = this.getNodeSequence(template.json);
      const patternKey = nodeSequence.join(' -> ');
      
      if (!patterns[patternKey]) {
        patterns[patternKey] = {
          sequence: nodeSequence,
          templates: [],
          totalUsage: 0,
          activeUsage: 0
        };
      }
      
      patterns[patternKey].templates.push({
        name: template.name,
        description: template.description
      });
      
      patterns[patternKey].totalUsage += parseInt(template.workflow_count);
      patterns[patternKey].activeUsage += parseInt(template.active_workflow_count);
    });
    
    return patterns;
  }
  
  // Obtenir la séquence des nœuds
  static getNodeSequence(templateJson) {
    if (!templateJson.nodes) return [];
    
    return templateJson.nodes
      .sort((a, b) => a.position[0] - b.position[0])
      .map(node => node.type);
  }
  
  // Générer un prompt contextuel intelligent
  static generateContextualPrompt(userDescription, context) {
    const bestPatterns = this.selectBestPatterns(userDescription, context);
    const recommendedNodes = this.getRecommendedNodes(userDescription, context);
    const connectionSuggestions = this.getConnectionSuggestions(userDescription, context);
    
    // Extraire un nom court pour le workflow depuis la description
    const workflowName = userDescription.split('\n')[0].substring(0, 50).trim() || 'AI Generated Workflow';
    
    return `Generate a COMPLETE n8n workflow JSON for this request. The workflow name should be: "${workflowName}"

USER REQUEST:
${userDescription}

REQUIRED NODES (you MUST include ALL of these):
${recommendedNodes.map(node => `- ${node}`).join('\n')}

CONNECTION PATTERN:
${connectionSuggestions.map(conn => `- ${conn}`).join('\n')}

CRITICAL: Include ALL nodes mentioned in the user request. Do NOT skip any nodes. Return ONLY valid JSON.`;
  }
  
  // Sélectionner les meilleurs patterns
  static selectBestPatterns(description, context) {
    const lowerDesc = description.toLowerCase();
    const patterns = [];
    
    Object.entries(context.workingPatterns).forEach(([pattern, data]) => {
      if (data.activeUsage > 0) {
        patterns.push({
          pattern,
          score: this.calculatePatternScore(lowerDesc, pattern, data),
          data
        });
      }
    });
    
    return patterns
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }
  
  // Calculer le score d'un pattern
  static calculatePatternScore(description, pattern, data) {
    let score = data.activeUsage * 2 + data.totalUsage;
    
    // Bonus pour les mots-clés correspondants
    if (description.includes('email') && pattern.includes('email')) score += 10;
    if (description.includes('pdf') && pattern.includes('extract')) score += 10;
    if (description.includes('data') && pattern.includes('postgres')) score += 10;
    if (description.includes('ai') && pattern.includes('agent')) score += 10;
    
    return score;
  }
  
  // Obtenir les nœuds recommandés
  static getRecommendedNodes(description, context) {
    const lowerDesc = description.toLowerCase();
    const recommended = [];
    
    // Toujours inclure les nœuds essentiels
    recommended.push('@n8n/n8n-nodes-langchain.agent');
    recommended.push('@n8n/n8n-nodes-langchain.lmChatOpenRouter');
    
    // Ajouter selon la description
    if (lowerDesc.includes('email') || lowerDesc.includes('mail')) {
      recommended.push('n8n-nodes-imap.imap');
      recommended.push('n8n-nodes-base.emailSend');
    }
    
    if (lowerDesc.includes('pdf') || lowerDesc.includes('document')) {
      recommended.push('n8n-nodes-base.extractFromFile');
    }
    
    if (lowerDesc.includes('data') || lowerDesc.includes('database')) {
      recommended.push('n8n-nodes-base.postgres');
    }
    
    if (lowerDesc.includes('slack')) {
      recommended.push('n8n-nodes-base.slack');
    }
    
    if (lowerDesc.includes('discord')) {
      recommended.push('n8n-nodes-base.discord');
    }
    
    // Ajouter les nœuds populaires
    Object.entries(context.popularNodes)
      .slice(0, 5)
      .forEach(([node, count]) => {
        if (!recommended.includes(node)) {
          recommended.push(node);
        }
      });
    
    return recommended;
  }
  
  // Obtenir les suggestions de connexions
  static getConnectionSuggestions(description, context) {
    const suggestions = [];
    
    // Connexions essentielles
    suggestions.push('Schedule Trigger -> IMAP');
    suggestions.push('IMAP -> Aggregate');
    suggestions.push('Aggregate -> AI Agent');
    suggestions.push('AI Agent -> Email Send');
    
    // Connexions AI
    suggestions.push('OpenRouter Chat Model -> AI Agent');
    suggestions.push('Calculator Tool -> AI Agent');
    suggestions.push('Buffer Window Memory -> AI Agent');
    
    return suggestions;
  }
}

module.exports = ApplicationContextService;
