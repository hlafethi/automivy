// ═══════════════════════════════════════════════════════════════════════════════
// ULTIMATE PROMPT BUILDER - Le meilleur système de prompts pour générer des workflows n8n
// ═══════════════════════════════════════════════════════════════════════════════
// Ce service génère des prompts ultra-optimisés avec :
// - Exemples concrets de workflows fonctionnels
// - Règles strictes de validation JSON
// - Patterns de connexion prouvés
// - Documentation complète des nœuds
// ═══════════════════════════════════════════════════════════════════════════════

const N8nNodesDatabase = require('./n8nNodesDatabase');

class UltimatePromptBuilder {

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOW EXAMPLES - Exemples de workflows fonctionnels pour l'apprentissage
  // ═══════════════════════════════════════════════════════════════════════════
  static WORKFLOW_EXAMPLES = {
    emailSummary: {
      name: "Email Summary Workflow",
      description: "Récupère les emails, les analyse avec l'IA et envoie un résumé",
      workflow: {
        name: "Daily Email Summary",
        nodes: [
          {
            id: "schedule-trigger",
            name: "Schedule Trigger",
            type: "n8n-nodes-base.schedule",
            typeVersion: 1.2,
            position: [250, 300],
            parameters: {
              rule: {
                interval: [{ field: "cronExpression", cronExpression: "0 9 * * *" }]
              }
            }
          },
          {
            id: "imap-read",
            name: "Read Emails",
            type: "n8n-nodes-base.emailReadImap",
            typeVersion: 2.1,
            position: [500, 300],
            parameters: {
              mailbox: "INBOX",
              format: "simple",
              options: { forceReconnect: true }
            },
            credentials: {
              imap: { id: "USER_IMAP_CREDENTIAL_ID", name: "USER_IMAP_CREDENTIAL_NAME" }
            }
          },
          {
            id: "aggregate-emails",
            name: "Aggregate Emails",
            type: "n8n-nodes-base.aggregate",
            typeVersion: 1,
            position: [750, 300],
            parameters: {
              aggregate: "aggregateAllItemData",
              destinationFieldName: "data",
              include: "allFields"
            }
          },
          {
            id: "openrouter-model",
            name: "OpenRouter Chat Model",
            type: "@n8n/n8n-nodes-langchain.lmChatOpenRouter",
            typeVersion: 1,
            position: [750, 500],
            parameters: {
              model: "openai/gpt-4o-mini",
              temperature: 0.3,
              maxTokens: 4000
            },
            credentials: {
              openRouterApi: { id: "ADMIN_OPENROUTER_CREDENTIAL_ID", name: "ADMIN_OPENROUTER_CREDENTIAL_NAME" }
            }
          },
          {
            id: "calculator-tool",
            name: "Calculator Tool",
            type: "@n8n/n8n-nodes-langchain.toolCalculator",
            typeVersion: 1,
            position: [750, 650],
            parameters: {}
          },
          {
            id: "memory-buffer",
            name: "Buffer Window Memory",
            type: "@n8n/n8n-nodes-langchain.memoryBufferWindow",
            typeVersion: 1.2,
            position: [750, 800],
            parameters: {
              sessionId: "={{ $json.sessionId || 'email-summary' }}",
              contextWindowLength: 10
            }
          },
          {
            id: "ai-agent",
            name: "AI Agent",
            type: "@n8n/n8n-nodes-langchain.agent",
            typeVersion: 1.7,
            position: [1000, 300],
            parameters: {
              promptType: "define",
              text: "Analyse les emails suivants et crée un résumé par priorité:\\n\\n{{ $json.data.toJsonString() }}\\n\\nFormat demandé:\\n- 🔴 Urgent\\n- 🟠 Important\\n- 🟢 Normal",
              options: {
                systemMessage: "Tu es un assistant expert en gestion des emails. Tu analyses les emails et les classes par priorité avec précision.",
                maxIterations: 10
              }
            }
          },
          {
            id: "format-email",
            name: "Format Email",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1250, 300],
            parameters: {
              mode: "runOnceForAllItems",
              jsCode: "const summary = items[0].json.output || items[0].json.text || 'Aucun résumé disponible';\\nreturn [{\\n  json: {\\n    subject: 'Résumé quotidien de vos emails',\\n    htmlContent: `<h1>📧 Résumé de vos emails</h1><div>${summary.replace(/\\\\n/g, '<br>')}</div>`,\\n    timestamp: new Date().toISOString()\\n  }\\n}];"
            }
          },
          {
            id: "send-email",
            name: "Send Summary Email",
            type: "n8n-nodes-base.emailSend",
            typeVersion: 2.1,
            position: [1500, 300],
            parameters: {
              fromEmail: "noreply@automivy.com",
              toEmail: "={{USER_EMAIL}}",
              subject: "={{ $json.subject }}",
              emailType: "html",
              message: "={{ $json.htmlContent }}",
              options: {}
            },
            credentials: {
              smtp: { id: "ADMIN_SMTP_CREDENTIAL_ID", name: "ADMIN_SMTP_CREDENTIAL_NAME" }
            }
          }
        ],
        connections: {
          "Schedule Trigger": { main: [[{ node: "Read Emails", type: "main", index: 0 }]] },
          "Read Emails": { main: [[{ node: "Aggregate Emails", type: "main", index: 0 }]] },
          "Aggregate Emails": { main: [[{ node: "AI Agent", type: "main", index: 0 }]] },
          "OpenRouter Chat Model": { ai_languageModel: [[{ node: "AI Agent", type: "ai_languageModel", index: 0 }]] },
          "Calculator Tool": { ai_tool: [[{ node: "AI Agent", type: "ai_tool", index: 0 }]] },
          "Buffer Window Memory": { ai_memory: [[{ node: "AI Agent", type: "ai_memory", index: 0 }]] },
          "AI Agent": { main: [[{ node: "Format Email", type: "main", index: 0 }]] },
          "Format Email": { main: [[{ node: "Send Summary Email", type: "main", index: 0 }]] }
        },
        settings: {},
        active: false,
        versionId: "1"
      }
    },
    
