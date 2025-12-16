// ═══════════════════════════════════════════════════════════════════════════════
// ULTIMATE AI WORKFLOW GENERATOR - Le meilleur générateur de workflows n8n au monde
// ═══════════════════════════════════════════════════════════════════════════════
// Ce service génère des workflows n8n parfaits en utilisant :
// - Base de données exhaustive des nœuds
// - Prompts ultra-optimisés avec exemples
// - Validation et correction automatique avancée
// - Contexte intelligent de l'application
// ═══════════════════════════════════════════════════════════════════════════════

const fetch = require('node-fetch');
const N8nNodesDatabase = require('./n8nNodesDatabase');
const UltimatePromptBuilder = require('./ultimatePromptBuilder');
const AdvancedWorkflowValidator = require('./advancedWorkflowValidator');
const ApplicationContextService = require('./applicationContextService');

class UltimateAIGenerator {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN GENERATION - Génération principale de workflow
  // ═══════════════════════════════════════════════════════════════════════════
  
  static async generateWorkflow(description, options = {}) {
    const {
      aiProvider = 'openrouter',
      aiModel = 'openai/gpt-4o-mini',
      userId = null,
      maxRetries = 3,
      includeContext = true
    } = options;
    
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('🚀 [UltimateAI] GÉNÉRATION DE WORKFLOW DÉMARRÉE');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`📝 Description: ${description.substring(0, 100)}...`);
    console.log(`🤖 Provider: ${aiProvider} | Model: ${aiModel}`);
    
    try {
      // 1. Analyser la description
      console.log('\n📊 [UltimateAI] Étape 1: Analyse de la description...');
      const analysis = UltimatePromptBuilder.analyzeDescription(description);
      console.log(`   Type détecté: ${analysis.workflowType}`);
      console.log(`   Complexité: ${analysis.complexity}`);
      console.log(`   Nodes requis: ${analysis.requiredNodes.length}`);
      
      // 2. Récupérer le contexte de l'application
      let context = {};
      if (includeContext) {
        console.log('\n🧠 [UltimateAI] Étape 2: Récupération du contexte...');
        try {
          context = await ApplicationContextService.getFullContext();
          console.log(`   Templates: ${context.templates?.length || 0}`);
          console.log(`   Nodes populaires: ${Object.keys(context.popularNodes || {}).length}`);
        } catch (contextError) {
          console.warn('⚠️ [UltimateAI] Contexte non disponible:', contextError.message);
        }
      }
      
      // 3. Construire le prompt ultime
      console.log('\n📝 [UltimateAI] Étape 3: Construction du prompt optimisé...');
      const prompt = UltimatePromptBuilder.buildUltimatePrompt(description, analysis, context);
      
      // 4. Générer le workflow avec retry
      console.log('\n🤖 [UltimateAI] Étape 4: Appel de l\'IA...');
      let workflow = null;
      let lastError = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`   Tentative ${attempt}/${maxRetries}...`);
        
