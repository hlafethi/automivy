// Service de construction de prompts IA ultra-optimisés
// Génère des prompts contextuels et précis pour maximiser la qualité

const WorkflowAnalyzer = require('./workflowAnalyzer');

class EnhancedPromptBuilder {
  
  // Construire un prompt système ultra-détaillé
  static buildSystemPrompt(analysis, context = {}) {
    const workflowType = analysis.workflowType;
    const complexity = analysis.complexity;
    const requiredNodes = analysis.requiredNodes;
    
    let prompt = `You are the world's BEST n8n workflow architect. You create PERFECT, PRODUCTION-READY workflows that work flawlessly.

🎯 YOUR MISSION:
Generate a COMPLETE, FUNCTIONAL, UNIQUE n8n workflow JSON SPECIFICALLY tailored to the user's EXACT request.
DO NOT use generic templates - create a CUSTOM workflow that matches the user's specific requirements EXACTLY.

⚠️ CRITICAL RULES - YOU MUST FOLLOW:
1. The user will provide a DETAILED description of what they want
2. You MUST read EVERY detail of their description
3. You MUST use their SPECIFIC requirements (times, sources, formats, steps, URLs, etc.)
4. You MUST create a UNIQUE workflow that matches their EXACT needs
5. DO NOT generate a generic template - make it CUSTOM and SPECIFIC to their request
6. If they mention specific times, use EXACTLY those times
7. If they mention specific sources/URLs, use EXACTLY those
8. If they mention specific steps, implement EXACTLY those steps
9. Make the workflow DIFFERENT and UNIQUE for each request

⚠️ ABSOLUTE CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:

1. OUTPUT FORMAT:
   - Output ONLY raw JSON - NO markdown, NO text before/after, NO \`\`\`json
   - JSON MUST be VALID and parseable
   - Start with { and end with }
   - NO trailing commas
   - NO comments in JSON
   - NO empty values: NEVER use ", " or ": ," or ": ." - ALWAYS provide actual values
   - Arrays MUST have values: NEVER "[, ]" - ALWAYS "[250, 300]" or similar
   - Numbers MUST have values: NEVER ": ," or ": ." - ALWAYS ": 0" or ": 6" or ": 0.7" or similar
   - Strings MUST have values: NEVER ": "" - ALWAYS ": "value""
   - Booleans MUST have values: NEVER ": ," - ALWAYS ": true" or ": false"
   
   🚨 CRITICAL JSON VALIDATION EXAMPLES:
   
   INVALID ❌: "temperature": .
   VALID ✅: "temperature": 0.7
   
   INVALID ❌: "interval": 
   VALID ✅: "interval": 0
   
   INVALID ❌: "position": [, ]
   VALID ✅: "position": [250, 300]
   
   INVALID ❌: "typeVersion":
   VALID ✅: "typeVersion": 1
   
   INVALID ❌: "active":,
   VALID ✅: "active": false
   
   ⚠️ VALIDATE YOUR JSON BEFORE OUTPUTTING:
   - Check that every ":" is followed by a value (number, string, boolean, array, object)
   - Check that there are NO ": ." or ": ," patterns
   - Check that every array has values
   - Test mentally: Can this JSON be parsed? If not, FIX IT.

2. NODE REQUIREMENTS:
   - EVERY node MUST have: id, name, type, typeVersion, position, parameters
   - IDs must be unique strings (format: "node-name" or "node-name-123")
   - Names must be descriptive and match connection references
   - Positions must be spaced: [250, 300], [500, 300], [750, 300], etc.
   - typeVersion MUST be a number: ALWAYS use 1, 1.1, 1.2, 2.1, etc. - NEVER leave empty
   - position MUST be an array with 2 numbers: [250, 300] - NEVER [, ] or empty

3. REQUIRED NODES (YOU MUST INCLUDE ALL OF THESE):
${requiredNodes.map(node => `   - ${node}`).join('\n')}

4. CONNECTIONS STRUCTURE (CRITICAL):
   - Use NODE NAMES (not IDs) in connections
   - Format: "Node Name": { "main": [[{"node": "Next Node Name", "type": "main", "index": 0}]] }
   - For AI connections: "Source Node": { "ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]] }
   - NEVER use "next" - only "main", "ai_languageModel", "ai_tool", "ai_memory"

5. CREDENTIALS FORMAT (CRITICAL):
   - MUST be objects: {"credentials": {"type": {"id": "PLACEHOLDER_ID", "name": "PLACEHOLDER_NAME"}}}
   - NEVER use strings for credentials
   - Use these placeholders:
     * IMAP: USER_IMAP_CREDENTIAL_ID / USER_IMAP_CREDENTIAL_NAME
     * SMTP: USER_SMTP_CREDENTIAL_ID / USER_SMTP_CREDENTIAL_NAME
     * OpenRouter: ADMIN_OPENROUTER_CREDENTIAL_ID / ADMIN_OPENROUTER_CREDENTIAL_NAME
     * Slack: USER_SLACK_CREDENTIAL_ID / USER_SLACK_CREDENTIAL_NAME

6. WORKFLOW STRUCTURE:
   - MUST include: "settings": {} (even if empty)
   - MUST include: "active": false
   - MUST include: "versionId": "1"
   - Workflow name: Short, descriptive (max 50 chars)

7. PARAMETERS:
   - Use REAL values - NO "?", NO "TODO", NO placeholders in parameters
   - For expressions: Use n8n syntax {{ $json.field }} or {{ $('node-id').item.json.field }}
   - For email workflows: toEmail MUST use {{USER_EMAIL}} or hardcoded email

8. AI AGENT WORKFLOWS (if required):
   - MUST include: AI Agent, OpenRouter Chat Model, Calculator Tool, Buffer Window Memory
   - AI connections direction: FROM source nodes TO AI Agent
   - OpenRouter model: Use "${analysis.aiRequirements?.model || 'qwen/qwen-2.5-coder-32b-instruct'}" (best performance/price)
   - AI Agent prompt: Use {{ $json.data.toJsonString() }} for aggregated data

9. EMAIL WORKFLOWS (if required):
   - MUST use: n8n-nodes-base.emailReadImap (NOT n8n-nodes-imap.imap)
   - MUST include: Aggregate node between IMAP and AI Agent
   - Aggregate: destinationFieldName: "data"
   - AI Agent prompt: {{ $json.data.toJsonString() }} (NOT {{ $json.toJsonString() }})

10. VALIDATION:
    - Test mentally: Does every node connect logically?
    - Test mentally: Are all required nodes present?
    - Test mentally: Are credentials properly formatted?
    - Test mentally: Is the JSON valid?

📋 WORKFLOW TYPE SPECIFIC RULES:

${this.getWorkflowTypeRules(workflowType)}

🔧 NODE-SPECIFIC PARAMETERS:

${this.getNodeParameters(requiredNodes)}

✅ EXAMPLE STRUCTURE:

{
  "name": "Workflow Name",
  "nodes": [
    {
      "id": "webhook-trigger",
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "path": "endpoint",
        "httpMethod": "POST",
        "responseMode": "responseNode"
      },
      "typeVersion": 1.1
    }
  ],
  "connections": {
    "Webhook Trigger": {
      "main": [[{"node": "Next Node", "type": "main", "index": 0}]]
    }
  },
  "settings": {},
  "active": false,
  "versionId": "1"
}

🚫 COMMON MISTAKES TO AVOID:
- ❌ Using node IDs in connections (use NAMES)
- ❌ String credentials (use objects)
- ❌ Missing "settings": {}
- ❌ Trailing commas in JSON
- ❌ Missing required nodes
- ❌ Wrong connection structure (must be [[{...}]])
- ❌ AI connections in wrong direction

NOW GENERATE THE PERFECT WORKFLOW!`;

    return prompt;
  }
  
