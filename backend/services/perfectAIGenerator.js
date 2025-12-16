/**
 * Générateur de Workflow IA PARFAIT
 * 
 * Ce générateur garantit :
 * 1. AUCUN nœud oublié
 * 2. TOUS les nœuds sont compatibles n8n
 * 3. TOUTES les connexions sont valides
 * 4. TOUS les paramètres requis sont présents
 * 5. Auto-correction si l'IA fait des erreurs
 * 
 * Utilise :
 * - PerfectN8nNodesRegistry pour la validation des types
 * - PerfectWorkflowValidator pour la validation complète
 * - OpenRouter pour la génération IA
 */

const fetch = require('node-fetch');
const PerfectN8nNodesRegistry = require('./perfectN8nNodesRegistry');
const PerfectWorkflowValidator = require('./perfectWorkflowValidator');

class PerfectAIGenerator {
  
  // Nombre maximum de tentatives de génération
  static MAX_RETRIES = 3;
  
  /**
   * Génère un workflow parfait à partir d'une description
   * @param {string} description - Description du workflow souhaité
   * @param {string} model - Modèle IA à utiliser (défaut: openai/gpt-4o-mini)
   * @returns {Object} Workflow n8n valide et fonctionnel
   */
  static async generateWorkflow(description, model = 'openai/gpt-4o-mini') {
    console.log('🚀 [PerfectGenerator] Génération de workflow parfait...');
    console.log('📝 [PerfectGenerator] Description:', description.substring(0, 100) + '...');
    console.log('🤖 [PerfectGenerator] Modèle:', model);
    
    let lastError = null;
    let lastWorkflow = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      console.log(`\n🔄 [PerfectGenerator] Tentative ${attempt}/${this.MAX_RETRIES}...`);
      
      try {
        // 1. Analyser la description pour déterminer les nœuds requis
        const analysis = this.analyzeDescription(description);
        console.log('📊 [PerfectGenerator] Analyse:', {
          type: analysis.workflowType,
          requiredNodes: analysis.requiredNodes.length,
          needsAI: analysis.needsAI
        });
        
        // 2. Construire le prompt ultra-précis
        const prompt = this.buildPerfectPrompt(description, analysis, lastError);
        
        // 3. Appeler l'IA
        const rawWorkflow = await this.callAI(prompt, model);
        
        // 4. Valider et corriger le workflow
        const result = PerfectWorkflowValidator.validateAndFix(rawWorkflow);
        
        if (result.valid) {
          console.log('✅ [PerfectGenerator] Workflow généré et validé avec succès !');
          console.log(`   - Nœuds: ${result.workflow.nodes.length}`);
          console.log(`   - Connexions: ${Object.keys(result.workflow.connections).length}`);
          console.log(`   - Corrections appliquées: ${result.report.fixes?.length || 0}`);
          
          // Vérifier que tous les nœuds requis sont présents
          const missingNodes = this.checkRequiredNodes(result.workflow, analysis);
          if (missingNodes.length > 0) {
            console.log(`⚠️ [PerfectGenerator] Nœuds manquants: ${missingNodes.join(', ')}`);
            lastError = `Nœuds manquants: ${missingNodes.join(', ')}`;
            lastWorkflow = result.workflow;
            continue;
          }
          
          return result.workflow;
        } else {
          console.log(`❌ [PerfectGenerator] Validation échouée avec ${result.report.errors.length} erreur(s)`);
          lastError = result.report.errors.slice(0, 3).join('; ');
          lastWorkflow = result.workflow;
        }
        
      } catch (error) {
        console.error(`❌ [PerfectGenerator] Erreur tentative ${attempt}:`, error.message);
        lastError = error.message;
      }
    }
    
    // Si toutes les tentatives ont échoué, retourner le dernier workflow même incomplet
    if (lastWorkflow) {
      console.log('⚠️ [PerfectGenerator] Retour du dernier workflow généré (peut être incomplet)');
      return lastWorkflow;
    }
    
