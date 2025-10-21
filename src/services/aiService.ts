import { apiKeyService } from './index';

interface AIProviderConfig {
  name: string;
  endpoint: string;
  getHeaders: (apiKey: string) => Record<string, string>;
  getBody: (prompt: string, systemPrompt: string) => any;
  extractContent: (response: any) => string;
}

const AI_PROVIDERS: Record<string, AIProviderConfig> = {
  openrouter: {
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    getHeaders: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'N8N Dashboard',
    }),
    getBody: (prompt: string, systemPrompt: string) => ({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 8000,
    }),
    extractContent: (data: any) => data.choices[0].message.content,
  },
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    getHeaders: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    getBody: (prompt: string, systemPrompt: string) => ({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    }),
    extractContent: (data: any) => data.choices[0].message.content,
  },
  anthropic: {
    name: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    getHeaders: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    getBody: (prompt: string, systemPrompt: string) => ({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    }),
    extractContent: (data: any) => data.content[0].text,
  },
};

export const aiService = {
  async generateWorkflow(description: string, provider: string = 'openrouter'): Promise<any> {
    const providerConfig = AI_PROVIDERS[provider];
    if (!providerConfig) {
      throw new Error(`Unknown AI provider: ${provider}`);
    }

    // Mapper le provider vers le nom de service dans la base de données
    const serviceName = provider === 'openrouter' ? 'automivy' : provider;
    console.log('🔍 [AIService] Recherche de la clé API pour le service:', serviceName);
    
    let apiKey = await apiKeyService.getApiKey(serviceName);
    console.log('🔑 [AIService] Clé API trouvée:', apiKey ? 'OUI' : 'NON');
    
    if (!apiKey) {
      // Debug: récupérer toutes les clés pour voir ce qui est disponible
      const allKeys = await apiKeyService.getApiKeys();
      console.log('📋 [AIService] Toutes les clés disponibles:', allKeys.map(k => ({ 
        service: k.service, 
        name: k.name, 
        key: k.key ? k.key.substring(0, 10) + '...' : 'NULL',
        fullKey: k.key,
        allFields: Object.keys(k)
      })));
      
      // Utiliser la première clé disponible comme fallback
      if (allKeys.length > 0) {
        // Utiliser la clé de la première clé disponible
        apiKey = allKeys[0].key;
        console.log('🔄 [AIService] Utilisation de la première clé disponible:', allKeys[0].service || allKeys[0].name);
        console.log('🔑 [AIService] Clé utilisée:', apiKey ? apiKey.substring(0, 10) + '...' : 'NULL');
        console.log('🔍 [AIService] Structure de la clé:', {
          key: allKeys[0].key,
          service: allKeys[0].service,
          name: allKeys[0].name
        });
      } else {
        throw new Error(`${providerConfig.name} API key not configured. Please add your key in the API Keys section.`);
      }
    }

    const systemPrompt = `You are an expert n8n workflow designer. Generate valid n8n workflow JSON that follows n8n specifications exactly.

CRITICAL REQUIREMENTS - EVERY workflow MUST include these essential nodes:
1. An AI Agent node (@n8n/n8n-nodes-langchain.agent) using OpenRouter API
2. A Calculator Tool node (@n8n/n8n-nodes-langchain.toolCalculator) 
3. A Memory node (@n8n/n8n-nodes-langchain.memoryBufferWindow)
4. OpenRouter Chat Model (@n8n/n8n-nodes-langchain.lmChatOpenRouter) with admin credentials

CREDENTIALS STRATEGY - CRITICAL:
- OpenRouter: ALWAYS use ADMIN credentials (ADMIN_OPENROUTER_CREDENTIAL_ID) - these are automatically available
- User-specific services: Use DYNAMIC credential placeholders that will be injected by the system:
  * USER_IMAP_CREDENTIAL_ID for IMAP email
  * USER_SMTP_CREDENTIAL_ID for SMTP email  
  * USER_SLACK_CREDENTIAL_ID for Slack
  * USER_DISCORD_CREDENTIAL_ID for Discord
  * USER_GOOGLE_CREDENTIAL_ID for Google services
  * USER_DROPBOX_CREDENTIAL_ID for Dropbox
  * USER_GITHUB_CREDENTIAL_ID for GitHub
- The system automatically detects required credentials and shows a modal to the user
- NEVER hardcode credential IDs - always use the placeholder pattern
- The credential injection system handles the rest automatically

WORKFLOW FLEXIBILITY:
- Support ALL types of workflows: email, Slack, Discord, webhooks, APIs, databases, etc.
- Adapt to user's specific needs and platforms
- Include appropriate triggers and actions
- Use best practices for each platform

These are MANDATORY baseline capabilities - the workflow should then add other nodes based on the user's specific request.

VALID NODE TYPES ONLY - Use ONLY these verified n8n node types:
TRIGGERS:
- n8n-nodes-base.webhook (for API triggers)
- n8n-nodes-base.schedule (for time-based triggers) 
- n8n-nodes-base.manualTrigger (for manual execution)
- n8n-nodes-base.files (for file operations)

EMAIL:
- n8n-nodes-base.emailReadImap
- n8n-nodes-base.emailSend
- n8n-nodes-imap.imap

COMMUNICATION:
- n8n-nodes-base.slack
- n8n-nodes-base.discord
- n8n-nodes-base.telegram

APIS & DATA:
- n8n-nodes-base.httpRequest
- n8n-nodes-base.postgres
- n8n-nodes-base.mysql
- n8n-nodes-base.mongoDb

PROCESSING:
- n8n-nodes-base.aggregate
- n8n-nodes-base.set
- n8n-nodes-base.code
- n8n-nodes-base.splitInBatches
- n8n-nodes-base.markdown
- n8n-nodes-base.function

AI & LANGCHAIN:
- @n8n/n8n-nodes-langchain.agent
- @n8n/n8n-nodes-langchain.lmChatOpenRouter
- @n8n/n8n-nodes-langchain.toolCalculator
- @n8n/n8n-nodes-langchain.memoryBufferWindow

NEVER use these invalid node types:
- n8n-nodes-base.watchFolder (does not exist)
- n8n-nodes-base.pdfParser (does not exist)
- n8n-nodes-base.pdfExtract (does not exist)
- n8n-nodes-base.readBinaryFiles (does not exist)
- n8n-nodes-base.writeFile (does not exist)
- Any node type with question marks in the UI

FOR PDF PROCESSING, use ONLY these valid approaches:
1. n8n-nodes-tesseractjs (community node) - BEST for OCR of scanned PDFs
2. n8n-nodes-pdfco (community node) - Alternative with API
3. n8n-nodes-base.extractFromFile (official) - Only for PDFs with selectable text
4. HTTP Request to external PDF processing APIs (PDF.co, Adobe PDF Services, etc.)
5. Schedule Trigger + HTTP Request for file monitoring
6. Webhook Trigger + HTTP Request for manual file processing

COMMUNITY NODES FOR PDF OCR:
- n8n-nodes-tesseractjs: Local OCR, free, supports scanned PDFs
- n8n-nodes-pdfco: API-based OCR, high quality, requires API key
- n8n-nodes-n8ntools-document-processor: Advanced document processing with AI`;

    const prompt = `Generate a complete n8n workflow JSON based on this description: "${description}"

MANDATORY BASELINE NODES (include in EVERY workflow):
1. AI Agent (@n8n/n8n-nodes-langchain.agent)
   - MUST have OpenRouter Chat Model as sub-node
   - Connect Calculator Tool and Memory as tool inputs
   - Use admin OpenRouter credentials
2. OpenRouter Chat Model (@n8n/n8n-nodes-langchain.lmChatOpenRouter)
   - parameters: { "modelName": "anthropic/claude-3.5-sonnet" }
   - credentials: { "openRouterApi": { "id": "ADMIN_OPENROUTER_CREDENTIAL_ID", "name": "ADMIN_OPENROUTER_CREDENTIAL_NAME" } }
   - This connects TO the AI Agent
3. Calculator Tool (@n8n/n8n-nodes-langchain.toolCalculator)
   - parameters: {}
   - Connects TO the AI Agent as tool input
4. Buffer Window Memory (@n8n/n8n-nodes-langchain.memoryBufferWindow)
   - parameters: { "contextWindowLength": 10 }
   - Connects TO the AI Agent

THEN add nodes specific to the request:

ANALYZE the description and determine the workflow type:

${description.toLowerCase().includes('email') ? `
For EMAIL workflows, add these nodes in ORDER:
1. Webhook Trigger (n8n-nodes-base.webhook) at position [250, 300]
   - parameters: { "httpMethod": "POST", "path": "email-summary-trigger" }
   - webhookId: "email-summary-webhook"
2. IMAP Email (n8n-nodes-imap.imap) at position [500, 300]
   - parameters: { "authentication": "coreImapAccount", "resource": "email", "mailboxPath": "INBOX" }
   - credentials: { "imap": { "id": "USER_IMAP_CREDENTIAL_ID", "name": "USER_IMAP_CREDENTIAL_NAME" } }
3. Organize Email Data (n8n-nodes-base.aggregate) at position [750, 300]
   - parameters: { "aggregate": "aggregateAllItemData" }
4. Generate Session ID (n8n-nodes-base.set) at position [1000, 300]
   - parameters: { "assignments": { "assignments": [{"name": "sessionId", "type": "string", "value": "=email-summary-{{ $now.format('YYYY-MM-DD') }}"}] } }
5. AI Agent at position [1250, 300]
   - parameters: {
       "promptType": "define",
       "text": "=Voici les emails reçus aujourd'hui : {{ $json.data.toJsonString() }}\\n\\nAnalyse TOUS les emails et résume sous forme de liste :\\n- Catégorise par priorité (urgent, important, à lire)\\n- Identifie les emails avec le mot 'urgent' dans le sujet ou le contenu\\n- Propose un résumé, puis liste toutes les tâches/action items importantes.\\n- Assure-toi de ne manquer aucun email\\n"
     }
6. Markdown (n8n-nodes-base.markdown) at position [1500, 300]
   - parameters: { "mode": "markdownToHtml", "markdown": "={{ $('AI Agent').item.json.output }}" }
7. SMTP Email (n8n-nodes-base.emailSend) at position [1750, 300]
   - parameters: {
       "fromEmail": "={{USER_EMAIL}}",
       "toEmail": "={{USER_EMAIL}}",
       "subject": "=Résumé quotidien des emails importants du {{ $now.format('DD/MM/YYYY') }}",
       "html": "=<!DOCTYPE html>\\n<html>\\n<head>\\n<style>\\nbody { font-family: Arial, sans-serif; background: #f9fafb; color: #23272f; }\\n.container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 6px #dedede; padding: 24px; }\\nh1 { background: #0066cc; color: #fff; border-radius: 8px; padding: 14px 0; text-align: center; }\\n</style>\\n</head>\\n<body>\\n<div class=\\"container\\">\\n<h1>📬 Résumé & actions des emails reçus ces 24h</h1>\\n<div style=\\"padding: 14px;\\">{{ $json.html }}</div>\\n</div>\\n</body>\\n</html>"
     }
   - credentials: { "smtp": { "id": "USER_SMTP_CREDENTIAL_ID", "name": "USER_SMTP_CREDENTIAL_NAME" } }

CRITICAL: Connect nodes in this exact chain:
Webhook Trigger -> IMAP Email -> Organize Email Data -> Generate Session ID -> AI Agent -> Markdown -> SMTP Email

AND connect these to AI Agent as inputs:
- OpenRouter Chat Model -> AI Agent (ai_languageModel connection)
- Calculator Tool -> AI Agent (ai_tool connection)
- Buffer Memory -> AI Agent (ai_memory connection)
` : ''}

${description.toLowerCase().includes('pdf') || description.toLowerCase().includes('document') || description.toLowerCase().includes('folder') || description.toLowerCase().includes('file') ? `
For PDF/DOCUMENT/FILE workflows, add these nodes in ORDER:
1. Webhook Trigger (n8n-nodes-base.webhook) at position [250, 300]
   - parameters: { "httpMethod": "POST", "path": "pdf-analysis-trigger" }
2. PDF OCR Processing (n8n-nodes-tesseractjs) at position [500, 300]
   - parameters: { 
       "operation": "ocr",
       "language": "fra",
       "imageData": "={{ $json.fileData }}"
     }
3. AI Agent - Analysis at position [750, 300]
   - parameters: {
       "promptType": "define",
       "text": "=Analyse ce contenu de devis PDF :\\n\\n{{ $json.body }}\\n\\nVeuillez :\\n1. Identifier toutes les garanties d'assurance et les regrouper par catégorie\\n2. Comparer les niveaux de couverture et identifier les lacunes\\n3. Fournir des recommandations professionnelles\\n4. Lister les risques potentiels ou couvertures manquantes\\n5. Suggérer des améliorations\\n\\nFormatez la réponse en sections claires avec des puces."
     }
4. Set Data (n8n-nodes-base.set) at position [1000, 300]
   - parameters: {
       "assignments": {
         "assignments": [
           {"name": "analysis", "type": "string", "value": "={{ $json.output }}"},
           {"name": "timestamp", "type": "string", "value": "={{ $now.format('YYYY-MM-DD HH:mm:ss') }}"}
         ]
       }
     }
5. Markdown (n8n-nodes-base.markdown) at position [1250, 300]
   - parameters: { "mode": "markdownToHtml", "markdown": "={{ $json.analysis }}" }
6. SMTP Email (n8n-nodes-base.emailSend) at position [1500, 300]
   - parameters: {
       "fromEmail": "={{$workflow.variables.senderEmail}}",
       "toEmail": "={{$workflow.variables.recipientEmail}}",
       "subject": "Analyse du Devis d'Assurance - {{ $json.timestamp }}",
       "html": "=<!DOCTYPE html>\\n<html>\\n<head>\\n<style>\\nbody{font-family:Arial,sans-serif;line-height:1.6;color:#333}\\n.container{max-width:800px;margin:0 auto;padding:20px}\\n</style>\\n</head>\\n<body>\\n<div class=\\"container\\">\\n<h2>Analyse du Devis d'Assurance</h2>\\n{{ $json.html }}\\n</div>\\n</body>\\n</html>"
     }
   - credentials: { "smtp": { "id": "USER_SMTP_CREDENTIAL_ID", "name": "USER_SMTP_CREDENTIAL_NAME" } }

CRITICAL: Connect nodes in this exact chain:
Webhook Trigger -> HTTP Request -> AI Agent -> Set Data -> Markdown -> SMTP Email

AND connect these to AI Agent as inputs:
- OpenRouter Chat Model -> AI Agent (ai_languageModel connection)
- Calculator Tool -> AI Agent (ai_tool connection)
- Buffer Memory -> AI Agent (ai_memory connection)
` : ''}

${description.toLowerCase().includes('slack') ? `
For SLACK workflows, add these nodes in ORDER:
1. Webhook Trigger (n8n-nodes-base.webhook) at position [250, 300]
   - parameters: { "httpMethod": "POST", "path": "slack-trigger" }
2. Slack Message (n8n-nodes-base.slack) at position [500, 300]
   - parameters: { "operation": "post", "channel": "#general", "text": "={{ $json.message }}" }
   - credentials: { "slackApi": { "id": "USER_SLACK_CREDENTIAL_ID", "name": "USER_SLACK_CREDENTIAL_NAME" } }
3. AI Agent at position [750, 300]
   - parameters: { "promptType": "define", "text": "Process this Slack message: {{ $json.text }}" }
4. Slack Response (n8n-nodes-base.slack) at position [1000, 300]
   - parameters: { "operation": "post", "channel": "={{ $json.channel }}", "text": "={{ $json.response }}" }
   - credentials: { "slackApi": { "id": "USER_SLACK_CREDENTIAL_ID", "name": "USER_SLACK_CREDENTIAL_NAME" } }

CRITICAL: Connect nodes in this exact chain:
Webhook Trigger -> Slack Message -> AI Agent -> Slack Response
` : ''}

${description.toLowerCase().includes('discord') ? `
For DISCORD workflows, add these nodes in ORDER:
1. Webhook Trigger (n8n-nodes-base.webhook) at position [250, 300]
   - parameters: { "httpMethod": "POST", "path": "discord-trigger" }
2. Discord Message (n8n-nodes-base.discord) at position [500, 300]
   - parameters: { "operation": "post", "channel": "general", "content": "={{ $json.message }}" }
   - credentials: { "discordApi": { "id": "USER_DISCORD_CREDENTIAL_ID", "name": "USER_DISCORD_CREDENTIAL_NAME" } }
3. AI Agent at position [750, 300]
   - parameters: { "promptType": "define", "text": "Process this Discord message: {{ $json.content }}" }
4. Discord Response (n8n-nodes-base.discord) at position [1000, 300]
   - parameters: { "operation": "post", "channel": "={{ $json.channel }}", "content": "={{ $json.response }}" }
   - credentials: { "discordApi": { "id": "USER_DISCORD_CREDENTIAL_ID", "name": "USER_DISCORD_CREDENTIAL_NAME" } }

CRITICAL: Connect nodes in this exact chain:
Webhook Trigger -> Discord Message -> AI Agent -> Discord Response
` : ''}

${description.toLowerCase().includes('api') || description.toLowerCase().includes('http') ? `
For API/HTTP workflows, add these nodes in ORDER:
1. Webhook Trigger (n8n-nodes-base.webhook) at position [250, 300]
   - parameters: { "httpMethod": "POST", "path": "api-trigger" }
2. HTTP Request (n8n-nodes-base.httpRequest) at position [500, 300]
   - parameters: { "method": "GET", "url": "={{ $json.apiUrl }}", "headers": "={{ $json.headers }}" }
3. AI Agent at position [750, 300]
   - parameters: { "promptType": "define", "text": "Process this API response: {{ $json.data }}" }
4. HTTP Response (n8n-nodes-base.respondToWebhook) at position [1000, 300]
   - parameters: { "responseMode": "responseNode", "responseBody": "={{ $json.processedData }}" }

CRITICAL: Connect nodes in this exact chain:
Webhook Trigger -> HTTP Request -> AI Agent -> HTTP Response
` : ''}

${description.toLowerCase().includes('database') || description.toLowerCase().includes('db') ? `
For DATABASE workflows, add these nodes in ORDER:
1. Webhook Trigger (n8n-nodes-base.webhook) at position [250, 300]
   - parameters: { "httpMethod": "POST", "path": "db-trigger" }
2. Database Query (n8n-nodes-base.postgres) at position [500, 300]
   - parameters: { "operation": "executeQuery", "query": "={{ $json.query }}" }
   - credentials: { "postgres": { "id": "USER_DB_CREDENTIAL_ID", "name": "USER_DB_CREDENTIAL_NAME" } }
3. AI Agent at position [750, 300]
   - parameters: { "promptType": "define", "text": "Analyze this database data: {{ $json.data }}" }
4. Database Update (n8n-nodes-base.postgres) at position [1000, 300]
   - parameters: { "operation": "executeQuery", "query": "={{ $json.updateQuery }}" }
   - credentials: { "postgres": { "id": "USER_DB_CREDENTIAL_ID", "name": "USER_DB_CREDENTIAL_NAME" } }

CRITICAL: Connect nodes in this exact chain:
Webhook Trigger -> Database Query -> AI Agent -> Database Update
` : ''}

GENERAL WORKFLOW PATTERNS:
- Always start with appropriate trigger (webhook, schedule, manual, etc.)
- Include AI Agent for intelligent processing
- Add platform-specific nodes based on description
- End with appropriate action (send message, update data, etc.)

Node positioning:
- Main workflow horizontally: start at [250, 300], increment X by 250
- AI Agent tools vertically below: Y = 500, 650, 800
- Platform nodes: adapt positioning based on workflow complexity

Return ONLY valid JSON with this EXACT structure:
{
  "name": "Workflow Name",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [{"field": "hours", "hoursInterval": 1}]
        }
      },
      "id": "uuid1",
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.schedule",
      "typeVersion": 1.2,
      "position": [250, 300]
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [[{"node": "IMAP Email", "type": "main", "index": 0}]]
    },
    "OpenRouter Chat Model": {
      "ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]
    },
    "Calculator Tool": {
      "ai_tool": [[{"node": "AI Agent", "type": "ai_tool", "index": 0}]]
    },
    "Buffer Window Memory": {
      "ai_memory": [[{"node": "AI Agent", "type": "ai_memory", "index": 0}]]
    }
  }
}

CRITICAL RULES:
1. Every node MUST have complete "parameters" object - NEVER use empty {}
2. ALL connections must be properly defined
3. Use these connection types:
   - "main" for regular workflow connections
   - "ai_languageModel" for OpenRouter -> AI Agent
   - "ai_tool" for Calculator -> AI Agent
   - "ai_memory" for Memory -> AI Agent
4. Platform-specific requirements:
   - Email: IMAP/SMTP with proper credentials
   - Slack: Slack API with proper channels
   - Discord: Discord API with proper channels
   - APIs: HTTP requests with proper headers
   - Database: SQL queries with proper credentials
5. Always include credential placeholders for dynamic injection
6. Use appropriate triggers for each workflow type

CRITICAL FINAL RULES:
1. NEVER use invalid node types like "n8n-nodes-base.watchFolder", "n8n-nodes-base.pdfParser", "n8n-nodes-base.pdfExtract", "n8n-nodes-base.readBinaryFiles", "n8n-nodes-base.writeFile"
2. ALWAYS use valid n8n node types from the list above
3. For file monitoring, use Schedule Trigger + HTTP Request to external APIs
4. For PDF processing, use HTTP Request to PDF.co or similar services
5. For file operations, use HTTP Request to external file services
6. Every node MUST have complete parameters - never use empty {}
7. ALL connections must be properly defined with correct connection types
8. Use workflow variables for dynamic values like email addresses and API keys
9. Test every node type to ensure it exists in n8n before including it
10. For folder monitoring, use Schedule Trigger that checks external file services via HTTP Request

CREDENTIAL INJECTION SYSTEM:
- OpenRouter credentials are ADMIN-level and automatically available (ADMIN_OPENROUTER_CREDENTIAL_ID)
- User credentials are dynamically injected via the modal system:
  * When user deploys workflow, system detects required credentials
  * Modal automatically appears asking for user credentials
  * System creates credentials in n8n and injects them into workflow
  * User never needs to manually configure credentials
- Always use placeholder pattern: USER_[SERVICE]_CREDENTIAL_ID
- The credentialInjector service handles all the complexity automatically

ALTERNATIVES FOR FILE OPERATIONS:
- Instead of "readBinaryFiles": Use HTTP Request to file storage APIs (Google Drive, Dropbox, etc.)
- Instead of "pdfExtract": Use HTTP Request to PDF processing APIs (PDF.co, Adobe PDF Services)
- Instead of "writeFile": Use HTTP Request to file storage APIs or email attachments
- Instead of "watchFolder": Use Schedule Trigger + HTTP Request to file monitoring APIs

Generate a COMPLETE, FUNCTIONAL workflow with ALL parameters filled in and ONLY valid n8n node types.`;

    const response = await fetch(providerConfig.endpoint, {
      method: 'POST',
      headers: providerConfig.getHeaders(apiKey),
      body: JSON.stringify(providerConfig.getBody(prompt, systemPrompt)),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${providerConfig.name} API error: ${error}`);
    }

    const data = await response.json();
    const content = providerConfig.extractContent(data);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const workflow = JSON.parse(jsonMatch[0]);

    if (!workflow.settings) {
      workflow.settings = {
        executionOrder: 'v1'
      };
    }

    if (!workflow.active) {
      workflow.active = false;
    }

    return workflow;
  }
};