        try {
          const rawResponse = await this.callAI(prompt, aiProvider, aiModel);
          
          // 5. Parser et valider le workflow
          console.log('\n✅ [UltimateAI] Étape 5: Validation et correction...');
          const validationResult = AdvancedWorkflowValidator.parseAndValidate(rawResponse);
          
          if (validationResult.valid) {
            workflow = validationResult.fixedWorkflow;
            
            // Log des corrections effectuées
            if (validationResult.fixes.length > 0) {
              console.log(`   🔧 ${validationResult.fixes.length} correction(s) automatique(s)`);
            }
            if (validationResult.warnings.length > 0) {
              console.log(`   ⚠️ ${validationResult.warnings.length} warning(s)`);
            }
            
            break;
          } else {
            console.warn(`   ❌ Validation échouée: ${validationResult.errors.map(e => e.message).join(', ')}`);
            lastError = new Error(validationResult.errors.map(e => e.message).join(', '));
          }
          
        } catch (error) {
          console.error(`   ❌ Erreur tentative ${attempt}: ${error.message}`);
          lastError = error;
          
          // Attendre avant de réessayer
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      if (!workflow) {
        throw lastError || new Error('Échec de la génération après plusieurs tentatives');
      }
      
      // 6. Post-processing final
      console.log('\n🎨 [UltimateAI] Étape 6: Post-processing...');
      workflow = this.postProcess(workflow, description, analysis);
      
      console.log('\n═══════════════════════════════════════════════════════════════════════════════');
      console.log('✅ [UltimateAI] WORKFLOW GÉNÉRÉ AVEC SUCCÈS');
      console.log(`   Nom: ${workflow.name}`);
      console.log(`   Nodes: ${workflow.nodes.length}`);
      console.log(`   Connexions: ${Object.keys(workflow.connections).length}`);
      console.log('═══════════════════════════════════════════════════════════════════════════════\n');
      
      return {
        success: true,
        workflow,
        analysis,
        metadata: {
          generatedAt: new Date().toISOString(),
          aiProvider,
          aiModel,
          workflowType: analysis.workflowType,
          complexity: analysis.complexity
        }
      };
      
    } catch (error) {
      console.error('\n❌ [UltimateAI] ERREUR DE GÉNÉRATION:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AI CALL - Appel à l'API IA
  // ═══════════════════════════════════════════════════════════════════════════
  
  static async callAI(prompt, aiProvider, aiModel) {
    if (aiProvider !== 'openrouter') {
      throw new Error(`Provider ${aiProvider} non supporté. Utilisez 'openrouter'.`);
    }
    
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY non trouvée dans les variables d\'environnement');
    }
    
    console.log(`   🔑 Clé API: ${openRouterApiKey.substring(0, 15)}...`);
    console.log(`   🤖 Modèle: ${aiModel}`);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterApiKey}`,
        'HTTP-Referer': 'https://automivy.com',
        'X-Title': 'Automivy Ultimate Workflow Generator'
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: prompt.temperature,
        max_tokens: prompt.maxTokens,
        top_p: prompt.topP
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur OpenRouter ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Réponse OpenRouter vide');
    }
    
    console.log(`   📄 Réponse reçue: ${content.length} caractères`);
    
    return content;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POST PROCESSING - Traitement final du workflow
  // ═══════════════════════════════════════════════════════════════════════════
  
  static postProcess(workflow, description, analysis) {
    // 1. Améliorer le nom si nécessaire
    if (!workflow.name || workflow.name === 'AI Generated Workflow') {
      workflow.name = this.generateWorkflowName(description, analysis.workflowType);
    }
    
    // 2. Ajuster les positions pour une meilleure lisibilité
    workflow.nodes = this.optimizeNodePositions(workflow.nodes);
    
    // 3. Ajouter les métadonnées
    if (!workflow.meta) {
      workflow.meta = {};
    }
    workflow.meta.generatedBy = 'Automivy Ultimate AI Generator';
    workflow.meta.generatedAt = new Date().toISOString();
    workflow.meta.workflowType = analysis.workflowType;
    
    return workflow;
  }
  
  static generateWorkflowName(description, workflowType) {
    const typeNames = {
      'email-automation': 'Email Automation',
      'email-summary': 'Email Summary',
      'newsletter': 'Newsletter Generator',
      'pdf-analysis': 'PDF Analysis',
      'api-webhook': 'API Workflow',
      'generic': 'Custom Workflow'
    };
    
    const baseName = typeNames[workflowType] || 'AI Workflow';
    
    // Extraire quelques mots clés de la description
    const keywords = description
      .toLowerCase()
      .replace(/[^a-zàâçéèêëîïôùûüÿœæ\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4)
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return keywords ? `${baseName} - ${keywords}` : baseName;
  }
  
  static optimizeNodePositions(nodes) {
    if (!nodes || nodes.length === 0) return nodes;
    
    // Organiser les nœuds par colonnes
    const xStart = 250;
    const xStep = 300;
    const yMain = 300;
    const yAI = 500;
    
    let mainX = xStart;
    let aiX = xStart;
    
    return nodes.map(node => {
      const isAISubNode = 
        node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter' ||
        node.type === '@n8n/n8n-nodes-langchain.toolCalculator' ||
        node.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow';
      
      if (isAISubNode) {
        node.position = [aiX, yAI + (node.type.includes('tool') ? 150 : node.type.includes('memory') ? 300 : 0)];
        aiX += xStep;
      } else {
        node.position = [mainX, yMain];
        mainX += xStep;
      }
      
      return node;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUICK GENERATION - Génération rapide pour cas courants
  // ═══════════════════════════════════════════════════════════════════════════
  
  static async generateEmailSummaryWorkflow(options = {}) {
    const description = `
      Crée un workflow d'automatisation email qui :
      1. S'exécute ${options.schedule || 'tous les jours à 9h'}
      2. Lit les ${options.emailCount || 50} derniers emails non lus via IMAP
      3. Agrège les emails
      4. Utilise un AI Agent pour analyser et créer un résumé par priorité
      5. Formate le résumé en HTML
      6. Envoie le résumé par email
    `;
    
    return this.generateWorkflow(description, {
      aiModel: options.aiModel || 'openai/gpt-4o-mini',
      ...options
    });
  }
  
  static async generateNewsletterWorkflow(options = {}) {
    const description = `
      Crée un workflow newsletter qui :
      1. S'exécute ${options.schedule || 'tous les jours à 6h'}
      2. Lit le flux RSS ${options.rssUrl || 'de TechCrunch'}
      3. Filtre les ${options.articleCount || 5} articles les plus récents
      4. Utilise un AI Agent pour générer un contenu de newsletter engageant
      5. Formate en HTML professionnel
      6. Envoie la newsletter par email
    `;
    
    return this.generateWorkflow(description, {
      aiModel: options.aiModel || 'openai/gpt-4o-mini',
      ...options
    });
  }
  
  static async generateWebhookAPIWorkflow(options = {}) {
    const description = `
      Crée un workflow API REST qui :
      1. Reçoit des requêtes POST via webhook sur /api/${options.endpoint || 'process'}
      2. Valide les données entrantes
      3. Traite les données ${options.processing || 'avec transformation personnalisée'}
      4. Retourne une réponse JSON avec le résultat
    `;
    
    return this.generateWorkflow(description, {
      aiModel: options.aiModel || 'openai/gpt-4o-mini',
      ...options
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION ONLY - Valider un workflow existant
  // ═══════════════════════════════════════════════════════════════════════════
  
  static validateWorkflow(workflow) {
    return AdvancedWorkflowValidator.validateAndFix(workflow);
  }
  
  static fixWorkflow(workflow) {
    const result = AdvancedWorkflowValidator.validateAndFix(workflow);
    return result.fixedWorkflow;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NODE DATABASE - Accès à la base de données des nœuds
  // ═══════════════════════════════════════════════════════════════════════════
  
  static getAvailableNodes() {
    return N8nNodesDatabase.getAllNodes();
  }
  
  static getNodeInfo(nodeType) {
    return N8nNodesDatabase.getNode(nodeType);
  }
  
  static getNodesByCategory(category) {
    return N8nNodesDatabase.getNodesByCategory(category);
  }
  
  static getRecommendedNodes(useCase) {
    return N8nNodesDatabase.getRecommendedNodesForUseCase(useCase);
  }
}

module.exports = UltimateAIGenerator;