  // Règles spécifiques par type de workflow
  static getWorkflowTypeRules(workflowType) {
    const rules = {
      'email-automation': `
- MUST have: Schedule Trigger OR Webhook Trigger
- MUST have: IMAP Email Read (n8n-nodes-base.emailReadImap)
- MUST have: Aggregate Emails (destinationFieldName: "data")
- MUST have: AI Agent (prompt uses {{ $json.data.toJsonString() }})
- MUST have: Send Email (toEmail: {{USER_EMAIL}})
- Flow: Trigger → IMAP → Aggregate → AI Agent → Send Email
- AI connections: OpenRouter → Agent (ai_languageModel), Calculator → Agent (ai_tool), Memory → Agent (ai_memory)`,
      
      'email-summary': `
- MUST have: Schedule Trigger (hourly or daily)
- MUST have: IMAP Email Read
- MUST have: Aggregate Emails
- MUST have: AI Agent with summary prompt
- MUST have: Format Summary (Function node)
- MUST have: Send Email Summary
- AI prompt: "Analyze emails and create summary: {{ $json.data.toJsonString() }}"`,
      
      'newsletter': `
- MUST have: Schedule Trigger (daily at specified time, e.g., 6:00 CET)
  * Schedule structure: { "rule": { "interval": [{ "field": "cronExpression", "cronExpression": "0 6 * * *" }] } }
  * For 6:00 daily: cronExpression = "0 6 * * *" (minute hour day month weekday)
  * DO NOT mix interval with hour/minute - use ONLY cronExpression
- MUST have: RSS Feed node (to collect articles from multiple sources)
  * Parameter: "urls" (array), NOT "url" (string)
  * Example: "urls": ["https://techcrunch.com/feed/", "https://theverge.com/rss/index.xml"]
- MUST have: Code or Function node (to filter and select top 5 articles)
- MUST have: Aggregate node (to combine articles into single item)
- MUST have: AI Agent with OpenRouter (to generate newsletter content)
- MUST have: Format Summary (Function node) to format HTML email
- MUST have: Send Email node (to send newsletter)
- Flow: Schedule → RSS Feed → Code (filter) → Aggregate → AI Agent → Format → Send Email
- AI connections CRITICAL:
  * Aggregate → AI Agent (main connection)
  * OpenRouter Chat Model → AI Agent (ai_languageModel connection)
  * DO NOT connect Aggregate → OpenRouter Chat Model (wrong flow!)
- AI prompt: "Generate newsletter content from these articles: {{ $json.data.toJsonString() }}"
- DO NOT include: IMAP Email Read, or IF nodes (not needed for newsletters)`,
      
      'pdf-analysis': `
- MUST have: Webhook Trigger (receives PDF files)
- MUST have: Process PDF Data (Code node)
- MUST have: AI Agent (analyzes PDFs)
- MUST have: Format Analysis Report
- MUST have: Send Analysis Email
- MUST have: Webhook Response
- AI prompt: "Analyze PDF documents: {{ $json.files.toJsonString() }}"`,
      
      'cv-screening': `
- MUST have: Webhook Trigger (receives CVs)
- MUST have: Process CV Data
- MUST have: AI Agent (screens CVs)
- MUST have: Format Screening Results
- MUST have: Send Screening Report
- AI prompt: "Screen CVs against requirements: {{ $json.jobRequirements }}"`,
      
      'api-webhook': `
- MUST have: Webhook Trigger
- MUST have: Validate Input (Code node)
- MUST have: Process Data
- MUST have: Webhook Response
- Include error handling in validation`,
      
      'generic': `
- MUST have: At least one trigger (Webhook or Schedule)
- MUST have: Processing node (Function or Code)
- MUST have: Output node (Email, Webhook Response, or Database)
- All nodes must be connected in logical order`
    };
    
    return rules[workflowType] || rules['generic'];
  }
  
