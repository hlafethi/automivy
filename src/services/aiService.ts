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
      model: 'openai/gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
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

    const apiKey = await apiKeyService.getApiKey(provider);
    if (!apiKey) {
      throw new Error(`${providerConfig.name} API key not configured. Please add your key in the API Keys section.`);
    }

    const systemPrompt = `You are an expert n8n workflow designer. Generate valid n8n workflow JSON that follows n8n specifications exactly.

CRITICAL REQUIREMENTS - EVERY workflow MUST include these 3 essential nodes:
1. An AI Agent node (@n8n/n8n-nodes-langchain.agent) using OpenRouter API
2. A Calculator Tool node (@n8n/n8n-nodes-langchain.toolCalculator)
3. A Memory node (@n8n/n8n-nodes-langchain.memoryBufferWindow)

These are MANDATORY baseline capabilities - the workflow should then add other nodes based on the user's specific request.`;

    const prompt = `Generate a complete n8n workflow JSON based on this description: "${description}"

MANDATORY BASELINE NODES (include in EVERY workflow):
1. AI Agent (@n8n/n8n-nodes-langchain.agent)
   - MUST have OpenRouter Chat Model as sub-node
   - Connect Calculator Tool and Memory as tool inputs
2. OpenRouter Chat Model (@n8n/n8n-nodes-langchain.lmChatOpenRouter)
   - parameters: { "modelName": "openai/gpt-3.5-turbo" }
   - This connects TO the AI Agent
3. Calculator Tool (@n8n/n8n-nodes-langchain.toolCalculator)
   - parameters: {}
   - Connects TO the AI Agent as tool input
4. Buffer Window Memory (@n8n/n8n-nodes-langchain.memoryBufferWindow)
   - parameters: { "contextWindowLength": 10 }
   - Connects TO the AI Agent

THEN add nodes specific to the request:
${description.toLowerCase().includes('email') ? `
For EMAIL workflows, add these nodes in ORDER:
1. Schedule Trigger (n8n-nodes-base.schedule) at position [250, 300]
   - parameters: {
       "rule": {
         "interval": [{"field": "hours", "hoursInterval": 1}]
       }
     }
2. IMAP Email (n8n-nodes-base.emailReadImap) at position [500, 300]
   - parameters: { "mailbox": "INBOX", "options": { "forceReconnect": true } }
3. Loop Over Items (n8n-nodes-base.splitInBatches) at position [750, 300]
   - parameters: { "batchSize": 1, "options": {} }
4. Code Node (n8n-nodes-base.code) at position [1000, 300] to extract email text
   - parameters: {
       "mode": "runOnceForAllItems",
       "jsCode": "return items.map(item => ({json: {subject: item.json.subject, from: item.json.from, text: item.json.text}}));"
     }
5. AI Agent at position [1250, 300]
   - parameters: {
       "promptType": "define",
       "text": "Analyze this email and classify urgency as High, Medium, or Low. Email: {{ $json.subject }} - {{ $json.text }}"
     }
6. Aggregate (n8n-nodes-base.aggregate) at position [1500, 300]
   - parameters: { "aggregate": "aggregateAllItemData" }
7. Set node (n8n-nodes-base.set) at position [1750, 300]
   - parameters: {
       "mode": "manual",
       "assignments": {
         "assignments": [{"id": "1", "name": "summary", "type": "string", "value": "={{ $json }}"}]
       }
     }
8. SMTP Email (n8n-nodes-base.emailSend) at position [2000, 300]
   - parameters: {
       "toEmail": "user@example.com",
       "subject": "Email Priority Summary",
       "text": "={{ $json.summary }}"
     }

CRITICAL: Connect nodes in this exact chain:
Schedule -> IMAP Email -> Loop Over Items -> Code -> AI Agent -> Aggregate -> Set -> SMTP Email

AND connect these to AI Agent as inputs:
- OpenRouter Chat Model -> AI Agent (ai_languageModel connection)
- Calculator Tool -> AI Agent (ai_tool connection)
- Buffer Memory -> AI Agent (ai_memory connection)
` : ''}

Node positioning:
- Main workflow horizontally: start at [250, 300], increment X by 250
- AI Agent tools vertically below: Y = 500, 650, 800

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
2. Schedule Trigger MUST have: "rule": {"interval": [{"field": "hours", "hoursInterval": 1}]}
3. IMAP Email MUST have: "mailbox": "INBOX"
4. SMTP Email MUST have: "toEmail", "subject", "text" fields
5. ALL connections must be properly defined
6. Use these connection types:
   - "main" for regular workflow connections
   - "ai_languageModel" for OpenRouter -> AI Agent
   - "ai_tool" for Calculator -> AI Agent
   - "ai_memory" for Memory -> AI Agent

Essential node types:
- n8n-nodes-base.schedule
- n8n-nodes-base.emailReadImap
- n8n-nodes-base.emailSend
- n8n-nodes-base.splitInBatches
- n8n-nodes-base.aggregate
- n8n-nodes-base.set
- n8n-nodes-base.code
- @n8n/n8n-nodes-langchain.agent
- @n8n/n8n-nodes-langchain.lmChatOpenRouter (with modelName parameter)
- @n8n/n8n-nodes-langchain.toolCalculator
- @n8n/n8n-nodes-langchain.memoryBufferWindow

Generate a COMPLETE, FUNCTIONAL workflow with ALL parameters filled in.`;

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