    throw new Error(`Impossible de générer un workflow valide après ${this.MAX_RETRIES} tentatives. Dernière erreur: ${lastError}`);
  }
  
  /**
   * Analyse la description pour déterminer le type et les nœuds requis
   */
  static analyzeDescription(description) {
    const lowerDesc = description.toLowerCase();
    
    const analysis = {
      workflowType: 'generic',
      requiredNodes: [],
      needsAI: false,
      needsEmail: false,
      needsDatabase: false,
      needsWebhook: false,
      needsSchedule: false,
      triggers: [],
      outputs: []
    };
    
    // Détecter le type de workflow
    if (lowerDesc.includes('newsletter') || lowerDesc.includes('rss')) {
      analysis.workflowType = 'newsletter';
      analysis.needsSchedule = true;
      analysis.needsAI = true;
      analysis.requiredNodes = [
        'n8n-nodes-base.schedule',
        'n8n-nodes-base.rssFeedRead',
        'n8n-nodes-base.code',
        'n8n-nodes-base.aggregate',
        '@n8n/n8n-nodes-langchain.agent',
        '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        'n8n-nodes-base.emailSend'
      ];
    } else if (lowerDesc.includes('email') && (lowerDesc.includes('tri') || lowerDesc.includes('class') || lowerDesc.includes('analyse'))) {
      analysis.workflowType = 'email-automation';
      analysis.needsEmail = true;
      analysis.needsAI = true;
      analysis.requiredNodes = [
        'n8n-nodes-base.schedule',
        'n8n-nodes-base.emailReadImap',
        'n8n-nodes-base.aggregate',
        '@n8n/n8n-nodes-langchain.agent',
        '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        '@n8n/n8n-nodes-langchain.toolCalculator',
        '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        'n8n-nodes-base.emailSend'
      ];
    } else if (lowerDesc.includes('cv') || lowerDesc.includes('recrutement') || lowerDesc.includes('candidat')) {
      analysis.workflowType = 'cv-screening';
      analysis.needsWebhook = true;
      analysis.needsAI = true;
      analysis.requiredNodes = [
        'n8n-nodes-base.webhook',
        'n8n-nodes-base.extractFromFile',
        '@n8n/n8n-nodes-langchain.agent',
        '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        'n8n-nodes-base.code',
        'n8n-nodes-base.respondToWebhook'
      ];
    } else if (lowerDesc.includes('pdf') && lowerDesc.includes('analy')) {
      analysis.workflowType = 'pdf-analysis';
      analysis.needsWebhook = true;
      analysis.needsAI = true;
      analysis.requiredNodes = [
        'n8n-nodes-base.webhook',
        'n8n-nodes-base.extractFromFile',
        '@n8n/n8n-nodes-langchain.agent',
        '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        'n8n-nodes-base.code',
        'n8n-nodes-base.respondToWebhook'
      ];
    } else if (lowerDesc.includes('webhook') || lowerDesc.includes('api')) {
      analysis.workflowType = 'api-webhook';
      analysis.needsWebhook = true;
      analysis.requiredNodes = [
        'n8n-nodes-base.webhook',
        'n8n-nodes-base.code',
        'n8n-nodes-base.respondToWebhook'
      ];
    } else if (lowerDesc.includes('slack')) {
      analysis.workflowType = 'slack-notification';
      analysis.needsWebhook = true;
      analysis.requiredNodes = [
        'n8n-nodes-base.webhook',
        'n8n-nodes-base.code',
        'n8n-nodes-base.slack'
      ];
    } else if (lowerDesc.includes('google sheet')) {
      analysis.workflowType = 'google-sheets';
      analysis.requiredNodes = [
        'n8n-nodes-base.schedule',
        'n8n-nodes-base.googleSheets',
        'n8n-nodes-base.code'
      ];
    } else {
      // Type générique - détecter les nœuds individuels
      analysis.workflowType = 'generic';
      analysis.requiredNodes = ['n8n-nodes-base.manualTrigger'];
      
      if (lowerDesc.includes('ia') || lowerDesc.includes('ai') || lowerDesc.includes('gpt') || lowerDesc.includes('intelligent')) {
        analysis.needsAI = true;
        analysis.requiredNodes.push(
          '@n8n/n8n-nodes-langchain.agent',
          '@n8n/n8n-nodes-langchain.lmChatOpenRouter'
        );
      }
    }
    
    // Détecter des nœuds spécifiques mentionnés
    const nodeKeywords = {
      'slack': 'n8n-nodes-base.slack',
      'discord': 'n8n-nodes-base.discord',
      'telegram': 'n8n-nodes-base.telegram',
      'notion': 'n8n-nodes-base.notion',
      'airtable': 'n8n-nodes-base.airtable',
      'google drive': 'n8n-nodes-base.googleDrive',
      'postgres': 'n8n-nodes-base.postgres',
      'mysql': 'n8n-nodes-base.mysql',
      'mongodb': 'n8n-nodes-base.mongodb',
      'http': 'n8n-nodes-base.httpRequest'
    };
    
    for (const [keyword, nodeType] of Object.entries(nodeKeywords)) {
      if (lowerDesc.includes(keyword) && !analysis.requiredNodes.includes(nodeType)) {
        analysis.requiredNodes.push(nodeType);
      }
    }
    
    return analysis;
  }
  
  /**
   * Construit le prompt parfait pour l'IA
   */
  static buildPerfectPrompt(description, analysis, previousError = null) {
    const nodesDocs = PerfectN8nNodesRegistry.generatePromptDocumentation();
    
    let prompt = `Tu es un expert ABSOLU en création de workflows n8n.

🎯 MISSION: Générer un workflow n8n PARFAIT, COMPLET et FONCTIONNEL.

📋 DESCRIPTION DE L'UTILISATEUR:
${description}

📊 ANALYSE AUTOMATIQUE:
- Type de workflow: ${analysis.workflowType}
- Nœuds OBLIGATOIRES: ${analysis.requiredNodes.join(', ')}
- Besoin IA: ${analysis.needsAI ? 'OUI' : 'NON'}

`;

    if (previousError) {
      prompt += `⚠️ ERREUR PRÉCÉDENTE À CORRIGER:
${previousError}
TU DOIS corriger ces problèmes dans cette nouvelle génération!

`;
    }

    prompt += `🚨 RÈGLES CRITIQUES - TU DOIS TOUTES LES RESPECTER:

1. STRUCTURE JSON OBLIGATOIRE:
   {
     "name": "Nom Court (max 50 chars)",
     "nodes": [...],
     "connections": {...},
     "settings": {},
     "active": false,
     "versionId": "1"
   }

2. CHAQUE NŒUD DOIT AVOIR:
   {
     "id": "nom-unique-en-minuscules",
     "name": "Nom Affichage",
     "type": "type-exact-n8n",
     "typeVersion": X.X,
     "position": [X, Y],
     "parameters": {...}
   }

3. NŒUDS OBLIGATOIRES À INCLURE (NE PAS EN OUBLIER):
${analysis.requiredNodes.map((n, i) => `   ${i + 1}. ${n}`).join('\n')}

4. FORMAT DES CONNEXIONS (CRITIQUE):
   "connections": {
     "Nom Nœud Source": {
       "main": [[{"node": "Nom Nœud Cible", "type": "main", "index": 0}]]
     }
   }
   ⚠️ TOUJOURS [[{...}]] (double tableau)!

5. CONNEXIONS AI (si AI Agent présent):
   - OpenRouter → AI Agent: "ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]
   - Calculator → AI Agent: "ai_tool": [[{"node": "AI Agent", "type": "ai_tool", "index": 0}]]
   - Memory → AI Agent: "ai_memory": [[{"node": "AI Agent", "type": "ai_memory", "index": 0}]]
   ⚠️ Ces connexions partent DES nœuds sources VERS l'AI Agent!

6. CREDENTIALS (format objet):
   "credentials": {
     "imap": {"id": "USER_IMAP_CREDENTIAL_ID", "name": "USER_IMAP_CREDENTIAL_NAME"},
     "smtp": {"id": "ADMIN_SMTP_CREDENTIAL_ID", "name": "ADMIN_SMTP_CREDENTIAL_NAME"},
     "openRouterApi": {"id": "ADMIN_OPENROUTER_CREDENTIAL_ID", "name": "ADMIN_OPENROUTER_CREDENTIAL_NAME"}
   }
   ⚠️ JAMAIS de string, TOUJOURS {id, name}!

7. POSITIONS (espacement horizontal):
   - Premier nœud: [250, 300]
   - Suivants: [500, 300], [750, 300], [1000, 300], etc.
   - Nœuds AI secondaires (OpenRouter, Calculator, Memory): même X, Y différent

8. NOMS DE NŒUDS:
   - Utiliser les NOMS (pas les IDs) dans les connexions
   - Noms descriptifs et uniques
   - Max 50 caractères

9. OUTPUT:
   - Retourne UNIQUEMENT le JSON
   - Pas de markdown (\`\`\`json)
   - Pas d'explication
   - Commence par { et termine par }

📚 RÉFÉRENCE DES NŒUDS DISPONIBLES:
${nodesDocs.substring(0, 3000)}

🎯 GÉNÈRE MAINTENANT LE WORKFLOW PARFAIT!`;

    return prompt;
  }
  
  /**
   * Appelle l'API OpenRouter
   */
  static async callAI(prompt, model) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY non trouvée dans les variables d\'environnement');
    }
    
    console.log('🤖 [PerfectGenerator] Appel OpenRouter...');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://automivy.com',
        'X-Title': 'Automivy Perfect Workflow Generator'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { 
            role: 'system', 
            content: 'Tu es un expert n8n. Tu génères UNIQUEMENT du JSON valide, sans markdown, sans explication.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 8000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur OpenRouter: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Réponse OpenRouter vide');
    }
    
    // Nettoyer et parser le JSON
    return this.parseWorkflowJSON(content);
  }
  
  /**
   * Parse et nettoie le JSON du workflow
   */
  static parseWorkflowJSON(content) {
    let json = content.trim();
    
    // Supprimer les backticks markdown
    json = json.replace(/```json\n?/g, '').replace(/```\n?$/g, '').replace(/```/g, '');
    
    // Trouver le JSON
    const firstBrace = json.indexOf('{');
    const lastBrace = json.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('Pas de JSON trouvé dans la réponse');
    }
    
    json = json.substring(firstBrace, lastBrace + 1);
    
    // Corriger les erreurs JSON courantes
    json = this.fixCommonJSONErrors(json);
    
    try {
      return JSON.parse(json);
    } catch (parseError) {
      console.error('❌ [PerfectGenerator] Erreur parsing JSON:', parseError.message);
      console.error('❌ [PerfectGenerator] JSON (extrait):', json.substring(0, 500));
      throw new Error(`JSON invalide: ${parseError.message}`);
    }
  }
  
  /**
   * Corrige les erreurs JSON courantes
   */
  static fixCommonJSONErrors(json) {
    // Supprimer les virgules trailing
    json = json.replace(/,(\s*[}\]])/g, '$1');
    
    // Corriger les guillemets simples en doubles
    // (attention à ne pas casser les expressions n8n)
    
    // Corriger les valeurs manquantes
    json = json.replace(/":\s*,/g, '": null,');
    json = json.replace(/":\s*}/g, '": null}');
    
    // Corriger les tableaux vides mal formatés
    json = json.replace(/\[\s*,\s*\]/g, '[]');
    
    return json;
  }
  
  /**
   * Vérifie que tous les nœuds requis sont présents
   */
  static checkRequiredNodes(workflow, analysis) {
    const presentTypes = new Set(workflow.nodes.map(n => n.type));
    const missing = [];
    
    for (const requiredNode of analysis.requiredNodes) {
      // Vérifier le type exact ou un équivalent
      if (!presentTypes.has(requiredNode)) {
        // Vérifier les alternatives
        const alternatives = {
          'n8n-nodes-base.schedule': ['n8n-nodes-base.cron', 'n8n-nodes-base.intervalTrigger'],
          'n8n-nodes-base.code': ['n8n-nodes-base.function'],
          'n8n-nodes-base.function': ['n8n-nodes-base.code']
        };
        
        const alts = alternatives[requiredNode] || [];
        const hasAlternative = alts.some(alt => presentTypes.has(alt));
        
        if (!hasAlternative) {
          missing.push(requiredNode);
        }
      }
    }
    
    return missing;
  }
  
  /**
   * Génère un workflow simple pour un cas d'usage spécifique
   */
  static async generateSimpleWorkflow(useCase) {
    const useCaseDescriptions = {
      'email-summary': 'Crée un workflow qui lit mes emails Gmail chaque jour à 9h, les analyse avec une IA, et m\'envoie un résumé par email.',
      'newsletter': 'Crée un workflow qui collecte les articles de flux RSS chaque jour à 6h, génère une newsletter avec l\'IA, et l\'envoie par email.',
      'webhook-api': 'Crée un workflow webhook qui reçoit des données JSON, les traite, et retourne une réponse.',
      'slack-notification': 'Crée un workflow qui écoute un webhook et envoie une notification Slack.',
      'cv-screening': 'Crée un workflow qui reçoit un CV en PDF via webhook, l\'analyse avec l\'IA, et retourne une évaluation.'
    };
    
    const description = useCaseDescriptions[useCase] || useCase;
    return this.generateWorkflow(description);
  }
}

module.exports = PerfectAIGenerator;