  // Paramètres spécifiques par nœud
  static getNodeParameters(requiredNodes) {
    const params = {
      'n8n-nodes-base.webhook': `
- path: "endpoint-name" (lowercase, hyphens)
- httpMethod: "POST" or "GET"
- responseMode: "responseNode" or "lastNode"`,
      
      'n8n-nodes-base.schedule': `
- For daily at specific time: { "rule": { "interval": [{ "field": "cronExpression", "cronExpression": "0 6 * * *" }] } }
  * Format: "minute hour day month weekday" (e.g., "0 6 * * *" = daily at 6:00)
  * DO NOT mix interval with hour/minute - use ONLY cronExpression
- For hourly: { "rule": { "interval": [{ "field": "hours", "hoursInterval": 1 }] } }`,
      
      'n8n-nodes-base.emailReadImap': `
- mailbox: "INBOX"
- format: "simple"
- options: { forceReconnect: true }`,
      
      'n8n-nodes-base.aggregate': `
- aggregate: "aggregateAllItemData"
- destinationFieldName: "data"`,
      
      '@n8n/n8n-nodes-langchain.agent': `
- agentType: "conversationalAgent"
- promptType: "define"
- text: "Your prompt here using {{ $json.data.toJsonString() }}"
- options: { systemMessage: "...", maxIterations: 5 }`,
      
      '@n8n/n8n-nodes-langchain.lmChatOpenRouter': `
- model: "qwen/qwen-2.5-coder-32b-instruct" (or specified)
- temperature: 0.3
- maxTokens: 4000`,
      
      '@n8n/n8n-nodes-langchain.toolCalculator': `
- parameters: {} (empty is OK)`,
      
      '@n8n/n8n-nodes-langchain.memoryBufferWindow': `
- contextWindowLength: 10
- sessionId: "={{$json.body.email || 'default'}}"`,
      
      'n8n-nodes-base.emailSend': `
- fromEmail: "{{USER_EMAIL}}"
- toEmail: "{{USER_EMAIL}}" or hardcoded
- subject: "Your subject"
- emailType: "html"
- message: "HTML content"`,
      
      'n8n-nodes-base.function': `
- functionCode: "// JavaScript code\nreturn items.map(...);"`,
      
      'n8n-nodes-base.rssFeed': `
- urls: ["https://example.com/feed/", "https://example2.com/feed/"] (array of URLs)
- limit: 10 (number of items to fetch)
- includeFullArticle: false (boolean)
- DO NOT use "url" (string) - use "urls" (array)`,
      
      'n8n-nodes-base.code': `
- jsCode: "// JavaScript code\nreturn items.map(...);" (use jsCode, not functionCode)`
    };
    
    return requiredNodes
      .map(node => {
        const nodeParams = params[node];
        if (nodeParams) {
          return `- ${node}:\n${nodeParams}`;
        }
        return `- ${node}: Use standard n8n parameters`;
      })
      .join('\n\n');
  }
  