    newsletter: {
      name: "Newsletter Generator",
      description: "Génère une newsletter à partir de flux RSS",
      workflow: {
        name: "Daily Tech Newsletter",
        nodes: [
          {
            id: "schedule-trigger",
            name: "Daily Schedule",
            type: "n8n-nodes-base.schedule",
            typeVersion: 1.2,
            position: [250, 300],
            parameters: {
              rule: {
                interval: [{ field: "cronExpression", cronExpression: "0 6 * * *" }]
              }
            }
          },
          {
            id: "rss-feed",
            name: "Read RSS Feeds",
            type: "n8n-nodes-base.rssFeed",
            typeVersion: 1.1,
            position: [500, 300],
            parameters: {
              url: "https://techcrunch.com/feed/",
              options: {}
            }
          },
          {
            id: "filter-articles",
            name: "Filter Recent Articles",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [750, 300],
            parameters: {
              mode: "runOnceForAllItems",
              jsCode: "const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);\\nconst recentArticles = items\\n  .filter(item => new Date(item.json.pubDate) > yesterday)\\n  .slice(0, 5);\\nreturn recentArticles;"
            }
          },
          {
            id: "aggregate-articles",
            name: "Aggregate Articles",
            type: "n8n-nodes-base.aggregate",
            typeVersion: 1,
            position: [1000, 300],
            parameters: {
              aggregate: "aggregateAllItemData",
              destinationFieldName: "articles",
              include: "allFields"
            }
          },
          {
            id: "openrouter-model",
            name: "OpenRouter Chat Model",
            type: "@n8n/n8n-nodes-langchain.lmChatOpenRouter",
            typeVersion: 1,
            position: [1000, 500],
            parameters: {
              model: "openai/gpt-4o-mini",
              temperature: 0.5,
              maxTokens: 4000
            },
            credentials: {
              openRouterApi: { id: "ADMIN_OPENROUTER_CREDENTIAL_ID", name: "ADMIN_OPENROUTER_CREDENTIAL_NAME" }
            }
          },
          {
            id: "ai-agent",
            name: "Newsletter AI",
            type: "@n8n/n8n-nodes-langchain.agent",
            typeVersion: 1.7,
            position: [1250, 300],
            parameters: {
              promptType: "define",
              text: "Génère une newsletter tech engageante à partir de ces articles:\\n\\n{{ $json.articles.toJsonString() }}\\n\\nFormat:\\n- Titre accrocheur\\n- Résumé de chaque article (2-3 phrases)\\n- Points clés à retenir",
              options: {
                systemMessage: "Tu es un rédacteur de newsletter tech. Tu écris de manière engageante et concise.",
                maxIterations: 10
              }
            }
          },
          {
            id: "format-newsletter",
            name: "Format Newsletter HTML",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1500, 300],
            parameters: {
              mode: "runOnceForAllItems",
              jsCode: "const content = items[0].json.output || items[0].json.text;\\nconst html = `\\n<html>\\n<body style=\\\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\\\">\\n  <h1 style=\\\"color: #333;\\\">🚀 Newsletter Tech du Jour</h1>\\n  <div style=\\\"line-height: 1.6;\\\">${content.replace(/\\\\n/g, '<br>')}</div>\\n  <hr>\\n  <p style=\\\"color: #666; font-size: 12px;\\\">Généré par Automivy AI</p>\\n</body>\\n</html>`;\\nreturn [{ json: { html, subject: 'Newsletter Tech - ' + new Date().toLocaleDateString('fr-FR') } }];"
            }
          },
          {
            id: "send-newsletter",
            name: "Send Newsletter",
            type: "n8n-nodes-base.emailSend",
            typeVersion: 2.1,
            position: [1750, 300],
            parameters: {
              fromEmail: "newsletter@automivy.com",
              toEmail: "={{USER_EMAIL}}",
              subject: "={{ $json.subject }}",
              emailType: "html",
              message: "={{ $json.html }}",
              options: {}
            },
            credentials: {
              smtp: { id: "ADMIN_SMTP_CREDENTIAL_ID", name: "ADMIN_SMTP_CREDENTIAL_NAME" }
            }
          }
        ],
        connections: {
          "Daily Schedule": { main: [[{ node: "Read RSS Feeds", type: "main", index: 0 }]] },
          "Read RSS Feeds": { main: [[{ node: "Filter Recent Articles", type: "main", index: 0 }]] },
          "Filter Recent Articles": { main: [[{ node: "Aggregate Articles", type: "main", index: 0 }]] },
          "Aggregate Articles": { main: [[{ node: "Newsletter AI", type: "main", index: 0 }]] },
          "OpenRouter Chat Model": { ai_languageModel: [[{ node: "Newsletter AI", type: "ai_languageModel", index: 0 }]] },
          "Newsletter AI": { main: [[{ node: "Format Newsletter HTML", type: "main", index: 0 }]] },
          "Format Newsletter HTML": { main: [[{ node: "Send Newsletter", type: "main", index: 0 }]] }
        },
        settings: {},
        active: false,
        versionId: "1"
      }
    },
    
    aiGeneration: {
      name: "AI Generation Workflow",
      description: "Génère du contenu avec AI Agent et LLM gratuit",
      workflow: {
        name: "AI Content Generator",
        nodes: [
          {
            id: "manual-trigger",
            name: "Manual Trigger",
            type: "n8n-nodes-base.manualTrigger",
            typeVersion: 1,
            position: [250, 300],
            parameters: {}
          },
          {
            id: "openrouter-model",
            name: "OpenRouter Chat Model",
            type: "@n8n/n8n-nodes-langchain.lmChatOpenRouter",
            typeVersion: 1,
            position: [500, 500],
            parameters: {
              model: "meta-llama/llama-3.1-8b-instruct",
              temperature: 0.5,
              maxTokens: 4000
            },
            credentials: {
              openRouterApi: { id: "ADMIN_OPENROUTER_CREDENTIAL_ID", name: "ADMIN_OPENROUTER_CREDENTIAL_NAME" }
            }
          },
          {
            id: "calculator-tool",
            name: "Calculator Tool",
            type: "@n8n/n8n-nodes-langchain.toolCalculator",
            typeVersion: 1,
            position: [500, 650],
            parameters: {}
          },
          {
            id: "memory-buffer",
            name: "Buffer Window Memory",
            type: "@n8n/n8n-nodes-langchain.memoryBufferWindow",
            typeVersion: 1.2,
            position: [500, 800],
            parameters: {
              sessionId: "={{ $json.sessionId || 'ai-gen' }}",
              contextWindowLength: 10
            }
          },
          {
            id: "ai-agent",
            name: "AI Agent",
            type: "@n8n/n8n-nodes-langchain.agent",
            typeVersion: 1.7,
            position: [750, 300],
            parameters: {
              promptType: "define",
              text: "Génère un contenu créatif basé sur la demande de l'utilisateur. Sois détaillé et professionnel.",
              options: {
                systemMessage: "Tu es un assistant créatif expert. Tu génères du contenu de haute qualité.",
                maxIterations: 10
              }
            }
          },
          {
            id: "format-output",
            name: "Format Output",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1000, 300],
            parameters: {
              mode: "runOnceForAllItems",
              jsCode: "const content = items[0].json.output || items[0].json.text || 'Contenu généré';\\nreturn [{ json: { content, generatedAt: new Date().toISOString() } }];"
            }
          }
        ],
        connections: {
          "Manual Trigger": { main: [[{ node: "AI Agent", type: "main", index: 0 }]] },
          "OpenRouter Chat Model": { ai_languageModel: [[{ node: "AI Agent", type: "ai_languageModel", index: 0 }]] },
          "Calculator Tool": { ai_tool: [[{ node: "AI Agent", type: "ai_tool", index: 0 }]] },
          "Buffer Window Memory": { ai_memory: [[{ node: "AI Agent", type: "ai_memory", index: 0 }]] },
          "AI Agent": { main: [[{ node: "Format Output", type: "main", index: 0 }]] }
        },
        settings: {},
        active: false,
        versionId: "1"
      }
    },
    
    webhookApi: {
      name: "Webhook API Workflow",
      description: "API REST simple avec webhook et réponse",
      workflow: {
        name: "Simple REST API",
        nodes: [
          {
            id: "webhook-trigger",
            name: "API Endpoint",
            type: "n8n-nodes-base.webhook",
            typeVersion: 2,
            position: [250, 300],
            parameters: {
              httpMethod: "POST",
              path: "api/process",
              responseMode: "responseNode",
              options: {}
            }
          },
          {
            id: "validate-input",
            name: "Validate Input",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [500, 300],
            parameters: {
              mode: "runOnceForAllItems",
              jsCode: "const body = items[0].json.body || {};\\nif (!body.data) {\\n  throw new Error('Missing required field: data');\\n}\\nreturn [{ json: { ...body, validated: true, timestamp: new Date().toISOString() } }];"
            }
          },
          {
            id: "process-data",
            name: "Process Data",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [750, 300],
            parameters: {
              mode: "runOnceForAllItems",
              jsCode: "const data = items[0].json;\\nconst result = {\\n  success: true,\\n  processedData: data.data,\\n  processedAt: new Date().toISOString(),\\n  id: Math.random().toString(36).substr(2, 9)\\n};\\nreturn [{ json: result }];"
            }
          },
          {
            id: "respond-webhook",
            name: "API Response",
            type: "n8n-nodes-base.respondToWebhook",
            typeVersion: 1.1,
            position: [1000, 300],
            parameters: {
              respondWith: "json",
              responseBody: "={{ $json }}",
              options: {
                responseCode: 200,
                responseHeaders: {
                  entries: [{ name: "Content-Type", value: "application/json" }]
                }
              }
            }
          }
        ],
        connections: {
          "API Endpoint": { main: [[{ node: "Validate Input", type: "main", index: 0 }]] },
          "Validate Input": { main: [[{ node: "Process Data", type: "main", index: 0 }]] },
          "Process Data": { main: [[{ node: "API Response", type: "main", index: 0 }]] }
        },
        settings: {},
        active: false,
        versionId: "1"
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN PROMPT BUILDER - Construction du prompt principal
  // ═══════════════════════════════════════════════════════════════════════════
  
  static buildUltimatePrompt(description, analysis, context = {}) {
    const systemPrompt = this.buildSystemPrompt(analysis);
    const userPrompt = this.buildUserPrompt(description, analysis, context);
    
    return {
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.2,
      maxTokens: 12000,
      topP: 0.95
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM PROMPT - Prompt système ultra-détaillé
  // ═══════════════════════════════════════════════════════════════════════════
  
  static buildSystemPrompt(analysis) {
    const workflowType = analysis?.workflowType || 'generic';
    const relevantExample = this.getRelevantExample(workflowType);
    
    return `Tu es le MEILLEUR architecte de workflows n8n au monde. Tu crées des workflows PARFAITS, FONCTIONNELS et PRÊTS À DÉPLOYER.

═══════════════════════════════════════════════════════════════════════════════
🎯 MISSION CRITIQUE
═══════════════════════════════════════════════════════════════════════════════

Génère un workflow n8n COMPLET en JSON VALIDE qui répond EXACTEMENT à la demande de l'utilisateur.
Le workflow doit être UNIQUE, PERSONNALISÉ et FONCTIONNEL immédiatement.

═══════════════════════════════════════════════════════════════════════════════
⚠️ RÈGLES JSON ABSOLUES - VIOLATION = ÉCHEC
═══════════════════════════════════════════════════════════════════════════════

1. SORTIE PURE JSON:
   - Commence DIRECTEMENT par { et termine par }
   - AUCUN texte avant ou après le JSON
   - AUCUN markdown (\`\`\`json) 
   - AUCUN commentaire

2. VALEURS OBLIGATOIRES:
   - JAMAIS de valeur vide: ": ," ou ": " ou ": ."
   - Nombres: TOUJOURS une valeur (0, 1, 0.3, etc.)
   - Strings: TOUJOURS une valeur ("value")
   - Booléens: TOUJOURS true ou false
   - Arrays: TOUJOURS avec valeurs ([250, 300])
   - typeVersion: TOUJOURS un nombre (1, 1.2, 2.1)
   - position: TOUJOURS [x, y] avec nombres réels

3. STRUCTURE DES NODES:
   Chaque node DOIT avoir:
   - id: string unique (ex: "email-reader-abc1")
   - name: string descriptif
   - type: type exact du nœud
   - typeVersion: number (ex: 1.2)
   - position: [number, number] (ex: [500, 300])
   - parameters: objet avec paramètres complets

4. STRUCTURE DES CONNEXIONS:
   - Utilise les NOMS des nodes (pas les IDs)
   - Format: "Node Name": { "main": [[{...}]] }
   - Double tableau: [[{...}]] pas [{...}]
   - Chaque connexion: { node: "Nom", type: "main", index: 0 }

5. CONNEXIONS AI SPÉCIALES:
   - OpenRouter → AI Agent: type "ai_languageModel"
   - Tool → AI Agent: type "ai_tool"
   - Memory → AI Agent: type "ai_memory"
   - Direction: FROM source TO AI Agent

6. CREDENTIALS:
   - Format objet: { id: "...", name: "..." }
   - IMAP: USER_IMAP_CREDENTIAL_ID
   - SMTP: ADMIN_SMTP_CREDENTIAL_ID
   - OpenRouter: ADMIN_OPENROUTER_CREDENTIAL_ID

═══════════════════════════════════════════════════════════════════════════════
🚨 RÈGLE CRITIQUE AI AGENT - JAMAIS D'AI AGENT SANS LLM
═══════════════════════════════════════════════════════════════════════════════

SI tu utilises un @n8n/n8n-nodes-langchain.agent, tu DOIS OBLIGATOIREMENT inclure:

1. @n8n/n8n-nodes-langchain.lmChatOpenRouter avec ces paramètres:
   {
     "model": "meta-llama/llama-3.1-8b-instruct", // gratuit
     "temperature": 0.3,
     "maxTokens": 4000
   }
   credentials: { "openRouterApi": { "id": "ADMIN_OPENROUTER_CREDENTIAL_ID", "name": "ADMIN_OPENROUTER_CREDENTIAL_NAME" } }

2. @n8n/n8n-nodes-langchain.toolCalculator (paramètres vides {})

3. @n8n/n8n-nodes-langchain.memoryBufferWindow avec:
   {
     "sessionId": "={{ $json.sessionId || 'default' }}",
     "contextWindowLength": 10
   }

4. CONNEXIONS OBLIGATOIRES (dans l'objet connections):
   "OpenRouter Chat Model": { "ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]] }
   "Calculator Tool": { "ai_tool": [[{"node": "AI Agent", "type": "ai_tool", "index": 0}]] }
   "Buffer Window Memory": { "ai_memory": [[{"node": "AI Agent", "type": "ai_memory", "index": 0}]] }

⚠️ UN AI AGENT SANS LLM NE FONCTIONNE PAS! C'est une erreur fatale.

═══════════════════════════════════════════════════════════════════════════════
📋 TYPES DE NODES DISPONIBLES
═══════════════════════════════════════════════════════════════════════════════

${this.getNodeTypesReference()}

═══════════════════════════════════════════════════════════════════════════════
✅ EXEMPLE DE WORKFLOW FONCTIONNEL
═══════════════════════════════════════════════════════════════════════════════

${relevantExample ? JSON.stringify(relevantExample.workflow, null, 2) : this.getMinimalExample()}

═══════════════════════════════════════════════════════════════════════════════
🔍 VALIDATION PRÉ-SORTIE
═══════════════════════════════════════════════════════════════════════════════

Avant de générer, vérifie:
□ JSON valide sans erreurs de syntaxe
□ Tous les nodes ont id, name, type, typeVersion, position, parameters
□ Toutes les connexions utilisent les NOMS des nodes
□ Les connexions AI vont vers l'AI Agent
□ Les credentials sont des objets
□ Aucune valeur vide ou manquante
□ Le workflow correspond à la demande de l'utilisateur

GÉNÈRE MAINTENANT LE WORKFLOW PARFAIT!`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USER PROMPT - Prompt utilisateur avec contexte
  // ═══════════════════════════════════════════════════════════════════════════
  
  static buildUserPrompt(description, analysis, context = {}) {
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    const workflowType = analysis?.workflowType || 'generic';
    const requiredNodes = analysis?.requiredNodes || [];
    
    return `
═══════════════════════════════════════════════════════════════════════════════
📝 DEMANDE DE L'UTILISATEUR
═══════════════════════════════════════════════════════════════════════════════

${description}

═══════════════════════════════════════════════════════════════════════════════
🔍 ANALYSE DE LA DEMANDE
═══════════════════════════════════════════════════════════════════════════════

Type de workflow détecté: ${workflowType}
Complexité estimée: ${analysis?.complexity || 'medium'}

Nodes requis (TOUS obligatoires):
${requiredNodes.map(node => `  ✓ ${node}`).join('\n')}

${analysis?.triggers?.length > 0 ? `Trigger suggéré: ${analysis.triggers[0]}` : ''}

═══════════════════════════════════════════════════════════════════════════════
📊 CONTEXTE DE L'APPLICATION
═══════════════════════════════════════════════════════════════════════════════

${context.usageStats ? `
- Templates existants: ${context.usageStats.templates?.total_templates || 0}
- Workflows actifs: ${context.usageStats.workflows?.active_workflows || 0}
` : ''}

TOUS LES NŒUDS N8N DISPONIBLES (utilisez ces types de nœuds valides):
${context.popularNodes ? Object.keys(context.popularNodes).map(node => `  - ${node}`).join('\n') : '  - n8n-nodes-base.schedule\n  - n8n-nodes-base.emailReadImap\n  - @n8n/n8n-nodes-langchain.agent'}

═══════════════════════════════════════════════════════════════════════════════
⚙️ INSTRUCTIONS SPÉCIFIQUES
═══════════════════════════════════════════════════════════════════════════════

${this.getWorkflowTypeInstructions(workflowType)}

═══════════════════════════════════════════════════════════════════════════════
🆔 IDENTIFIANT UNIQUE: ${uniqueId}
═══════════════════════════════════════════════════════════════════════════════

Génère un workflow JSON COMPLET et UNIQUE basé sur la demande ci-dessus.
Commence directement par { et termine par }.`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS - Méthodes utilitaires
  // ═══════════════════════════════════════════════════════════════════════════
  
  static getRelevantExample(workflowType) {
    const typeMap = {
      'email-automation': this.WORKFLOW_EXAMPLES.emailSummary,
      'email-summary': this.WORKFLOW_EXAMPLES.emailSummary,
      'newsletter': this.WORKFLOW_EXAMPLES.newsletter,
      'api-webhook': this.WORKFLOW_EXAMPLES.webhookApi,
      'webhook': this.WORKFLOW_EXAMPLES.webhookApi,
      'ai-generation': this.WORKFLOW_EXAMPLES.aiGeneration,
      'generic': this.WORKFLOW_EXAMPLES.aiGeneration
    };
    return typeMap[workflowType] || this.WORKFLOW_EXAMPLES.aiGeneration;
  }
  
  static getMinimalExample() {
    return JSON.stringify({
      name: "Example Workflow",
      nodes: [
        {
          id: "trigger-1",
          name: "Start",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [250, 300],
          parameters: {}
        }
      ],
      connections: {},
      settings: {},
      active: false,
      versionId: "1"
    }, null, 2);
  }
  
  static getNodeTypesReference() {
    const categories = [
      { name: 'TRIGGERS', nodes: ['n8n-nodes-base.schedule', 'n8n-nodes-base.webhook', 'n8n-nodes-base.manualTrigger'] },
      { name: 'EMAIL', nodes: ['n8n-nodes-base.emailReadImap', 'n8n-nodes-base.emailSend', 'n8n-nodes-base.gmail'] },
      { name: 'AI', nodes: ['@n8n/n8n-nodes-langchain.agent', '@n8n/n8n-nodes-langchain.lmChatOpenRouter', '@n8n/n8n-nodes-langchain.toolCalculator', '@n8n/n8n-nodes-langchain.memoryBufferWindow'] },
      { name: 'DATA', nodes: ['n8n-nodes-base.aggregate', 'n8n-nodes-base.code', 'n8n-nodes-base.set', 'n8n-nodes-base.filter', 'n8n-nodes-base.switch'] },
      { name: 'HTTP', nodes: ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.respondToWebhook'] },
      { name: 'CONTENT', nodes: ['n8n-nodes-base.rssFeed', 'n8n-nodes-base.markdown'] }
    ];
    
    return categories.map(cat => {
      return `${cat.name}:\n${cat.nodes.map(n => `  - ${n}`).join('\n')}`;
    }).join('\n\n');
  }
  
  static getWorkflowTypeInstructions(workflowType) {
    const instructions = {
      'email-automation': `
Pour un workflow EMAIL:
1. Utilise n8n-nodes-base.schedule OU n8n-nodes-base.webhook comme trigger
2. Utilise n8n-nodes-base.emailReadImap pour lire les emails (credentials: imap)
3. Utilise n8n-nodes-base.aggregate avec destinationFieldName: "data"
4. Utilise @n8n/n8n-nodes-langchain.agent avec prompt {{ $json.data.toJsonString() }}
5. OBLIGATOIRE: Connecte OpenRouter Chat Model → AI Agent via ai_languageModel
6. Utilise n8n-nodes-base.emailSend pour envoyer (credentials: smtp ADMIN)`,
      
      'email-summary': `
Pour un workflow EMAIL SUMMARY:
1. Schedule Trigger → IMAP → Aggregate → AI Agent → Format → Send Email
2. L'Aggregate doit avoir: aggregate: "aggregateAllItemData", destinationFieldName: "data"
3. L'AI Agent prompt doit utiliser {{ $json.data.toJsonString() }}
4. OBLIGATOIRE: Ajoute OpenRouter Chat Model connecté à AI Agent via ai_languageModel
5. Le Format (Code node) transforme le résultat en HTML`,
      
      'newsletter': `
Pour un workflow NEWSLETTER:
1. Schedule Trigger → RSS Feed → Code (filter) → Aggregate → AI Agent → Format → Send Email
2. RSS Feed: url (string), pas urls (array)
3. Code node pour filtrer les articles récents
4. OBLIGATOIRE: Ajoute OpenRouter Chat Model connecté à AI Agent via ai_languageModel
5. AI Agent pour générer le contenu de la newsletter`,
      
      'pdf-analysis': `
Pour un workflow PDF:
1. Webhook Trigger → Extract From File → AI Agent → Format → Response/Email
2. Webhook avec responseMode: "responseNode"
3. Extract avec operation: "pdf"
4. OBLIGATOIRE: Ajoute OpenRouter Chat Model connecté à AI Agent via ai_languageModel
5. Terminer avec respondToWebhook`,
      
      'api-webhook': `
Pour un workflow API:
1. Webhook Trigger → Validate → Process → Response
2. Webhook avec httpMethod et responseMode: "responseNode"
3. Code nodes pour validation et traitement
4. respondToWebhook pour la réponse`,
      
      'ai-generation': `
Pour un workflow de GÉNÉRATION IA (vidéo, image, contenu):
1. Manual Trigger OU Webhook Trigger (pour génération à la demande)
2. OBLIGATOIRE: Ajoute ces nœuds IA connectés:
   - @n8n/n8n-nodes-langchain.lmChatOpenRouter (modèle LLM)
   - @n8n/n8n-nodes-langchain.agent (AI Agent)
   - @n8n/n8n-nodes-langchain.toolCalculator (outil)
   - @n8n/n8n-nodes-langchain.memoryBufferWindow (mémoire)
3. CONNEXIONS IA CRITIQUES:
   - OpenRouter Chat Model → AI Agent (connexion: ai_languageModel)
   - Calculator Tool → AI Agent (connexion: ai_tool)
   - Buffer Window Memory → AI Agent (connexion: ai_memory)
4. Pour génération VIDÉO: Utilise HTTP Request pour appeler une API externe (Runway, D-ID, etc.)
5. Pour GOOGLE DRIVE: Ajoute n8n-nodes-base.googleDrive avec operation "upload"
6. Le workflow complet doit être: Trigger → AI Agent (génère le script/prompt) → HTTP Request (API externe) → Google Drive (upload)`,
      
      'generic': `
INSTRUCTIONS GÉNÉRALES CRITIQUES:

1. Commence par un trigger approprié:
   - n8n-nodes-base.manualTrigger pour génération à la demande
   - n8n-nodes-base.schedule pour automation périodique
   - n8n-nodes-base.webhook pour API

2. SI LE WORKFLOW UTILISE L'IA (génération, analyse, résumé):
   OBLIGATOIRE - Ajoute TOUS ces nœuds:
   - @n8n/n8n-nodes-langchain.lmChatOpenRouter (le modèle LLM - INDISPENSABLE)
   - @n8n/n8n-nodes-langchain.agent (l'AI Agent)
   - @n8n/n8n-nodes-langchain.toolCalculator (outil de calcul)
   - @n8n/n8n-nodes-langchain.memoryBufferWindow (mémoire)
   
   CONNEXIONS AI OBLIGATOIRES:
   - "OpenRouter Chat Model": { "ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]] }
   - "Calculator Tool": { "ai_tool": [[{"node": "AI Agent", "type": "ai_tool", "index": 0}]] }
   - "Buffer Window Memory": { "ai_memory": [[{"node": "AI Agent", "type": "ai_memory", "index": 0}]] }

3. Pour les INTÉGRATIONS EXTERNES:
   - Google Drive: n8n-nodes-base.googleDrive avec credentials googleDriveOAuth2
   - Google Sheets: n8n-nodes-base.googleSheets avec credentials googleSheetsOAuth2
   - Slack: n8n-nodes-base.slack
   - API externes: n8n-nodes-base.httpRequest

4. Termine par une sortie appropriée (email, drive, webhook response, etc.)`
    };
    
    return instructions[workflowType] || instructions['generic'];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYSIS METHODS - Analyse de la description
  // ═══════════════════════════════════════════════════════════════════════════
  
  static analyzeDescription(description) {
    const lowerDesc = description.toLowerCase();
    
    // Détection du type de workflow
    let workflowType = 'generic';
    if (lowerDesc.includes('newsletter') || lowerDesc.includes('rss') || lowerDesc.includes('flux')) {
      workflowType = 'newsletter';
    } else if (lowerDesc.includes('email') && (lowerDesc.includes('summary') || lowerDesc.includes('résumé'))) {
      workflowType = 'email-summary';
    } else if (lowerDesc.includes('email') || lowerDesc.includes('mail') || lowerDesc.includes('imap')) {
      workflowType = 'email-automation';
    } else if (lowerDesc.includes('pdf') || lowerDesc.includes('document') || lowerDesc.includes('cv')) {
      workflowType = 'pdf-analysis';
    } else if (lowerDesc.includes('api') || lowerDesc.includes('webhook') || lowerDesc.includes('rest')) {
      workflowType = 'api-webhook';
    } else if (lowerDesc.includes('video') || lowerDesc.includes('vidéo') || lowerDesc.includes('image') || lowerDesc.includes('génère') || lowerDesc.includes('genere')) {
      workflowType = 'ai-generation';
    }
    
    // Détection des triggers
    const triggers = [];
    if (lowerDesc.includes('manuel') || lowerDesc.includes('manual')) {
      triggers.push('n8n-nodes-base.manualTrigger');
    }
    if (lowerDesc.includes('schedule') || lowerDesc.includes('quotidien') || lowerDesc.includes('daily') || 
        lowerDesc.includes('hourly') || lowerDesc.includes('heure') || lowerDesc.includes('cron')) {
      triggers.push('n8n-nodes-base.schedule');
    }
    if (lowerDesc.includes('webhook') || lowerDesc.includes('api') || lowerDesc.includes('http')) {
      triggers.push('n8n-nodes-base.webhook');
    }
    // Default: manuel pour génération, schedule pour automation
    if (triggers.length === 0) {
      if (workflowType === 'ai-generation') {
        triggers.push('n8n-nodes-base.manualTrigger');
      } else {
        triggers.push('n8n-nodes-base.schedule');
      }
    }
    
    // Détection des intégrations externes demandées
    const integrations = this.detectIntegrations(lowerDesc);
    
    // Nodes requis selon le type et intégrations
    const requiredNodes = this.getRequiredNodesForType(workflowType, triggers[0], integrations);
    
    // Complexité
    let complexity = 'simple';
    if (lowerDesc.includes('complex') || lowerDesc.includes('advanced') || requiredNodes.length > 6) {
      complexity = 'complex';
    } else if (requiredNodes.length > 4) {
      complexity = 'medium';
    }
    
    // Besoins AI - Détection améliorée
    const needsAI = lowerDesc.includes('ai') || lowerDesc.includes('ia') || lowerDesc.includes('agent') ||
                    lowerDesc.includes('analyse') || lowerDesc.includes('résumé') || lowerDesc.includes('summary') || 
                    lowerDesc.includes('intelligent') || lowerDesc.includes('génère') || lowerDesc.includes('genere') ||
                    lowerDesc.includes('llm') || lowerDesc.includes('gpt') || lowerDesc.includes('claude');
    
    // Choix du modèle LLM
    let aiModel = 'openai/gpt-4o-mini'; // Default payant mais pas cher
    if (lowerDesc.includes('gratuit') || lowerDesc.includes('free') || lowerDesc.includes('llama')) {
      aiModel = 'meta-llama/llama-3.1-8b-instruct'; // Gratuit sur OpenRouter
    }
    
    return {
      workflowType,
      triggers,
      requiredNodes,
      complexity,
      integrations,
      aiRequirements: {
        needsAI,
        aiType: needsAI ? 'conversational' : null,
        model: aiModel,
        needsMemory: needsAI,
        needsTools: needsAI
      },
      dataFlow: {
        input: triggers,
        output: this.detectOutputType(lowerDesc)
      }
    };
  }
  
  // Détecter les intégrations externes demandées
  static detectIntegrations(description) {
    const integrations = [];
    
    // Google integrations
    if (description.includes('drive') || description.includes('google drive')) {
      integrations.push('googleDrive');
    }
    if (description.includes('sheets') || description.includes('google sheets') || description.includes('spreadsheet')) {
      integrations.push('googleSheets');
    }
    if (description.includes('gmail')) {
      integrations.push('gmail');
    }
    
    // Storage/Database
    if (description.includes('notion')) {
      integrations.push('notion');
    }
    if (description.includes('airtable')) {
      integrations.push('airtable');
    }
    if (description.includes('postgres') || description.includes('database') || description.includes('base de données')) {
      integrations.push('postgres');
    }
    
    // Communication
    if (description.includes('slack')) {
      integrations.push('slack');
    }
    if (description.includes('discord')) {
      integrations.push('discord');
    }
    if (description.includes('telegram')) {
      integrations.push('telegram');
    }
    
    // Media generation APIs
    if (description.includes('video') || description.includes('vidéo')) {
      integrations.push('videoApi');
    }
    if (description.includes('image') && (description.includes('génère') || description.includes('genere') || description.includes('create'))) {
      integrations.push('imageApi');
    }
    
    return integrations;
  }
  
  static getRequiredNodesForType(workflowType, trigger, integrations = []) {
    const baseNodes = [trigger];
    
    const typeNodes = {
      'email-automation': [
        'n8n-nodes-base.emailReadImap',
        'n8n-nodes-base.aggregate',
        '@n8n/n8n-nodes-langchain.agent',
        '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        '@n8n/n8n-nodes-langchain.toolCalculator',
        '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        'n8n-nodes-base.code',
        'n8n-nodes-base.emailSend'
      ],
      'email-summary': [
        'n8n-nodes-base.emailReadImap',
        'n8n-nodes-base.aggregate',
        '@n8n/n8n-nodes-langchain.agent',
        '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        'n8n-nodes-base.code',
        'n8n-nodes-base.emailSend'
      ],
      'newsletter': [
        'n8n-nodes-base.rssFeed',
        'n8n-nodes-base.code',
        'n8n-nodes-base.aggregate',
        '@n8n/n8n-nodes-langchain.agent',
        '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        'n8n-nodes-base.emailSend'
      ],
      'pdf-analysis': [
        'n8n-nodes-base.extractFromFile',
        '@n8n/n8n-nodes-langchain.agent',
        '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        'n8n-nodes-base.code',
        'n8n-nodes-base.respondToWebhook'
      ],
      'api-webhook': [
        'n8n-nodes-base.code',
        'n8n-nodes-base.respondToWebhook'
      ],
      'ai-generation': [
        'n8n-nodes-base.httpRequest',
        '@n8n/n8n-nodes-langchain.agent',
        '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        '@n8n/n8n-nodes-langchain.toolCalculator',
        '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        'n8n-nodes-base.code'
      ],
      'generic': [
        '@n8n/n8n-nodes-langchain.agent',
        '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        'n8n-nodes-base.code'
      ]
    };
    
    let requiredNodes = [...baseNodes, ...(typeNodes[workflowType] || typeNodes['generic'])];
    
    // Ajouter les nœuds selon les intégrations détectées
    const integrationNodes = {
      'googleDrive': 'n8n-nodes-base.googleDrive',
      'googleSheets': 'n8n-nodes-base.googleSheets',
      'gmail': 'n8n-nodes-base.gmail',
      'notion': 'n8n-nodes-base.notion',
      'airtable': 'n8n-nodes-base.airtable',
      'postgres': 'n8n-nodes-base.postgres',
      'slack': 'n8n-nodes-base.slack',
      'discord': 'n8n-nodes-base.discord',
      'telegram': 'n8n-nodes-base.telegram',
      'videoApi': 'n8n-nodes-base.httpRequest',
      'imageApi': 'n8n-nodes-base.httpRequest'
    };
    
    integrations.forEach(integration => {
      const node = integrationNodes[integration];
      if (node && !requiredNodes.includes(node)) {
        requiredNodes.push(node);
      }
    });
    
    return requiredNodes;
  }
  
  static detectOutputType(description) {
    const outputs = [];
    if (description.includes('email') || description.includes('mail') || description.includes('envoie')) {
      outputs.push('email');
    }
    if (description.includes('api') || description.includes('webhook') || description.includes('réponse')) {
      outputs.push('webhook');
    }
    if (description.includes('slack')) {
      outputs.push('slack');
    }
    if (description.includes('database') || description.includes('base de données') || description.includes('postgres')) {
      outputs.push('database');
    }
    return outputs.length > 0 ? outputs : ['email'];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTURED SUMMARY - Génère un résumé structuré
  // ═══════════════════════════════════════════════════════════════════════════
  
  static generateStructuredSummary(analysis) {
    return {
      workflowType: analysis.workflowType,
      complexity: analysis.complexity,
      nodeSequence: analysis.requiredNodes,
      triggerType: analysis.triggers[0],
      hasAI: analysis.aiRequirements.needsAI,
      outputTypes: analysis.dataFlow.output
    };
  }
}

module.exports = UltimatePromptBuilder;

