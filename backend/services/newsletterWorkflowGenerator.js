// Service de génération de workflows Newsletter avec webhook et gestion des crédits
// Basé sur le template JSON fourni : Newsletter Generator - AI Agent with Tools

class NewsletterWorkflowGenerator {
  constructor() {
    this.nodeCounter = 0;
    // Modèle OpenRouter économique pour newsletter
    this.defaultModel = 'qwen/qwen-2.5-coder-32b-instruct'; // Modèle pas cher et performant
  }

  generateId(prefix) {
    return `${prefix}_${Date.now()}_${this.nodeCounter++}`;
  }

  /**
   * Génère un workflow Newsletter complet basé sur le JSON fourni
   * @param {Object} config - Configuration du workflow
   * @param {string} config.webhookPath - Chemin du webhook (ex: 'generate-newsletter')
   * @param {string} config.userId - ID de l'utilisateur
   * @param {string} config.userEmail - Email de l'utilisateur
   * @returns {Object} Workflow JSON complet
   */
  generateWorkflow(config = {}) {
    this.nodeCounter = 0;
    const nodes = [];
    const connections = {};
    
    const webhookPath = config.webhookPath || `generate-newsletter-${Date.now()}`;
    const workflowName = config.workflowName || 'Newsletter Generator - AI Agent with Tools';

    // 1. Webhook Trigger
    const webhookId = this.generateId('webhook');
    const webhookName = 'Webhook Trigger';
    nodes.push({
      id: webhookId,
      name: webhookName,
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [-768, 0],
      parameters: {
        httpMethod: 'POST',
        path: webhookPath,
        responseMode: 'responseNode',
        options: {}
      },
      webhookId: webhookPath
    });

    // 2. Validate Input (IF node)
    const validateId = this.generateId('validate');
    const validateName = 'Validate Input';
    nodes.push({
      id: validateId,
      name: validateName,
      type: 'n8n-nodes-base.if',
      typeVersion: 1,
      position: [-544, 0],
      parameters: {
        conditions: {
          string: [
            {
              value1: '={{ $json.body.theme }}',
              operation: 'isNotEmpty'
            },
            {
              value1: '={{ $json.body.email }}',
              operation: 'isNotEmpty'
            },
            {
              value1: '={{ $json.body.email }}',
              operation: 'regex',
              value2: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
            }
          ]
        }
      }
    });

    // 3. Error Response
    const errorResponseId = this.generateId('error-response');
    const errorResponseName = 'Error Response';
    nodes.push({
      id: errorResponseId,
      name: errorResponseName,
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1,
      position: [-320, 112],
      parameters: {
        respondWith: 'json',
        responseBody: '={{ {\n  "status": "error",\n  "message": "Email ou thème invalide. Veuillez fournir des données correctes."\n} }}',
        options: {}
      }
    });

    // 4. Prepare Agent Input (Code node)
    const prepareId = this.generateId('prepare');
    const prepareName = 'Prepare Agent Input';
    nodes.push({
      id: prepareId,
      name: prepareName,
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [-320, -128],
      parameters: {
        jsCode: `// Préparer les données pour l'agent IA
const theme = $input.first().json.body.theme;
const email = $input.first().json.body.email;
const language = $input.first().json.body.language || 'fr';
const includeStats = $input.first().json.body.includeStats || false;

const today = new Date();
const dateStr = today.toLocaleDateString('fr-FR', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

const userContext = $input.first().json.body.context || '';
const preferences = $input.first().json.body.preferences || {};

// Créer le prompt pour l'agent IA
const agentPrompt = \`Crée une newsletter complète et détaillée sur le thème suivant.

📌 Thème: \${theme}
📅 Date: \${dateStr}
🌍 Langue: \${language}
\${includeStats ? '📊 IMPORTANT: Utilise ta calculatrice pour inclure des statistiques et données chiffrées précises' : ''}
\${userContext ? \`\\n📝 Contexte supplémentaire: \${userContext}\` : ''}

Exigences:
- Contenu original et pertinent (800-1200 mots)
- Informations récentes et tendances actuelles
- Conseils pratiques et actionnables
- Structure claire avec titres et sous-titres HTML
- Si tu dois faire des calculs ou manipuler des nombres, utilise la calculatrice à ta disposition
- Format HTML propre pour email (utilise <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>)
- Ton professionnel mais accessible

Génère uniquement le contenu HTML (sans balises <html>, <head>, ou <body>), je m'occupe du template complet.\`;

return {
  chatInput: agentPrompt,
  theme,
  email,
  language,
  includeStats,
  dateStr,
  userContext,
  preferences,
  timestamp: today.toISOString()
};`
      }
    });

    // 5. OpenRouter Chat Model
    const openRouterId = this.generateId('openrouter');
    const openRouterName = 'OpenRouter Chat Model';
    nodes.push({
      id: openRouterId,
      name: openRouterName,
      type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
      typeVersion: 1,
      position: [-64, 144],
      parameters: {
        model: config.model || this.defaultModel,
        options: {
          baseURL: 'https://openrouter.ai/api/v1',
          frequencyPenalty: 0.3,
          maxTokens: 3000,
          presencePenalty: 0.1,
          temperature: 0.7,
          topP: 1
        }
      },
      credentials: {
        openAiApi: {
          id: 'ADMIN_OPENROUTER_CREDENTIAL_ID',
          name: 'ADMIN_OPENROUTER_CREDENTIAL_NAME'
        }
      }
    });

    // 6. Calculator Tool
    const calculatorId = this.generateId('calculator');
    const calculatorName = 'Calculator Tool';
    nodes.push({
      id: calculatorId,
      name: calculatorName,
      type: '@n8n/n8n-nodes-langchain.toolCalculator',
      typeVersion: 1,
      position: [192, 128],
      parameters: {}
    });

    // 7. Buffer Memory
    const memoryId = this.generateId('memory');
    const memoryName = 'Buffer Memory';
    nodes.push({
      id: memoryId,
      name: memoryName,
      type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
      typeVersion: 1.2,
      position: [80, 192],
      parameters: {
        contextWindowLength: 5,
        sessionIdType: 'customKey',
        sessionKey: '={{$json.body.email || "default"}}'
      }
    });

    // 8. AI Agent
    const agentId = this.generateId('agent');
    const agentName = 'AI Agent';
    nodes.push({
      id: agentId,
      name: agentName,
      type: '@n8n/n8n-nodes-langchain.agent',
      typeVersion: 1.7,
      position: [-176, -224],
      parameters: {
        agentType: 'conversationalAgent',
        promptType: 'define',
        text: '={{ $json.chatInput }}',
        hasOutputParser: true,
        options: {
          systemMessage: `Tu es un expert en rédaction de newsletters professionnelles et engageantes.

Capacités:
- Rédaction de contenu informatif et structuré
- Utilisation de données et statistiques pertinentes (utilise la calculatrice si nécessaire)
- Ton adapté au public cible
- Format HTML optimisé pour les emails

Tu as accès à une calculatrice pour effectuer des calculs précis. Utilise-la quand tu as besoin de manipuler des nombres ou des statistiques.

Tu dois créer des newsletters avec:
1. Un titre accrocheur et pertinent
2. Une introduction captivante
3. 3-4 sections principales avec contenu de valeur
4. Des insights actionnables avec données chiffrées si demandé
5. Une conclusion inspirante

Utilise des balises HTML sémantiques: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>.`
        }
      }
    });

    // 9. Extract Agent Output (Code node)
    const extractId = this.generateId('extract');
    const extractName = 'Extract Agent Output';
    nodes.push({
      id: extractId,
      name: extractName,
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [128, -128],
      parameters: {
        jsCode: `// Extraire la réponse de l'agent et combiner avec les données originales
const agentResponse = $input.first().json.output;
const originalData = $input.first().json;

// Extraire les informations sur les outils utilisés si disponibles
const usedCalculator = JSON.stringify(originalData).includes('calculator') || 
                       JSON.stringify(originalData).includes('calc') ||
                       (originalData.intermediateSteps && originalData.intermediateSteps.length > 0);

return {
  content: agentResponse,
  theme: originalData.theme,
  email: originalData.email,
  dateStr: originalData.dateStr,
  language: originalData.language,
  timestamp: originalData.timestamp,
  usedCalculator: usedCalculator,
  agentMetadata: {
    intermediateSteps: originalData.intermediateSteps || [],
    iterations: originalData.intermediateSteps?.length || 0
  }
};`
      }
    });

    // 10. Build HTML Template (Code node)
    const buildHtmlId = this.generateId('build-html');
    const buildHtmlName = 'Build HTML Template';
    nodes.push({
      id: buildHtmlId,
      name: buildHtmlName,
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [352, -128],
      parameters: {
        jsCode: `// Construire le template HTML complet avec le contenu généré par l'agent
const data = $input.first().json;
const today = new Date();

const htmlEmail = \`
<!DOCTYPE html>
<html lang="\${data.language || 'fr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Newsletter - \${data.theme}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.8;
      color: #1a202c;
      background-color: #f7fafc;
      padding: 20px;
    }
    .email-wrapper {
      max-width: 680px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 50px 40px;
      text-align: center;
      position: relative;
    }
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="rgba(255,255,255,0.1)"/></svg>');
      opacity: 0.1;
    }
    .header-content {
      position: relative;
      z-index: 1;
    }
    .header h1 {
      font-size: 36px;
      font-weight: 800;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header .date {
      font-size: 16px;
      opacity: 0.95;
      font-weight: 500;
      margin-bottom: 15px;
    }
    .theme-badge {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.25);
      padding: 10px 24px;
      border-radius: 30px;
      margin-top: 10px;
      font-size: 15px;
      font-weight: 700;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    .content-wrapper {
      padding: 50px 40px;
    }
    .content h2 {
      color: #667eea;
      font-size: 26px;
      margin: 35px 0 18px 0;
      padding-left: 18px;
      border-left: 5px solid #667eea;
      font-weight: 700;
      line-height: 1.3;
    }
    .content h3 {
      color: #2d3748;
      font-size: 20px;
      margin: 25px 0 12px 0;
      font-weight: 600;
    }
    .content p {
      margin-bottom: 18px;
      color: #2d3748;
      font-size: 17px;
      line-height: 1.8;
    }
    .content ul, .content ol {
      margin: 20px 0 20px 30px;
    }
    .content li {
      margin-bottom: 12px;
      color: #2d3748;
      font-size: 16px;
      line-height: 1.7;
    }
    .content strong {
      color: #1a202c;
      font-weight: 700;
    }
    .content em {
      font-style: italic;
      color: #4a5568;
    }
    .content a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      border-bottom: 2px solid transparent;
      transition: border-color 0.2s;
    }
    .content a:hover {
      border-bottom-color: #667eea;
    }
    .ai-badge {
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
      border-left: 5px solid #667eea;
      padding: 20px 25px;
      margin: 30px 0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
    }
    .ai-badge h4 {
      margin: 0 0 10px 0;
      color: #667eea;
      font-size: 16px;
      font-weight: 700;
    }
    .ai-badge p {
      margin: 5px 0;
      font-size: 14px;
      color: #4a5568;
    }
    .highlight {
      background-color: #fef3c7;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
    }
    .divider {
      height: 2px;
      background: linear-gradient(to right, transparent, #e2e8f0, transparent);
      margin: 35px 0;
    }
    .footer {
      background-color: #f7fafc;
      padding: 40px;
      text-align: center;
      border-top: 3px solid #e2e8f0;
    }
    .footer p {
      color: #718096;
      font-size: 14px;
      margin: 10px 0;
      line-height: 1.7;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .footer-brand {
      font-size: 12px;
      color: #a0aec0;
      margin-top: 20px;
      font-weight: 500;
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 10px;
      }
      .email-wrapper {
        border-radius: 8px;
      }
      .header {
        padding: 35px 25px;
      }
      .header h1 {
        font-size: 28px;
      }
      .content-wrapper {
        padding: 30px 25px;
      }
      .content h2 {
        font-size: 22px;
      }
      .footer {
        padding: 30px 25px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <!-- Header Section -->
    <div class="header">
      <div class="header-content">
        <h1>📬 Newsletter</h1>
        <p class="date">\${data.dateStr}</p>
        <div class="theme-badge">✨ \${data.theme}</div>
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="content-wrapper">
      <div class="content">
        \${data.content}
      </div>
      
      <div class="divider"></div>
      
      <div class="ai-badge">
        <h4>🤖 Newsletter générée par Agent IA</h4>
        <p><strong>Modèle:</strong> Claude 3.5 Sonnet via OpenRouter</p>
        <p><strong>Thème:</strong> <span class="highlight">\${data.theme}</span></p>
        \${data.usedCalculator ? '<p><strong>🧮 Outils utilisés:</strong> Calculatrice pour calculs précis</p>' : ''}
        <p><strong>📊 Itérations de l\\'agent:</strong> \${data.agentMetadata.iterations}</p>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p><strong>🎯 Cette newsletter a été créée spécialement pour vous</strong></p>
      <p>Vous recevez cet email concernant le thème : <strong>\${data.theme}</strong></p>
      <p style="margin-top: 20px;">
        <a href="mailto:contact@example.com?subject=Question">Nous contacter</a> | 
        <a href="#">Politique de confidentialité</a>
      </p>
      <div class="divider" style="margin: 25px auto; max-width: 150px;"></div>
      <p class="footer-brand">
        © \${today.getFullYear()} Newsletter Generator<br>
        Propulsé par Agent IA · OpenRouter · n8n
      </p>
    </div>
  </div>
</body>
</html>
\`;

return {
  email: data.email,
  theme: data.theme,
  subject: \`🤖 \${data.dateStr} · \${data.theme}\`,
  htmlContent: htmlEmail,
  textContent: data.content.replace(/<[^>]*>/g, '').substring(0, 500) + '...',
  timestamp: today.toISOString(),
  agentMetadata: data.agentMetadata
};`
      }
    });

    // 11. Send Email
    const sendEmailId = this.generateId('send-email');
    const sendEmailName = 'Send Email';
    nodes.push({
      id: sendEmailId,
      name: sendEmailName,
      type: 'n8n-nodes-base.emailSend',
      typeVersion: 2,
      position: [560, -128],
      parameters: {
        toEmail: '={{ $json.email }}',
        subject: '={{ $json.subject }}',
        options: {
          appendAttribution: false,
          allowUnauthorizedCerts: false
        }
      },
      credentials: {
        smtp: {
          id: 'ADMIN_SMTP_CREDENTIAL_ID',
          name: 'ADMIN_SMTP_CREDENTIAL_NAME'
        }
      }
    });

    // 12. Success Response
    const successResponseId = this.generateId('success-response');
    const successResponseName = 'Success Response';
    nodes.push({
      id: successResponseId,
      name: successResponseName,
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1,
      position: [784, -128],
      parameters: {
        respondWith: 'json',
        responseBody: '={{ {\n  "status": "success",\n  "message": "Newsletter générée par l\'agent IA et envoyée avec succès !",\n  "recipient": $json.email,\n  "theme": $json.theme,\n  "timestamp": $json.timestamp,\n  "agent": {\n    "usedCalculator": $json.agentMetadata.usedCalculator,\n    "iterations": $json.agentMetadata.iterations\n  }\n} }}',
        options: {}
      }
    });

    // Connections
    connections[webhookName] = {
      main: [
        [
          {
            node: validateName,
            type: 'main',
            index: 0
          }
        ]
      ]
    };

    connections[validateName] = {
      main: [
        [
          {
            node: prepareName,
            type: 'main',
            index: 0
          }
        ],
        [
          {
            node: errorResponseName,
            type: 'main',
            index: 0
          }
        ]
      ]
    };

    connections[prepareName] = {
      main: [
        [
          {
            node: agentName,
            type: 'main',
            index: 0
          }
        ]
      ]
    };

    connections[openRouterName] = {
      ai_languageModel: [
        [
          {
            node: agentName,
            type: 'ai_languageModel',
            index: 0
          }
        ]
      ]
    };

    connections[calculatorName] = {
      ai_tool: [
        [
          {
            node: agentName,
            type: 'ai_tool',
            index: 0
          }
        ]
      ]
    };

    connections[memoryName] = {
      ai_memory: [
        [
          {
            node: agentName,
            type: 'ai_memory',
            index: 0
          }
        ]
      ]
    };

    connections[agentName] = {
      main: [
        [
          {
            node: extractName,
            type: 'main',
            index: 0
          }
        ]
      ]
    };

    connections[extractName] = {
      main: [
        [
          {
            node: buildHtmlName,
            type: 'main',
            index: 0
          }
        ]
      ]
    };

    connections[buildHtmlName] = {
      main: [
        [
          {
            node: sendEmailName,
            type: 'main',
            index: 0
          }
        ]
      ]
    };

    connections[sendEmailName] = {
      main: [
        [
          {
            node: successResponseName,
            type: 'main',
            index: 0
          }
        ]
      ]
    };

    return {
      name: workflowName,
      nodes,
      pinData: {},
      connections,
      active: false,
      settings: {
        executionOrder: 'v1'
      },
      versionId: this.generateId('version'),
      meta: {
        templateCredsSetupCompleted: true
      }
    };
  }
}

module.exports = NewsletterWorkflowGenerator;

