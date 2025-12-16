// Base de données exhaustive des nœuds n8n avec paramètres complets
// Le meilleur référentiel de nœuds pour la génération de workflows

class N8nNodesDatabase {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TRIGGERS - Nœuds de déclenchement
  // ═══════════════════════════════════════════════════════════════════════════
  static TRIGGERS = {
    'n8n-nodes-base.webhook': {
      displayName: 'Webhook',
      description: 'Déclenche le workflow via une requête HTTP',
      icon: '🌐',
      typeVersion: 2,
      requiredParameters: ['httpMethod', 'path'],
      optionalParameters: ['responseMode', 'responseCode', 'responseData', 'options'],
      defaultParameters: {
        httpMethod: 'POST',
        path: 'webhook',
        responseMode: 'onReceived',
        options: {}
      },
      exampleParameters: {
        httpMethod: 'POST',
        path: 'my-webhook',
        responseMode: 'responseNode',
        options: {
          responseHeaders: {}
        }
      },
      credentials: null,
      outputs: ['main'],
      category: 'trigger'
    },
    
    'n8n-nodes-base.schedule': {
      displayName: 'Schedule Trigger',
      description: 'Déclenche le workflow selon un planning',
      icon: '⏰',
      typeVersion: 1.2,
      requiredParameters: ['rule'],
      optionalParameters: [],
      defaultParameters: {
        rule: {
          interval: [{ field: 'cronExpression', cronExpression: '0 9 * * *' }]
        }
      },
      exampleParameters: {
        rule: {
          interval: [{ field: 'cronExpression', cronExpression: '0 6 * * *' }]
        }
      },
      cronExamples: {
        'Chaque minute': '* * * * *',
        'Chaque heure': '0 * * * *',
        'Tous les jours à 6h': '0 6 * * *',
        'Tous les jours à 9h': '0 9 * * *',
        'Lundi à 8h': '0 8 * * 1',
        'Premier du mois à minuit': '0 0 1 * *'
      },
      credentials: null,
      outputs: ['main'],
      category: 'trigger'
    },
    
    'n8n-nodes-base.manualTrigger': {
      displayName: 'Manual Trigger',
      description: 'Déclenche le workflow manuellement',
      icon: '👆',
      typeVersion: 1,
      requiredParameters: [],
      optionalParameters: [],
      defaultParameters: {},
      credentials: null,
      outputs: ['main'],
      category: 'trigger'
    },
    
    'n8n-nodes-base.emailTrigger': {
      displayName: 'Email Trigger (IMAP)',
      description: 'Déclenche lors de réception d\'email',
      icon: '📧',
      typeVersion: 1,
      requiredParameters: ['mailbox'],
      optionalParameters: ['postProcessAction', 'simple', 'downloadAttachments'],
      defaultParameters: {
        mailbox: 'INBOX',
        postProcessAction: 'nothing',
        simple: true,
        downloadAttachments: false
      },
      credentials: ['imap'],
      outputs: ['main'],
      category: 'trigger'
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL - Nœuds de messagerie
  // ═══════════════════════════════════════════════════════════════════════════
  static EMAIL = {
    'n8n-nodes-base.emailReadImap': {
      displayName: 'Email Read (IMAP)',
      description: 'Lit les emails via IMAP',
      icon: '📥',
      typeVersion: 2.1,
      requiredParameters: ['mailbox'],
      optionalParameters: ['format', 'limit', 'downloadAttachments', 'options'],
      defaultParameters: {
        mailbox: 'INBOX',
        format: 'simple',
        options: {
          forceReconnect: true
        }
      },
      exampleParameters: {
        mailbox: 'INBOX',
        format: 'simple',
        limit: 50,
        downloadAttachments: false,
        options: {
          forceReconnect: true,
          markSeen: false
        }
      },
      credentials: ['imap'],
      credentialPlaceholder: {
        imap: {
          id: 'USER_IMAP_CREDENTIAL_ID',
          name: 'USER_IMAP_CREDENTIAL_NAME'
        }
      },
      inputs: ['main'],
      outputs: ['main'],
      category: 'email'
    },
    
    'n8n-nodes-base.emailSend': {
      displayName: 'Send Email',
      description: 'Envoie un email via SMTP',
      icon: '📤',
      typeVersion: 2.1,
      requiredParameters: ['fromEmail', 'toEmail', 'subject'],
      optionalParameters: ['text', 'html', 'attachments', 'cc', 'bcc', 'replyTo', 'options'],
      defaultParameters: {
        fromEmail: '{{USER_EMAIL}}',
        toEmail: '{{USER_EMAIL}}',
        subject: 'Notification Automivy',
        emailType: 'text',
        options: {}
      },
      exampleParameters: {
        fromEmail: 'noreply@automivy.com',
        toEmail: '={{ $json.email }}',
        subject: 'Votre rapport quotidien',
        emailType: 'html',
        message: '<h1>Rapport</h1><p>{{ $json.summary }}</p>',
        options: {}
      },
      credentials: ['smtp'],
      credentialPlaceholder: {
        smtp: {
          id: 'ADMIN_SMTP_CREDENTIAL_ID',
          name: 'ADMIN_SMTP_CREDENTIAL_NAME'
        }
      },
      inputs: ['main'],
      outputs: ['main'],
      category: 'email'
    },
    
    'n8n-nodes-base.gmail': {
      displayName: 'Gmail',
      description: 'Opérations Gmail via API',
      icon: '📬',
      typeVersion: 2.1,
      operations: ['getAll', 'get', 'send', 'reply', 'addLabels', 'removeLabels', 'markAsRead', 'markAsUnread', 'delete'],
      requiredParameters: ['operation'],
      defaultParameters: {
        operation: 'getAll',
        resource: 'message'
      },
      credentials: ['gmailOAuth2'],
      credentialPlaceholder: {
        gmailOAuth2: {
          id: 'USER_GMAIL_CREDENTIAL_ID',
          name: 'USER_GMAIL_CREDENTIAL_NAME'
        }
      },
      inputs: ['main'],
      outputs: ['main'],
      category: 'email'
    },
    
    'n8n-nodes-base.microsoftOutlook': {
      displayName: 'Microsoft Outlook',
      description: 'Opérations Outlook via Microsoft Graph',
      icon: '📧',
      typeVersion: 2,
      operations: ['getAll', 'get', 'send', 'reply', 'move', 'delete'],
      requiredParameters: ['operation', 'resource'],
      defaultParameters: {
        operation: 'getAll',
        resource: 'message'
      },
      credentials: ['microsoftOutlookOAuth2'],
      credentialPlaceholder: {
        microsoftOutlookOAuth2: {
          id: 'USER_MICROSOFT_CREDENTIAL_ID',
          name: 'USER_MICROSOFT_CREDENTIAL_NAME'
        }
      },
      inputs: ['main'],
      outputs: ['main'],
      category: 'email'
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // AI & LANGCHAIN - Nœuds d'intelligence artificielle
  // ═══════════════════════════════════════════════════════════════════════════
  static AI = {
    '@n8n/n8n-nodes-langchain.agent': {
      displayName: 'AI Agent',
      description: 'Agent IA conversationnel avec outils',
      icon: '🤖',
      typeVersion: 1.7,
      requiredParameters: ['promptType', 'text'],
      optionalParameters: ['options'],
      defaultParameters: {
        promptType: 'define',
        text: 'Analyse les données suivantes et génère un résumé: {{ $json.data.toJsonString() }}',
        options: {
          systemMessage: 'Tu es un assistant expert qui analyse les données et génère des rapports précis.',
          maxIterations: 10
        }
      },
      exampleParameters: {
        promptType: 'define',
        text: 'Analyse les emails suivants et crée un résumé par priorité:\n\n{{ $json.data.toJsonString() }}\n\nFormat demandé:\n- Urgent\n- Important\n- Normal',
        options: {
          systemMessage: 'Tu es un assistant expert en gestion des emails. Tu analyses les emails et les classes par priorité.',
          maxIterations: 10,
          returnIntermediateSteps: false
        }
      },
      inputs: ['main', 'ai_languageModel', 'ai_tool', 'ai_memory'],
      outputs: ['main'],
      connectionTypes: {
        ai_languageModel: 'Modèle de langage (obligatoire)',
        ai_tool: 'Outils (optionnel)',
        ai_memory: 'Mémoire (optionnel)'
      },
      credentials: null,
      category: 'ai'
    },
    
    '@n8n/n8n-nodes-langchain.lmChatOpenRouter': {
      displayName: 'OpenRouter Chat Model',
      description: 'Modèle de chat via OpenRouter',
      icon: '🧠',
      typeVersion: 1,
      requiredParameters: ['model'],
      optionalParameters: ['temperature', 'maxTokens', 'topP'],
      defaultParameters: {
        model: 'openai/gpt-4o-mini',
        temperature: 0.3,
        maxTokens: 4000
      },
      exampleParameters: {
        model: 'openai/gpt-4o-mini',
        temperature: 0.3,
        maxTokens: 4000,
        topP: 0.95
      },
      availableModels: [
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Recommandé)', cost: 'Très bas' },
        { id: 'openai/gpt-4o', name: 'GPT-4o', cost: 'Moyen' },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', cost: 'Moyen' },
        { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', cost: 'Bas' },
        { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', cost: 'Bas' },
        { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', cost: 'Moyen' }
      ],
      credentials: ['openRouterApi'],
      credentialPlaceholder: {
        openRouterApi: {
          id: 'ADMIN_OPENROUTER_CREDENTIAL_ID',
          name: 'ADMIN_OPENROUTER_CREDENTIAL_NAME'
        }
      },
      inputs: [],
      outputs: ['ai_languageModel'],
      category: 'ai'
    },
    
    '@n8n/n8n-nodes-langchain.toolCalculator': {
      displayName: 'Calculator Tool',
      description: 'Outil de calcul pour l\'AI Agent',
      icon: '🧮',
      typeVersion: 1,
      requiredParameters: [],
      optionalParameters: [],
      defaultParameters: {},
      credentials: null,
      inputs: [],
      outputs: ['ai_tool'],
      category: 'ai'
    },
    
    '@n8n/n8n-nodes-langchain.memoryBufferWindow': {
      displayName: 'Buffer Window Memory',
      description: 'Mémoire tampon pour l\'AI Agent',
      icon: '💾',
      typeVersion: 1.2,
      requiredParameters: [],
      optionalParameters: ['sessionId', 'contextWindowLength'],
      defaultParameters: {
        sessionId: '={{ $json.sessionId || "default" }}',
        contextWindowLength: 10
      },
      credentials: null,
      inputs: [],
      outputs: ['ai_memory'],
      category: 'ai'
    },
    
    '@n8n/n8n-nodes-langchain.toolCode': {
      displayName: 'Code Tool',
      description: 'Exécute du code JavaScript comme outil IA',
      icon: '💻',
      typeVersion: 1,
      requiredParameters: ['name', 'description', 'jsCode'],
      defaultParameters: {
        name: 'custom_tool',
        description: 'Outil personnalisé',
        jsCode: 'return { result: "success" };'
      },
      credentials: null,
      inputs: [],
      outputs: ['ai_tool'],
      category: 'ai'
    },
    
    '@n8n/n8n-nodes-langchain.toolHttpRequest': {
      displayName: 'HTTP Request Tool',
      description: 'Requête HTTP comme outil IA',
      icon: '🌐',
      typeVersion: 1,
      requiredParameters: ['name', 'description', 'url', 'method'],
      defaultParameters: {
        name: 'api_request',
        description: 'Appelle une API externe',
        method: 'GET',
        url: 'https://api.example.com'
      },
      credentials: null,
      inputs: [],
      outputs: ['ai_tool'],
      category: 'ai'
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA PROCESSING - Nœuds de traitement de données
  // ═══════════════════════════════════════════════════════════════════════════
  static DATA_PROCESSING = {
    'n8n-nodes-base.aggregate': {
      displayName: 'Aggregate',
      description: 'Agrège plusieurs items en un seul',
      icon: '📊',
      typeVersion: 1,
      requiredParameters: ['aggregate'],
      optionalParameters: ['destinationFieldName', 'include'],
      defaultParameters: {
        aggregate: 'aggregateAllItemData',
        destinationFieldName: 'data',
        include: 'allFields'
      },
      exampleParameters: {
        aggregate: 'aggregateAllItemData',
        destinationFieldName: 'data',
        include: 'allFields'
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main'],
      category: 'data'
    },
    
    'n8n-nodes-base.code': {
      displayName: 'Code',
      description: 'Exécute du code JavaScript personnalisé',
      icon: '💻',
      typeVersion: 2,
      requiredParameters: ['jsCode'],
      optionalParameters: ['mode'],
      defaultParameters: {
        mode: 'runOnceForAllItems',
        jsCode: '// Code JavaScript\nreturn items;'
      },
      exampleParameters: {
        mode: 'runOnceForAllItems',
        jsCode: `// Traiter les données
const results = items.map(item => {
  return {
    json: {
      ...item.json,
      processed: true,
      timestamp: new Date().toISOString()
    }
  };
});
return results;`
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main'],
      category: 'data'
    },
    
    'n8n-nodes-base.function': {
      displayName: 'Function',
      description: 'Exécute une fonction JavaScript',
      icon: '⚙️',
      typeVersion: 1,
      requiredParameters: ['functionCode'],
      defaultParameters: {
        functionCode: '// Fonction JavaScript\nreturn items;'
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main'],
      category: 'data',
      deprecated: true,
      replacedBy: 'n8n-nodes-base.code'
    },
    
    'n8n-nodes-base.set': {
      displayName: 'Set',
      description: 'Définit ou modifie des valeurs',
      icon: '✏️',
      typeVersion: 3.4,
      requiredParameters: ['mode'],
      optionalParameters: ['values', 'options'],
      defaultParameters: {
        mode: 'manual',
        duplicateItem: false,
        options: {}
      },
      exampleParameters: {
        mode: 'manual',
        duplicateItem: false,
        assignments: {
          assignments: [
            { id: 'field1', name: 'status', type: 'string', value: 'processed' },
            { id: 'field2', name: 'timestamp', type: 'string', value: '={{ $now.toISO() }}' }
          ]
        },
        options: {}
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main'],
      category: 'data'
    },
    
    'n8n-nodes-base.splitInBatches': {
      displayName: 'Split In Batches',
      description: 'Divise les items en lots',
      icon: '📦',
      typeVersion: 3,
      requiredParameters: ['batchSize'],
      defaultParameters: {
        batchSize: 10,
        options: {}
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main', 'main'],
      category: 'data'
    },
    
    'n8n-nodes-base.merge': {
      displayName: 'Merge',
      description: 'Fusionne plusieurs flux de données',
      icon: '🔀',
      typeVersion: 3,
      requiredParameters: ['mode'],
      optionalParameters: ['options'],
      defaultParameters: {
        mode: 'combine',
        combinationMode: 'mergeByPosition'
      },
      credentials: null,
      inputs: ['main', 'main'],
      outputs: ['main'],
      category: 'data'
    },
    
    'n8n-nodes-base.filter': {
      displayName: 'Filter',
      description: 'Filtre les items selon des conditions',
      icon: '🔍',
      typeVersion: 2,
      requiredParameters: ['conditions'],
      defaultParameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: '',
            typeValidation: 'strict'
          },
          conditions: [],
          combinator: 'and'
        },
        options: {}
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main', 'main'],
      category: 'data'
    },
    
    'n8n-nodes-base.switch': {
      displayName: 'Switch',
      description: 'Route les données selon des règles',
      icon: '🔀',
      typeVersion: 3.2,
      requiredParameters: ['mode', 'rules'],
      defaultParameters: {
        mode: 'rules',
        rules: {
          values: []
        },
        options: {}
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main'], // Multiple outputs selon les règles
      category: 'data'
    },
    
    'n8n-nodes-base.if': {
      displayName: 'IF',
      description: 'Condition true/false',
      icon: '❓',
      typeVersion: 2.2,
      requiredParameters: ['conditions'],
      defaultParameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: '',
            typeValidation: 'strict'
          },
          conditions: [],
          combinator: 'and'
        },
        options: {}
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main', 'main'],
      category: 'data'
    },
    
    'n8n-nodes-base.noOp': {
      displayName: 'No Operation',
      description: 'Ne fait rien, passe les données',
      icon: '➡️',
      typeVersion: 1,
      requiredParameters: [],
      defaultParameters: {},
      credentials: null,
      inputs: ['main'],
      outputs: ['main'],
      category: 'data'
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HTTP & API - Nœuds d'intégration HTTP
  // ═══════════════════════════════════════════════════════════════════════════
  static HTTP = {
    'n8n-nodes-base.httpRequest': {
      displayName: 'HTTP Request',
      description: 'Effectue une requête HTTP',
      icon: '🌐',
      typeVersion: 4.2,
      requiredParameters: ['method', 'url'],
      optionalParameters: ['headers', 'body', 'queryParameters', 'options'],
      defaultParameters: {
        method: 'GET',
        url: '',
        options: {}
      },
      exampleParameters: {
        method: 'POST',
        url: 'https://api.example.com/endpoint',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'Content-Type', value: 'application/json' }
          ]
        },
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: 'data', value: '={{ $json }}' }
          ]
        },
        options: {}
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main'],
      category: 'http'
    },
    
    'n8n-nodes-base.respondToWebhook': {
      displayName: 'Respond to Webhook',
      description: 'Répond à une requête webhook',
      icon: '↩️',
      typeVersion: 1.1,
      requiredParameters: ['respondWith'],
      optionalParameters: ['options'],
      defaultParameters: {
        respondWith: 'allIncomingItems',
        options: {}
      },
      exampleParameters: {
        respondWith: 'json',
        responseBody: '={{ { "success": true, "data": $json } }}',
        options: {
          responseCode: 200,
          responseHeaders: {
            entries: [
              { name: 'Content-Type', value: 'application/json' }
            ]
          }
        }
      },
      credentials: null,
      inputs: ['main'],
      outputs: [],
      category: 'http'
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RSS & CONTENT - Nœuds de contenu
  // ═══════════════════════════════════════════════════════════════════════════
  static CONTENT = {
    'n8n-nodes-base.rssFeed': {
      displayName: 'RSS Feed Read',
      description: 'Lit un ou plusieurs flux RSS',
      icon: '📰',
      typeVersion: 1.1,
      requiredParameters: ['url'],
      optionalParameters: ['options'],
      defaultParameters: {
        url: '',
        options: {}
      },
      exampleParameters: {
        url: 'https://techcrunch.com/feed/',
        options: {
          ignoreSSL: false
        }
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main'],
      category: 'content'
    },
    
    'n8n-nodes-base.markdown': {
      displayName: 'Markdown',
      description: 'Convertit Markdown en HTML et vice versa',
      icon: '📝',
      typeVersion: 1,
      requiredParameters: ['mode'],
      optionalParameters: ['options'],
      defaultParameters: {
        mode: 'markdownToHtml',
        markdown: '={{ $json.markdown }}',
        options: {}
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main'],
      category: 'content'
    },
    
    'n8n-nodes-base.html': {
      displayName: 'HTML',
      description: 'Extrait des données depuis HTML',
      icon: '🌐',
      typeVersion: 1.2,
      requiredParameters: ['operation'],
      optionalParameters: ['options'],
      defaultParameters: {
        operation: 'extractHtmlContent',
        extractionValues: {
          values: []
        }
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main'],
      category: 'content'
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DATABASES - Nœuds de base de données
  // ═══════════════════════════════════════════════════════════════════════════
  static DATABASES = {
    'n8n-nodes-base.postgres': {
      displayName: 'PostgreSQL',
      description: 'Opérations sur PostgreSQL',
      icon: '🐘',
      typeVersion: 2.5,
      requiredParameters: ['operation'],
      operations: ['executeQuery', 'insert', 'update', 'delete', 'select'],
      defaultParameters: {
        operation: 'executeQuery',
        query: 'SELECT * FROM table_name WHERE id = $1',
        options: {}
      },
      credentials: ['postgres'],
      credentialPlaceholder: {
        postgres: {
          id: 'USER_POSTGRES_CREDENTIAL_ID',
          name: 'USER_POSTGRES_CREDENTIAL_NAME'
        }
      },
      inputs: ['main'],
      outputs: ['main'],
      category: 'database'
    },
    
    'n8n-nodes-base.mysql': {
      displayName: 'MySQL',
      description: 'Opérations sur MySQL',
      icon: '🐬',
      typeVersion: 2.4,
      requiredParameters: ['operation'],
      operations: ['executeQuery', 'insert', 'update', 'delete', 'select'],
      defaultParameters: {
        operation: 'executeQuery',
        query: 'SELECT * FROM table_name WHERE id = ?'
      },
      credentials: ['mysql'],
      inputs: ['main'],
      outputs: ['main'],
      category: 'database'
    },
    
    'n8n-nodes-base.mongodb': {
      displayName: 'MongoDB',
      description: 'Opérations sur MongoDB',
      icon: '🍃',
      typeVersion: 1.4,
      requiredParameters: ['operation', 'collection'],
      operations: ['find', 'insert', 'update', 'delete', 'aggregate'],
      defaultParameters: {
        operation: 'find',
        collection: '',
        query: '{}'
      },
      credentials: ['mongoDb'],
      inputs: ['main'],
      outputs: ['main'],
      category: 'database'
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTIVITY - Nœuds de productivité
  // ═══════════════════════════════════════════════════════════════════════════
  static PRODUCTIVITY = {
    'n8n-nodes-base.googleSheets': {
      displayName: 'Google Sheets',
      description: 'Opérations sur Google Sheets',
      icon: '📊',
      typeVersion: 4.5,
      requiredParameters: ['operation', 'documentId'],
      operations: ['append', 'read', 'update', 'delete', 'clear'],
      defaultParameters: {
        operation: 'append',
        documentId: { mode: 'list', value: '' },
        sheetName: { mode: 'list', value: '' }
      },
      credentials: ['googleSheetsOAuth2'],
      credentialPlaceholder: {
        googleSheetsOAuth2: {
          id: 'USER_GOOGLE_SHEETS_CREDENTIAL_ID',
          name: 'USER_GOOGLE_SHEETS_CREDENTIAL_NAME'
        }
      },
      inputs: ['main'],
      outputs: ['main'],
      category: 'productivity'
    },
    
    'n8n-nodes-base.notion': {
      displayName: 'Notion',
      description: 'Opérations sur Notion',
      icon: '📓',
      typeVersion: 2.2,
      requiredParameters: ['operation', 'resource'],
      resources: ['database', 'page', 'block', 'user'],
      operations: ['getAll', 'get', 'create', 'update', 'archive'],
      defaultParameters: {
        resource: 'page',
        operation: 'getAll'
      },
      credentials: ['notionApi'],
      credentialPlaceholder: {
        notionApi: {
          id: 'USER_NOTION_CREDENTIAL_ID',
          name: 'USER_NOTION_CREDENTIAL_NAME'
        }
      },
      inputs: ['main'],
      outputs: ['main'],
      category: 'productivity'
    },
    
    'n8n-nodes-base.airtable': {
      displayName: 'Airtable',
      description: 'Opérations sur Airtable',
      icon: '📋',
      typeVersion: 2.1,
      requiredParameters: ['operation', 'base', 'table'],
      operations: ['list', 'get', 'create', 'update', 'delete'],
      defaultParameters: {
        operation: 'list',
        base: { mode: 'list', value: '' },
        table: { mode: 'list', value: '' }
      },
      credentials: ['airtableTokenApi'],
      credentialPlaceholder: {
        airtableTokenApi: {
          id: 'USER_AIRTABLE_CREDENTIAL_ID',
          name: 'USER_AIRTABLE_CREDENTIAL_NAME'
        }
      },
      inputs: ['main'],
      outputs: ['main'],
      category: 'productivity'
    },
    
    'n8n-nodes-base.slack': {
      displayName: 'Slack',
      description: 'Opérations sur Slack',
      icon: '💬',
      typeVersion: 2.2,
      requiredParameters: ['operation', 'resource'],
      resources: ['channel', 'message', 'file', 'reaction', 'star', 'user'],
      operations: ['post', 'update', 'delete', 'getAll', 'get'],
      defaultParameters: {
        resource: 'message',
        operation: 'post',
        channel: { mode: 'id', value: '' },
        text: ''
      },
      credentials: ['slackApi'],
      credentialPlaceholder: {
        slackApi: {
          id: 'USER_SLACK_CREDENTIAL_ID',
          name: 'USER_SLACK_CREDENTIAL_NAME'
        }
      },
      inputs: ['main'],
      outputs: ['main'],
      category: 'productivity'
    },
    
    'n8n-nodes-base.discord': {
      displayName: 'Discord',
      description: 'Envoie des messages sur Discord',
      icon: '🎮',
      typeVersion: 2,
      requiredParameters: ['resource', 'operation'],
      defaultParameters: {
        resource: 'webhook',
        operation: 'sendLegacy',
        webhookUri: ''
      },
      credentials: ['discordWebhookApi'],
      inputs: ['main'],
      outputs: ['main'],
      category: 'productivity'
    },
    
    'n8n-nodes-base.telegram': {
      displayName: 'Telegram',
      description: 'Opérations sur Telegram',
      icon: '✈️',
      typeVersion: 1.2,
      requiredParameters: ['operation', 'resource'],
      resources: ['message', 'chat', 'callback'],
      operations: ['sendMessage', 'editMessageText', 'deleteMessage'],
      defaultParameters: {
        resource: 'message',
        operation: 'sendMessage',
        chatId: '',
        text: ''
      },
      credentials: ['telegramApi'],
      inputs: ['main'],
      outputs: ['main'],
      category: 'productivity'
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FILES - Nœuds de gestion de fichiers
  // ═══════════════════════════════════════════════════════════════════════════
  static FILES = {
    'n8n-nodes-base.extractFromFile': {
      displayName: 'Extract From File',
      description: 'Extrait du contenu depuis un fichier',
      icon: '📄',
      typeVersion: 1,
      requiredParameters: ['operation'],
      operations: ['text', 'pdf', 'html', 'rtf', 'json', 'xml', 'csv', 'xlsx'],
      defaultParameters: {
        operation: 'pdf',
        binaryPropertyName: 'data'
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main'],
      category: 'files'
    },
    
    'n8n-nodes-base.convertToFile': {
      displayName: 'Convert To File',
      description: 'Convertit des données en fichier',
      icon: '📁',
      typeVersion: 1.1,
      requiredParameters: ['operation'],
      operations: ['csv', 'html', 'ics', 'json', 'xlsx', 'xml'],
      defaultParameters: {
        operation: 'csv',
        options: {}
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main'],
      category: 'files'
    },
    
    'n8n-nodes-base.spreadsheetFile': {
      displayName: 'Spreadsheet File',
      description: 'Lit et écrit des fichiers tableur',
      icon: '📊',
      typeVersion: 2,
      requiredParameters: ['operation'],
      operations: ['read', 'write'],
      defaultParameters: {
        operation: 'read',
        fileFormat: 'autodetect'
      },
      credentials: null,
      inputs: ['main'],
      outputs: ['main'],
      category: 'files'
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS - Méthodes utilitaires
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Obtenir tous les nœuds
  static getAllNodes() {
    return {
      ...this.TRIGGERS,
      ...this.EMAIL,
      ...this.AI,
      ...this.DATA_PROCESSING,
      ...this.HTTP,
      ...this.CONTENT,
      ...this.DATABASES,
      ...this.PRODUCTIVITY,
      ...this.FILES
    };
  }
  
  // Obtenir un nœud par type
  static getNode(nodeType) {
    const allNodes = this.getAllNodes();
    return allNodes[nodeType] || null;
  }
  
  // Obtenir les nœuds par catégorie
  static getNodesByCategory(category) {
    const categories = {
      trigger: this.TRIGGERS,
      email: this.EMAIL,
      ai: this.AI,
      data: this.DATA_PROCESSING,
      http: this.HTTP,
      content: this.CONTENT,
      database: this.DATABASES,
      productivity: this.PRODUCTIVITY,
      files: this.FILES
    };
    return categories[category] || {};
  }
  
  // Vérifier si un type de nœud existe
  static nodeExists(nodeType) {
    return this.getNode(nodeType) !== null;
  }
  
  // Obtenir les paramètres par défaut d'un nœud
  static getDefaultParameters(nodeType) {
    const node = this.getNode(nodeType);
    return node?.defaultParameters || {};
  }
  
  // Obtenir les credentials nécessaires pour un nœud
  static getRequiredCredentials(nodeType) {
    const node = this.getNode(nodeType);
    return node?.credentials || [];
  }
  
  // Obtenir le placeholder de credentials pour un nœud
  static getCredentialPlaceholder(nodeType) {
    const node = this.getNode(nodeType);
    return node?.credentialPlaceholder || null;
  }
  
  // Valider les paramètres d'un nœud
  static validateNodeParameters(nodeType, parameters) {
    const node = this.getNode(nodeType);
    if (!node) {
      return { valid: false, errors: [`Node type ${nodeType} not found`] };
    }
    
    const errors = [];
    const requiredParams = node.requiredParameters || [];
    
    requiredParams.forEach(param => {
      if (!(param in parameters) || parameters[param] === undefined || parameters[param] === null) {
        errors.push(`Missing required parameter: ${param}`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors,
      nodeDefinition: node
    };
  }
  
  // Générer un nœud complet avec paramètres par défaut
  static generateNode(nodeType, customParameters = {}, position = [250, 300]) {
    const node = this.getNode(nodeType);
    if (!node) {
      return null;
    }
    
    const generatedNode = {
      id: this.generateNodeId(node.displayName),
      name: node.displayName,
      type: nodeType,
      typeVersion: node.typeVersion,
      position: position,
      parameters: {
        ...node.defaultParameters,
        ...customParameters
      }
    };
    
    // Ajouter les credentials si nécessaires
    const credPlaceholder = node.credentialPlaceholder;
    if (credPlaceholder) {
      generatedNode.credentials = credPlaceholder;
    }
    
    return generatedNode;
  }
  
  // Générer un ID unique pour un nœud
  static generateNodeId(displayName) {
    const baseName = displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    return `${baseName}-${uniqueSuffix}`;
  }
  
  // Obtenir les nœuds recommandés pour un cas d'usage
  static getRecommendedNodesForUseCase(useCase) {
    const useCaseMap = {
      'email-automation': [
        'n8n-nodes-base.schedule',
        'n8n-nodes-base.emailReadImap',
        'n8n-nodes-base.aggregate',
        '@n8n/n8n-nodes-langchain.agent',
        '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        '@n8n/n8n-nodes-langchain.toolCalculator',
        '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        'n8n-nodes-base.emailSend'
      ],
      'newsletter': [
        'n8n-nodes-base.schedule',
        'n8n-nodes-base.rssFeed',
        'n8n-nodes-base.code',
        'n8n-nodes-base.aggregate',
        '@n8n/n8n-nodes-langchain.agent',
        '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        'n8n-nodes-base.emailSend'
      ],
      'pdf-analysis': [
        'n8n-nodes-base.webhook',
        'n8n-nodes-base.extractFromFile',
        '@n8n/n8n-nodes-langchain.agent',
        '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
        'n8n-nodes-base.code',
        'n8n-nodes-base.respondToWebhook'
      ],
      'data-sync': [
        'n8n-nodes-base.schedule',
        'n8n-nodes-base.httpRequest',
        'n8n-nodes-base.code',
        'n8n-nodes-base.postgres',
        'n8n-nodes-base.emailSend'
      ],
      'slack-notification': [
        'n8n-nodes-base.webhook',
        'n8n-nodes-base.code',
        'n8n-nodes-base.slack'
      ],
      'api-integration': [
        'n8n-nodes-base.webhook',
        'n8n-nodes-base.httpRequest',
        'n8n-nodes-base.code',
        'n8n-nodes-base.respondToWebhook'
      ]
    };
    
    return useCaseMap[useCase] || [];
  }
  
  // Obtenir la documentation d'un nœud pour le prompt IA
  static getNodeDocumentation(nodeType) {
    const node = this.getNode(nodeType);
    if (!node) return null;
    
    let doc = `## ${node.displayName} (${nodeType})\n`;
    doc += `${node.description}\n\n`;
    doc += `**Version:** ${node.typeVersion}\n`;
    doc += `**Catégorie:** ${node.category}\n\n`;
    
    if (node.requiredParameters?.length > 0) {
      doc += `**Paramètres requis:**\n`;
      node.requiredParameters.forEach(p => {
        doc += `- ${p}\n`;
      });
      doc += '\n';
    }
    
    if (node.exampleParameters) {
      doc += `**Exemple de paramètres:**\n`;
      doc += '```json\n';
      doc += JSON.stringify(node.exampleParameters, null, 2);
      doc += '\n```\n\n';
    }
    
    if (node.credentials) {
      doc += `**Credentials requis:** ${node.credentials.join(', ')}\n`;
    }
    
    return doc;
  }
  
  // Générer la documentation complète pour le prompt
  static generateFullDocumentation() {
    const allNodes = this.getAllNodes();
    let doc = '# Documentation des nœuds n8n disponibles\n\n';
    
    Object.keys(allNodes).forEach(nodeType => {
      doc += this.getNodeDocumentation(nodeType);
      doc += '\n---\n\n';
    });
    
    return doc;
  }
}

module.exports = N8nNodesDatabase;

