// Service AI Generator amélioré avec contexte intelligent
const ApplicationContextService = require('./applicationContextService');
const N8nNodeValidator = require('./n8nNodeValidator');
const aiService = require('./aiService');

class EnhancedAIGenerator {
  
  // Générer un workflow intelligent avec contexte complet
  // Modèle par défaut : openai/gpt-4o-mini (bon rapport performance/prix, très peu cher)
  static async generateIntelligentWorkflow(description, aiProvider = 'openrouter', aiModel = 'openai/gpt-4o-mini') {
    try {
      console.log('🤖 [EnhancedAI] Génération intelligente de workflow...');
      console.log('🤖 [EnhancedAI] Model:', aiModel);
      
      // 1. Analyser le contexte de l'application
      const context = await ApplicationContextService.getFullContext();
      console.log('📊 [EnhancedAI] Contexte analysé:', {
        templates: context.templates.length,
        popularNodes: Object.keys(context.popularNodes).length,
        workingPatterns: Object.keys(context.workingPatterns).length
      });
      
      // 2. Générer un prompt contextuel intelligent
      const contextualPrompt = ApplicationContextService.generateContextualPrompt(description, context);
      
      // 3. Appeler l'AI avec le prompt contextuel et le modèle
      const rawWorkflow = await this.callAIWithContext(contextualPrompt, aiProvider, aiModel);
      
      // 4. Valider le workflow généré
      const validation = N8nNodeValidator.validateWorkflow(rawWorkflow);
      
      if (!validation.valid) {
        console.log('⚠️ [EnhancedAI] Workflow invalide détecté, correction en cours...');
        console.log('Erreurs:', validation.errors);
        console.log('Suggestions:', validation.suggestions);
        
        // Corriger le workflow
        const correctedWorkflow = N8nNodeValidator.fixWorkflow(rawWorkflow);
        
        // Re-valider après correction
        const reValidation = N8nNodeValidator.validateWorkflow(correctedWorkflow);
        
        if (!reValidation.valid) {
          console.log('❌ [EnhancedAI] Impossible de corriger le workflow');
          throw new Error(`Workflow invalide: ${validation.errors.join(', ')}`);
        }
        
        console.log('✅ [EnhancedAI] Workflow corrigé avec succès');
        return correctedWorkflow;
      }
      
      console.log('✅ [EnhancedAI] Workflow généré et validé');
      return rawWorkflow;
      
    } catch (error) {
      console.error('❌ [EnhancedAI] Erreur lors de la génération:', error);
      throw error;
    }
  }
  
  // Appeler l'AI avec le contexte
  // Modèle par défaut : openai/gpt-4o-mini (bon rapport performance/prix, très peu cher)
  static async callAIWithContext(prompt, aiProvider, aiModel = 'openai/gpt-4o-mini') {
    try {
      console.log('🔮 [EnhancedAI] Appel de l\'AI avec contexte...');
      console.log('🔮 [EnhancedAI] Model:', aiModel);
      
      // Utiliser le service AI existant mais avec le prompt contextuel et le modèle
      const workflow = await aiService.generateWorkflow(prompt, aiProvider, aiModel);
      
      console.log('✅ [EnhancedAI] Réponse AI reçue');
      return workflow;
      
    } catch (error) {
      console.error('❌ [EnhancedAI] Erreur lors de l\'appel AI:', error);
      throw error;
    }
  }
  
  // Générer un workflow basé sur un template existant
  static async generateFromTemplate(templateId, userCustomizations = {}) {
    try {
      console.log('📋 [EnhancedAI] Génération basée sur template:', templateId);
      
      // Récupérer le template
      const { Pool } = require('pg');
      const config = require('../config');
      const pool = new Pool(config.database);
      
      const result = await pool.query('SELECT * FROM templates WHERE id = $1', [templateId]);
      
      if (result.rows.length === 0) {
        throw new Error('Template non trouvé');
      }
      
      const template = result.rows[0];
      
      // Personnaliser le template
      const personalizedWorkflow = this.personalizeTemplate(template, userCustomizations);
      
      // Valider le workflow personnalisé
      const validation = N8nNodeValidator.validateWorkflow(personalizedWorkflow);
      
      if (!validation.valid) {
        console.log('⚠️ [EnhancedAI] Template personnalisé invalide, correction...');
        const correctedWorkflow = N8nNodeValidator.fixWorkflow(personalizedWorkflow);
        return correctedWorkflow;
      }
      
      console.log('✅ [EnhancedAI] Template personnalisé généré');
      return personalizedWorkflow;
      
    } catch (error) {
      console.error('❌ [EnhancedAI] Erreur lors de la génération depuis template:', error);
      throw error;
    }
  }
  
  // Personnaliser un template
  static personalizeTemplate(template, customizations) {
    const workflow = JSON.parse(JSON.stringify(template.json)); // Deep clone
    
    // Personnaliser le nom
    if (customizations.name) {
      workflow.name = customizations.name;
    }
    
    // Personnaliser les paramètres des nœuds
    if (customizations.nodeParameters) {
      workflow.nodes = workflow.nodes.map(node => {
        const customParams = customizations.nodeParameters[node.name];
        if (customParams) {
          node.parameters = { ...node.parameters, ...customParams };
        }
        return node;
      });
    }
    
    // Personnaliser les connexions
    if (customizations.connections) {
      workflow.connections = { ...workflow.connections, ...customizations.connections };
    }
    
    return workflow;
  }
  