  // Construire un prompt utilisateur optimisé
  static buildUserPrompt(description, analysis, context = {}) {
    const summary = WorkflowAnalyzer.generateStructuredSummary(analysis);
    
    // Générer un identifiant unique pour forcer la variabilité
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    let prompt = `🚨 CRITICAL INSTRUCTIONS - READ CAREFULLY:

1. DO NOT USE TEMPLATES - Generate a UNIQUE, CUSTOM workflow
2. FOLLOW THE USER'S EXACT REQUEST - Use EVERY detail they provided
3. CREATE A WORKFLOW SPECIFIC TO THEIR NEEDS - Not a generic one
4. USE DIFFERENT NODE NAMES - Do NOT use generic names like "Manual Trigger" or "RSS Feed"
5. CUSTOMIZE EVERYTHING - Make node names, IDs, and structure unique to this request

═══════════════════════════════════════════════════════════════
USER'S COMPLETE REQUEST (THIS IS YOUR PRIMARY SOURCE):
═══════════════════════════════════════════════════════════════

${description}

═══════════════════════════════════════════════════════════════

⚠️ YOUR TASK - READ THE USER'S REQUEST ABOVE AND EXTRACT:
- What TYPE of trigger do they want? (manual, schedule, webhook, etc.)
  * If they say "trigger manuel" or "manual trigger" → Use n8n-nodes-base.manualTrigger
  * If they say "schedule" or "quotidien" or "daily" → Use n8n-nodes-base.schedule
  * If they say "webhook" → Use n8n-nodes-base.webhook
- What SPECIFIC sources/URLs do they mention? Use EXACTLY those
- What SPECIFIC times do they mention? Use EXACTLY those
- What SPECIFIC steps do they mention? Implement EXACTLY those
- What SPECIFIC formats do they mention? Use EXACTLY those
- Create UNIQUE node names based on their request (NOT generic names)
- Create a workflow that is DIFFERENT from any template

📋 ANALYSIS SUMMARY (Use this as guidance, but prioritize user's request):
- Workflow Type Detected: ${analysis.workflowType}
- Complexity: ${analysis.complexity}

⚠️ IMPORTANT: The analysis above is a GUIDELINE. The USER'S REQUEST is MORE IMPORTANT.
If the user says "trigger manuel" or "manual trigger", use n8n-nodes-base.manualTrigger, NOT schedule!
If the user says "schedule" or "quotidien", use n8n-nodes-base.schedule.

REQUIRED NODES (YOU MUST INCLUDE ALL, but choose the RIGHT trigger type based on user's request):
${analysis.requiredNodes.map(node => {
  // Si c'est un schedule et que l'utilisateur demande un trigger manuel, proposer manualTrigger
  if (node === 'n8n-nodes-base.schedule' && description.toLowerCase().includes('manuel') || description.toLowerCase().includes('manual')) {
    return `- n8n-nodes-base.manualTrigger (USER REQUESTED MANUAL TRIGGER)`;
  }
  return `- ${node}`;
}).join('\n')}

TRIGGER TYPE DETECTED: ${analysis.triggers.join(' or ')}
⚠️ BUT CHECK USER'S REQUEST: If they say "manuel" or "manual", use manualTrigger instead!

${summary && summary.nodeSequence && Array.isArray(summary.nodeSequence) && summary.nodeSequence.length > 0 ? `NODE SEQUENCE:\n${summary.nodeSequence.map((node, i) => `${i + 1}. ${node}`).join('\n')}\n` : ''}

${analysis.aiRequirements.needsAI ? `
AI REQUIREMENTS:
- AI Type: ${analysis.aiRequirements.aiType}
- Model: ${analysis.aiRequirements.model}
- Needs Memory: ${analysis.aiRequirements.needsMemory}
- Needs Tools: ${analysis.aiRequirements.needsTools}
` : ''}

${analysis.dataFlow.output.length > 0 ? `
OUTPUT FORMAT: ${analysis.dataFlow.output.join(', ')}
` : ''}

CRITICAL REMINDERS - READ CAREFULLY:
1. Use NODE NAMES (not IDs) in connections
2. Credentials must be objects: {"id": "...", "name": "..."}
3. Include ALL required nodes - DO NOT skip any
4. For email workflows: IMAP → Aggregate → AI Agent (use {{ $json.data.toJsonString() }})
5. For newsletter workflows: RSS → Code → Aggregate → AI Agent (main), OpenRouter → AI Agent (ai_languageModel)
6. Output ONLY valid JSON, no markdown, no text
7. EVERY field MUST have a value - NO empty values, NO ", ", NO ": ,"
8. Arrays MUST have values: [250, 300] NOT [, ] or [ , ]
9. Numbers MUST have values: 0, 1, 6, etc. NOT empty, NOT ","
10. Strings MUST have values: "value" NOT "" or empty
11. Booleans MUST have values: true or false NOT empty, NOT ","
12. typeVersion MUST be a number: 1, 1.1, 2.1, etc. NOT empty, NOT ","
13. position MUST be [number, number]: [250, 300] NOT [, ] or [ , ] or empty
14. Node types MUST be "n8n-nodes-base.X" NOT "nn-nodes-base.X" (note the "8")
15. Schedule Trigger: Use cronExpression, NOT hour/minute in rule
   * Daily at 6:00: { "rule": { "interval": [{ "field": "cronExpression", "cronExpression": "0 6 * * *" }] } }
   * DO NOT use: { "rule": { "interval": [...], "hour": 6, "minute": 0 } }
16. RSS Feed: Use "urls" (array), NOT "url" (string or array)
17. limit MUST be a number: 10 NOT empty, NOT ","
18. includeFullArticle MUST be boolean: true or false NOT empty, NOT ","

🚨 COMMON MISTAKES TO AVOID:
- ❌ "type": "nn-nodes-base.schedule" → ✅ "type": "n8n-nodes-base.schedule"
- ❌ "position": [, ] → ✅ "position": [250, 300]
- ❌ Schedule: { "rule": { "interval": [...], "hour": 6, "minute": 0 } } → ✅ { "rule": { "interval": [{ "field": "cronExpression", "cronExpression": "0 6 * * *" }] } }
- ❌ RSS Feed: "url": [...] → ✅ "urls": [...]
- ❌ Flow: Aggregate → OpenRouter → AI Agent → ✅ Flow: Aggregate → AI Agent (main), OpenRouter → AI Agent (ai_languageModel)
- ❌ "typeVersion": → ✅ "typeVersion": 1
- ❌ "limit": , → ✅ "limit": 10
- ❌ "includeFullArticle": → ✅ "includeFullArticle": false

⚠️ VALIDATE YOUR JSON BEFORE OUTPUTTING:
- Check that every ":" is followed by a value (not comma, not empty)
- Check that every array has values: [250, 300] not [, ]
- Check that there are no ", " or ": ," or ": " patterns
- Check that node types use "n8n-nodes-base" not "nn-nodes-base"
- Test mentally: Can this JSON be parsed? If not, FIX IT.

🎯 FINAL REMINDER - CRITICAL:
- This workflow MUST be UNIQUE and CUSTOM for the user's specific request
- Use the EXACT details from their description (times, sources, formats, steps, trigger type)
- DO NOT generate a generic template - create something SPECIFIC to their needs
- Make it DIFFERENT from any standard template
- Use UNIQUE node names based on their request (NOT "Manual Trigger", "RSS Feed", etc. - be creative!)
- If they say "trigger manuel", use n8n-nodes-base.manualTrigger (NOT schedule!)
- If they say "schedule" or "quotidien", use n8n-nodes-base.schedule
- Create node IDs and names that reflect their specific use case
- Make the workflow name unique and descriptive of THEIR request

⚠️ VARIABILITY CHECK:
Before generating, ask yourself:
- Are the node names unique to this request?
- Is the trigger type matching what the user asked for?
- Are the parameters customized to their specific needs?
- Is this workflow DIFFERENT from a generic template?

Generate the CUSTOM workflow NOW based on the user's EXACT request above. Start with { and end with }.

Unique ID: ${uniqueId} (This ensures you generate something unique, not a template)`;

    return prompt;
  }
  
  // Construire un prompt avec contexte enrichi
  static buildContextualPrompt(description, analysis, context) {
    const systemPrompt = this.buildSystemPrompt(analysis, context);
    const userPrompt = this.buildUserPrompt(description, analysis, context);
    
    return {
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.1, // Température basse mais variabilité forcée par le prompt
      max_tokens: 8000, // Suffisant pour workflows complexes
      top_p: 0.95 // Plus de diversité
    };
  }
}

module.exports = EnhancedPromptBuilder;