  // Générer un workflow optimisé pour l'utilisateur
  static async generateOptimizedWorkflow(description, userId, aiProvider = 'openrouter') {
    try {
      console.log('🎯 [EnhancedAI] Génération optimisée pour utilisateur:', userId);
      
      // Récupérer le contexte utilisateur
      const userContext = await this.getUserContext(userId);
      
      // Récupérer le contexte global
      const globalContext = await ApplicationContextService.getFullContext();
      
      // Combiner les contextes
      const combinedContext = {
        ...globalContext,
        user: userContext
      };
      
      // Générer le prompt optimisé
      const optimizedPrompt = this.buildOptimizedPrompt(description, combinedContext);
      
      // Générer le workflow
      const workflow = await this.callAIWithContext(optimizedPrompt, aiProvider);
      
      // Optimiser le workflow pour l'utilisateur
      const optimizedWorkflow = this.optimizeForUser(workflow, userContext);
      
      console.log('✅ [EnhancedAI] Workflow optimisé généré');
      return optimizedWorkflow;
      
    } catch (error) {
      console.error('❌ [EnhancedAI] Erreur lors de la génération optimisée:', error);
      throw error;
    }
  }
  
  // Récupérer le contexte utilisateur
  static async getUserContext(userId) {
    const { Pool } = require('pg');
    const config = require('../config');
    const pool = new Pool(config.database);
    
    try {
      // Récupérer les workflows de l'utilisateur
      const workflowsResult = await pool.query(`
        SELECT w.*, t.name as template_name, t.json as template_json
        FROM workflows w
        LEFT JOIN templates t ON w.template_id = t.id
        WHERE w.user_id = $1
        ORDER BY w.created_at DESC
      `, [userId]);
      
      // Récupérer le profil utilisateur
      const profileResult = await pool.query(`
        SELECT * FROM user_profiles WHERE id = $1
      `, [userId]);
      
      return {
        workflows: workflowsResult.rows,
        profile: profileResult.rows[0],
        preferences: this.extractUserPreferences(workflowsResult.rows)
      };
      
    } finally {
      await pool.end();
    }
  }
  
  // Extraire les préférences utilisateur
  static extractUserPreferences(workflows) {
    const preferences = {
      preferredNodes: {},
      preferredPatterns: {},
      commonUseCases: []
    };
    
    workflows.forEach(workflow => {
      if (workflow.template_json && workflow.template_json.nodes) {
        workflow.template_json.nodes.forEach(node => {
          preferences.preferredNodes[node.type] = (preferences.preferredNodes[node.type] || 0) + 1;
        });
      }
    });
    
    return preferences;
  }
  
  // Construire un prompt optimisé
  static buildOptimizedPrompt(description, context) {
    const userPreferences = context.user?.preferences || {};
    
    return `You are an expert n8n workflow designer with deep knowledge of the Automivy application and this specific user's preferences.

USER CONTEXT:
- User has ${context.user?.workflows?.length || 0} existing workflows
- Preferred nodes: ${Object.keys(userPreferences.preferredNodes || {}).join(', ')}
- Common use cases: ${userPreferences.commonUseCases?.join(', ') || 'none'}

APPLICATION CONTEXT:
- ${context.usageStats?.templates?.total_templates || 0} templates available
- ${context.usageStats?.workflows?.total_workflows || 0} workflows created
- ${context.usageStats?.workflows?.active_workflows || 0} active workflows

POPULAR NODES (use these proven nodes):
${Object.entries(context.popularNodes || {})
  .slice(0, 10)
  .map(([node, count]) => `- ${node} (used ${count} times)`)
  .join('\n')}

WORKING PATTERNS (proven successful):
${Object.entries(context.workingPatterns || {})
  .slice(0, 5)
  .map(([pattern, data]) => `- ${pattern} (${data.activeUsage} active workflows)`)
  .join('\n')}

USER REQUEST: ${description}

Generate a COMPLETE, FUNCTIONAL workflow that:
1. Uses the user's preferred node types when possible
2. Follows proven successful patterns
3. Includes proper connections between all nodes
4. Uses credential placeholders for dynamic injection
5. Is optimized for this user's workflow style
6. Is ready to deploy without modifications

CRITICAL REQUIREMENTS:
- Every node MUST have complete parameters (never empty {})
- ALL connections must be properly defined
- Use the exact node types from the proven list
- Follow the successful patterns but adapt to user needs
- Include AI Agent with OpenRouter for intelligent processing
- Optimize for the user's existing workflow patterns

Return ONLY valid JSON with complete workflow structure.`;
  }
  
  // Optimiser le workflow pour l'utilisateur
  static optimizeForUser(workflow, userContext) {
    const optimized = JSON.parse(JSON.stringify(workflow)); // Deep clone
    
    // Ajuster les paramètres selon les préférences utilisateur
    if (userContext.preferences?.preferredNodes) {
      optimized.nodes = optimized.nodes.map(node => {
        // Si l'utilisateur préfère certains nœuds, ajuster les paramètres
        if (userContext.preferences.preferredNodes[node.type]) {
          // Ajuster les paramètres selon les préférences
          node.parameters = this.adjustParametersForUser(node.parameters, userContext);
        }
        return node;
      });
    }
    
    return optimized;
  }
  
  // Ajuster les paramètres pour l'utilisateur
  static adjustParametersForUser(parameters, userContext) {
    // Ajuster les paramètres selon le contexte utilisateur
    // Par exemple, ajuster les intervalles de temps, les formats, etc.
    return parameters;
  }
}

module.exports = EnhancedAIGenerator;
