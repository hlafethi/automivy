// Bibliothèque de workflows prédéfinis professionnels et adaptatifs
// Plus de 15 types de workflows avec génération intelligente

class EnhancedWorkflowTemplates {
  constructor() {
    this.nodeCounter = 0;
  }

  generateId(prefix) {
    return `${prefix}_${Date.now()}_${this.nodeCounter++}`;
  }

  // Génère un workflow basé sur l'analyse
  generateFromAnalysis(analysis) {
    const workflowType = analysis.workflowType;
    
    console.log(`🎯 [Templates] Génération workflow type: ${workflowType}`);
    
    switch (workflowType) {
      case 'email-automation':
      case 'email-summary':
        return this.createEmailSummaryWorkflow(analysis);
      case 'pdf-analysis':
        return this.createPDFAnalysisWorkflow(analysis);
      case 'cv-screening':
        return this.createCVScreeningWorkflow(analysis);
      case 'cv-analysis':
        return this.createCVAnalysisWorkflow(analysis);
      case 'api-webhook':
        return this.createAPIWebhookWorkflow(analysis);
      case 'data-processing':
        return this.createDataProcessingWorkflow(analysis);
      case 'database-sync':
        return this.createDatabaseSyncWorkflow(analysis);
      case 'notification':
        return this.createNotificationWorkflow(analysis);
      case 'scheduled-task':
        return this.createScheduledTaskWorkflow(analysis);
      case 'ai-agent':
        return this.createAIAgentWorkflow(analysis);
      case 'newsletter':
        return this.createNewsletterWorkflow(analysis);
      case 'form-processing':
        return this.createFormProcessingWorkflow(analysis);
      case 'file-processing':
        return this.createFileProcessingWorkflow(analysis);
      case 'integration':
        return this.createIntegrationWorkflow(analysis);
      default:
        return this.createGenericWorkflow(analysis);
    }
  }

  // 1. Email Summary Workflow (amélioré)
  createEmailSummaryWorkflow(analysis) {
    this.nodeCounter = 0;
    const nodes = [];
    const connections = {};
    
    // Trigger
    const scheduleId = this.generateId('schedule');
    nodes.push({
      id: scheduleId,
      name: 'Schedule Trigger',
      type: 'n8n-nodes-base.schedule',
      position: [250, 300],
      parameters: {
        rule: {
          interval: [{ field: 'hours', hoursInterval: analysis.scheduling?.frequency === 'daily' ? 24 : 1 }]
        }
      },
      typeVersion: 1.1
    });
    
    // IMAP Email Read
    const imapId = this.generateId('imap');
    nodes.push({
      id: imapId,
      name: 'IMAP Email Read',
      type: 'n8n-nodes-base.emailReadImap',
      position: [500, 300],
      parameters: {
        mailbox: 'INBOX',
        format: 'simple',
        options: {
          forceReconnect: true
        }
      },
      credentials: {
        imap: {
          id: 'USER_IMAP_CREDENTIAL_ID',
          name: 'USER_IMAP_CREDENTIAL_NAME'
        }
      },
      typeVersion: 2.1
    });
    
    // Aggregate
    const aggregateId = this.generateId('aggregate');
    nodes.push({
      id: aggregateId,
      name: 'Aggregate Emails',
      type: 'n8n-nodes-base.aggregate',
      position: [750, 300],
      parameters: {
        aggregate: 'aggregateAllItemData',
        destinationFieldName: 'data',
        options: {}
      },
      typeVersion: 1
    });
    
    // AI Agent
    const agentId = this.generateId('agent');
    nodes.push({
      id: agentId,
      name: 'AI Email Summary Agent',
      type: '@n8n/n8n-nodes-langchain.agent',
      position: [1000, 300],
      parameters: {
        agentType: 'conversationalAgent',
        promptType: 'define',
        text: `Analyze the following emails and create a comprehensive summary. Group emails by sender and highlight important information, deadlines, and action items.

Emails data: {{ $json.data.toJsonString() }}

Provide a structured summary with:
1. Key topics and themes
2. Important dates and deadlines
3. Action items
4. Priority emails that need attention`,
        options: {
          systemMessage: 'You are an expert email analyst. Create clear, actionable summaries.',
          maxIterations: 5
        }
      },
      typeVersion: 1.2
    });
    
    // OpenRouter Model
    const openRouterId = this.generateId('openrouter');
    nodes.push({
      id: openRouterId,
      name: 'OpenRouter Chat Model',
      type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
      position: [1000, 500],
      parameters: {
        model: analysis.aiRequirements?.model || 'qwen/qwen-2.5-coder-32b-instruct',
        temperature: 0.3,
        maxTokens: 4000
      },
      credentials: {
        openRouterApi: {
          id: 'ADMIN_OPENROUTER_CREDENTIAL_ID',
          name: 'ADMIN_OPENROUTER_CREDENTIAL_NAME'
        }
      },
      typeVersion: 1
    });
    
    // Calculator Tool
    const calculatorId = this.generateId('calculator');
    nodes.push({
      id: calculatorId,
      name: 'Calculator Tool',
      type: '@n8n/n8n-nodes-langchain.toolCalculator',
      position: [1000, 700],
      parameters: {},
      typeVersion: 1
    });
    
    // Memory
    const memoryId = this.generateId('memory');
    nodes.push({
      id: memoryId,
      name: 'Buffer Window Memory',
      type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
      position: [1000, 900],
      parameters: {
        contextWindowLength: 10,
        sessionId: '={{$json.body.email || "default"}}'
      },
      typeVersion: 1
    });
    
    // Function to format summary
    const functionId = this.generateId('function');
    nodes.push({
      id: functionId,
      name: 'Format Summary',
      type: 'n8n-nodes-base.function',
      position: [1250, 300],
      parameters: {
        functionCode: `// Format the AI summary for email
const summary = items[0].json.output || items[0].json.text || 'No summary available';
const email = items[0].json.body?.email || '{{USER_EMAIL}}';

return [{
  json: {
    summary: summary,
    email: email,
    date: new Date().toISOString(),
    formattedSummary: \`Email Summary - \${new Date().toLocaleDateString('fr-FR')}\n\n\${summary}\`
  }
}];`
      },
      typeVersion: 1
    });
    
    // Send Email
    const emailSendId = this.generateId('emailsend');
    nodes.push({
      id: emailSendId,
      name: 'Send Email Summary',
      type: 'n8n-nodes-base.emailSend',
      position: [1500, 300],
      parameters: {
        fromEmail: '{{USER_EMAIL}}',
        toEmail: '{{USER_EMAIL}}',
        subject: '📧 Email Summary - {{ $now.toFormat("dd/MM/yyyy") }}',
        emailType: 'html',
        message: `<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #4f46e5;">📧 Email Summary</h1>
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <pre style="white-space: pre-wrap; font-family: inherit;">{{ $json.formattedSummary }}</pre>
    </div>
    <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
      Generated by Automivy AI • {{ $now.toFormat("dd/MM/yyyy HH:mm") }}
    </p>
  </div>
</body>
</html>`
      },
      credentials: {
        smtp: {
          id: 'USER_SMTP_CREDENTIAL_ID',
          name: 'USER_SMTP_CREDENTIAL_NAME'
        }
      },
      typeVersion: 2.1
    });
    
    // Connexions
    connections['Schedule Trigger'] = {
      main: [[{ node: 'IMAP Email Read', type: 'main', index: 0 }]]
    };
    connections['IMAP Email Read'] = {
      main: [[{ node: 'Aggregate Emails', type: 'main', index: 0 }]]
    };
    connections['Aggregate Emails'] = {
      main: [[{ node: 'AI Email Summary Agent', type: 'main', index: 0 }]]
    };
    connections['AI Email Summary Agent'] = {
      main: [[{ node: 'Format Summary', type: 'main', index: 0 }]]
    };
    connections['Format Summary'] = {
      main: [[{ node: 'Send Email Summary', type: 'main', index: 0 }]]
    };
    connections['OpenRouter Chat Model'] = {
      ai_languageModel: [[{ node: 'AI Email Summary Agent', type: 'ai_languageModel', index: 0 }]]
    };
    connections['Calculator Tool'] = {
      ai_tool: [[{ node: 'AI Email Summary Agent', type: 'ai_tool', index: 0 }]]
    };
    connections['Buffer Window Memory'] = {
      ai_memory: [[{ node: 'AI Email Summary Agent', type: 'ai_memory', index: 0 }]]
    };
    
    return {
      name: 'Email Summary Automation',
      nodes,
      connections,
      settings: {},
      active: false,
      versionId: '1'
    };
  }

  // 2. PDF Analysis Workflow
  createPDFAnalysisWorkflow(analysis) {
    this.nodeCounter = 0;
    const nodes = [];
    const connections = {};
    
    // Webhook Trigger
    const webhookId = this.generateId('webhook');
    nodes.push({
      id: webhookId,
      name: 'PDF Upload Webhook',
      type: 'n8n-nodes-base.webhook',
      position: [250, 300],
      parameters: {
        path: 'pdf-analysis',
        httpMethod: 'POST',
        responseMode: 'responseNode'
      },
      typeVersion: 1.1
    });
    
    // Code to process PDF data
    const processId = this.generateId('process');
    nodes.push({
      id: processId,
      name: 'Process PDF Data',
      type: 'n8n-nodes-base.code',
      position: [500, 300],
      parameters: {
        jsCode: `// Extract PDF data from webhook
const body = items[0].json.body || {};
const files = body.files || [];
const clientName = body.clientName || 'Client';
const clientEmail = body.clientEmail || '';

// Process each PDF file
const processedFiles = files.map((file, index) => ({
  fileName: file.name || \`file_\${index + 1}.pdf\`,
  data: file.data || file.url || '',
  type: file.type || 'application/pdf'
}));

return [{
  json: {
    clientName,
    clientEmail,
    files: processedFiles,
    fileCount: processedFiles.length,
    timestamp: new Date().toISOString()
  }
}];`
      },
      typeVersion: 2
    });
    
    // AI Agent for PDF Analysis
    const agentId = this.generateId('agent');
    nodes.push({
      id: agentId,
      name: 'PDF Analysis Agent',
      type: '@n8n/n8n-nodes-langchain.agent',
      position: [750, 300],
      parameters: {
        agentType: 'conversationalAgent',
        promptType: 'define',
        text: `Analyze the following PDF documents (insurance quotes) and provide a comprehensive analysis.

Client: {{ $json.clientName }}
Email: {{ $json.clientEmail }}
Number of documents: {{ $json.fileCount }}

PDF Data: {{ $json.files.toJsonString() }}

Provide:
1. Summary of each quote
2. Comparison of offers
3. Recommendations
4. Points of vigilance
5. Professional advice`,
        options: {
          systemMessage: 'You are an expert insurance advisor. Analyze quotes professionally.',
          maxIterations: 5
        }
      },
      typeVersion: 1.2
    });
    
    // OpenRouter Model
    const openRouterId = this.generateId('openrouter');
    nodes.push({
      id: openRouterId,
      name: 'OpenRouter Chat Model',
      type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
      position: [750, 500],
      parameters: {
        model: analysis.aiRequirements?.model || 'qwen/qwen-2.5-coder-32b-instruct',
        temperature: 0.2
      },
      credentials: {
        openRouterApi: {
          id: 'ADMIN_OPENROUTER_CREDENTIAL_ID',
          name: 'ADMIN_OPENROUTER_CREDENTIAL_NAME'
        }
      },
      typeVersion: 1
    });
    
    // Calculator Tool
    const calculatorId = this.generateId('calculator');
    nodes.push({
      id: calculatorId,
      name: 'Calculator Tool',
      type: '@n8n/n8n-nodes-langchain.toolCalculator',
      position: [750, 700],
      parameters: {},
      typeVersion: 1
    });
    
    // Memory
    const memoryId = this.generateId('memory');
    nodes.push({
      id: memoryId,
      name: 'Buffer Window Memory',
      type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
      position: [750, 900],
      parameters: {
        contextWindowLength: 5
      },
      typeVersion: 1
    });
    
    // Format Analysis
    const formatId = this.generateId('format');
    nodes.push({
      id: formatId,
      name: 'Format Analysis Report',
      type: 'n8n-nodes-base.function',
      position: [1000, 300],
      parameters: {
        functionCode: `// Format the analysis report
const analysis = items[0].json.output || items[0].json.text || '';
const clientName = items[0].json.clientName || 'Client';
const clientEmail = items[0].json.clientEmail || '';

return [{
  json: {
    clientName,
    clientEmail,
    analysis,
    reportDate: new Date().toISOString(),
    formattedReport: \`DEVOIR DE CONSEIL ASSURANCE\n==========================\n\nClient: \${clientName}\nEmail: \${clientEmail}\nDate: \${new Date().toLocaleDateString('fr-FR')}\n\n\${analysis}\`
  }
}];`
      },
      typeVersion: 1
    });
    
    // Send Email
    const emailId = this.generateId('email');
    nodes.push({
      id: emailId,
      name: 'Send Analysis Email',
      type: 'n8n-nodes-base.emailSend',
      position: [1250, 300],
      parameters: {
        fromEmail: '{{USER_EMAIL}}',
        toEmail: '={{ $json.clientEmail }}',
        subject: '📋 Devoir de Conseil Assurance - {{ $now.toFormat("dd/MM/yyyy") }}',
        emailType: 'html',
        message: `<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #4f46e5;">📋 Devoir de Conseil Assurance</h1>
    <p><strong>Client:</strong> {{ $json.clientName }}</p>
    <p><strong>Date:</strong> {{ $now.toFormat("dd/MM/yyyy") }}</p>
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <pre style="white-space: pre-wrap; font-family: inherit;">{{ $json.formattedReport }}</pre>
    </div>
  </div>
</body>
</html>`
      },
      credentials: {
        smtp: {
          id: 'USER_SMTP_CREDENTIAL_ID',
          name: 'USER_SMTP_CREDENTIAL_NAME'
        }
      },
      typeVersion: 2.1
    });
    
    // Webhook Response
    const responseId = this.generateId('response');
    nodes.push({
      id: responseId,
      name: 'Webhook Response',
      type: 'n8n-nodes-base.respondToWebhook',
      position: [1500, 300],
      parameters: {
        respondWith: 'json',
        responseBody: '={"success": true, "message": "PDF analysis completed and email sent"}'
      },
      typeVersion: 1
    });
    
    // Connexions
    connections['PDF Upload Webhook'] = {
      main: [[{ node: 'Process PDF Data', type: 'main', index: 0 }]]
    };
    connections['Process PDF Data'] = {
      main: [[{ node: 'PDF Analysis Agent', type: 'main', index: 0 }]]
    };
    connections['PDF Analysis Agent'] = {
      main: [[{ node: 'Format Analysis Report', type: 'main', index: 0 }]]
    };
    connections['Format Analysis Report'] = {
      main: [[{ node: 'Send Analysis Email', type: 'main', index: 0 }]]
    };
    connections['Send Analysis Email'] = {
      main: [[{ node: 'Webhook Response', type: 'main', index: 0 }]]
    };
    connections['OpenRouter Chat Model'] = {
      ai_languageModel: [[{ node: 'PDF Analysis Agent', type: 'ai_languageModel', index: 0 }]]
    };
    connections['Calculator Tool'] = {
      ai_tool: [[{ node: 'PDF Analysis Agent', type: 'ai_tool', index: 0 }]]
    };
    connections['Buffer Window Memory'] = {
      ai_memory: [[{ node: 'PDF Analysis Agent', type: 'ai_memory', index: 0 }]]
    };
    
    return {
      name: 'PDF Analysis Workflow',
      nodes,
      connections,
      settings: {},
      active: false,
      versionId: '1'
    };
  }

  // 3. CV Screening Workflow
  createCVScreeningWorkflow(analysis) {
    this.nodeCounter = 0;
    const nodes = [];
    const connections = {};
    
    // Webhook
    const webhookId = this.generateId('webhook');
    nodes.push({
      id: webhookId,
      name: 'CV Upload Webhook',
      type: 'n8n-nodes-base.webhook',
      position: [250, 300],
      parameters: {
        path: 'cv-screening',
        httpMethod: 'POST',
        responseMode: 'responseNode'
      },
      typeVersion: 1.1
    });
    
    // Process CV Data
    const processId = this.generateId('process');
    nodes.push({
      id: processId,
      name: 'Process CV Data',
      type: 'n8n-nodes-base.code',
      position: [500, 300],
      parameters: {
        jsCode: `// Process CV files
const body = items[0].json.body || {};
const cvFiles = body.cvFiles || [];
const jobRequirements = body.jobRequirements || '';

return [{
  json: {
    cvFiles,
    jobRequirements,
    cvCount: cvFiles.length
  }
}];`
      },
      typeVersion: 2
    });
    
    // AI Agent
    const agentId = this.generateId('agent');
    nodes.push({
      id: agentId,
      name: 'CV Screening Agent',
      type: '@n8n/n8n-nodes-langchain.agent',
      position: [750, 300],
      parameters: {
        agentType: 'conversationalAgent',
        promptType: 'define',
        text: `Screen the following CVs against these job requirements:

Job Requirements: {{ $json.jobRequirements }}

CVs Data: {{ $json.cvFiles.toJsonString() }}

For each CV, provide:
1. Qualification rate (0-100%)
2. Match with requirements
3. Strengths
4. Weaknesses
5. Recommendation (qualified/not qualified)`,
        options: {
          systemMessage: 'You are an expert recruiter. Evaluate CVs objectively.',
          maxIterations: 5
        }
      },
      typeVersion: 1.2
    });
    
    // OpenRouter Model
    const openRouterId = this.generateId('openrouter');
    nodes.push({
      id: openRouterId,
      name: 'OpenRouter Chat Model',
      type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
      position: [750, 500],
      parameters: {
        model: analysis.aiRequirements?.model || 'qwen/qwen-2.5-coder-32b-instruct'
      },
      credentials: {
        openRouterApi: {
          id: 'ADMIN_OPENROUTER_CREDENTIAL_ID',
          name: 'ADMIN_OPENROUTER_CREDENTIAL_NAME'
        }
      },
      typeVersion: 1
    });
    
    // Calculator Tool
    const calculatorId = this.generateId('calculator');
    nodes.push({
      id: calculatorId,
      name: 'Calculator Tool',
      type: '@n8n/n8n-nodes-langchain.toolCalculator',
      position: [750, 700],
      parameters: {},
      typeVersion: 1
    });
    
    // Memory
    const memoryId = this.generateId('memory');
    nodes.push({
      id: memoryId,
      name: 'Buffer Window Memory',
      type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
      position: [750, 900],
      parameters: {
        contextWindowLength: 10
      },
      typeVersion: 1
    });
    
    // Format Results
    const formatId = this.generateId('format');
    nodes.push({
      id: formatId,
      name: 'Format Screening Results',
      type: 'n8n-nodes-base.function',
      position: [1000, 300],
      parameters: {
        functionCode: `// Format screening results
const results = items[0].json.output || items[0].json.text || '';
const jobRequirements = items[0].json.jobRequirements || '';

return [{
  json: {
    results,
    jobRequirements,
    screeningDate: new Date().toISOString()
  }
}];`
      },
      typeVersion: 1
    });
    
    // Send Email
    const emailId = this.generateId('email');
    nodes.push({
      id: emailId,
      name: 'Send Screening Report',
      type: 'n8n-nodes-base.emailSend',
      position: [1250, 300],
      parameters: {
        fromEmail: '{{USER_EMAIL}}',
        toEmail: '={{ $json.body.notificationEmail || "{{USER_EMAIL}}" }}',
        subject: '📄 CV Screening Report',
        emailType: 'html',
        message: `<html>
<body style="font-family: Arial, sans-serif;">
  <h1>CV Screening Report</h1>
  <p><strong>Job Requirements:</strong> {{ $json.jobRequirements }}</p>
  <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
    <pre style="white-space: pre-wrap;">{{ $json.results }}</pre>
  </div>
</body>
</html>`
      },
      credentials: {
        smtp: {
          id: 'USER_SMTP_CREDENTIAL_ID',
          name: 'USER_SMTP_CREDENTIAL_NAME'
        }
      },
      typeVersion: 2.1
    });
    
    // Connexions
    connections['CV Upload Webhook'] = {
      main: [[{ node: 'Process CV Data', type: 'main', index: 0 }]]
    };
    connections['Process CV Data'] = {
      main: [[{ node: 'CV Screening Agent', type: 'main', index: 0 }]]
    };
    connections['CV Screening Agent'] = {
      main: [[{ node: 'Format Screening Results', type: 'main', index: 0 }]]
    };
    connections['Format Screening Results'] = {
      main: [[{ node: 'Send Screening Report', type: 'main', index: 0 }]]
    };
    connections['OpenRouter Chat Model'] = {
      ai_languageModel: [[{ node: 'CV Screening Agent', type: 'ai_languageModel', index: 0 }]]
    };
    connections['Calculator Tool'] = {
      ai_tool: [[{ node: 'CV Screening Agent', type: 'ai_tool', index: 0 }]]
    };
    connections['Buffer Window Memory'] = {
      ai_memory: [[{ node: 'CV Screening Agent', type: 'ai_memory', index: 0 }]]
    };
    
    return {
      name: 'CV Screening Workflow',
      nodes,
      connections,
      settings: {},
      active: false,
      versionId: '1'
    };
  }

  // 4. CV Analysis & Evaluation Workflow
  createCVAnalysisWorkflow(analysis) {
    // Similaire à CV Screening mais avec comparaison et meilleur CV
    return this.createCVScreeningWorkflow(analysis); // Pour l'instant, même structure
  }

  // 5. API Webhook Workflow
  createAPIWebhookWorkflow(analysis) {
    this.nodeCounter = 0;
    const nodes = [];
    const connections = {};
    
    // Webhook
    const webhookId = this.generateId('webhook');
    nodes.push({
      id: webhookId,
      name: 'API Webhook',
      type: 'n8n-nodes-base.webhook',
      position: [250, 300],
      parameters: {
        path: 'api-endpoint',
        httpMethod: 'POST',
        responseMode: 'responseNode'
      },
      typeVersion: 1.1
    });
    
    // Validate Input
    const validateId = this.generateId('validate');
    nodes.push({
      id: validateId,
      name: 'Validate Input',
      type: 'n8n-nodes-base.code',
      position: [500, 300],
      parameters: {
        jsCode: `// Validate incoming data
const data = items[0].json.body || {};
const errors = [];

if (!data.email) errors.push('Email is required');
if (!data.message) errors.push('Message is required');

if (errors.length > 0) {
  throw new Error(errors.join(', '));
}

// Email validation
const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
if (!emailRegex.test(data.email)) {
  throw new Error('Invalid email format');
}

return [{
  json: {
    ...data,
    validated: true,
    timestamp: new Date().toISOString()
  }
}];`
      },
      typeVersion: 2
    });
    
    // Process Data
    const processId = this.generateId('process');
    nodes.push({
      id: processId,
      name: 'Process Data',
      type: 'n8n-nodes-base.function',
      position: [750, 300],
      parameters: {
        functionCode: `// Process and enrich data
const item = items[0].json;

return [{
  json: {
    ...item,
    processed: true,
    processedAt: new Date().toISOString()
  }
}];`
      },
      typeVersion: 1
    });
    
    // Response
    const responseId = this.generateId('response');
    nodes.push({
      id: responseId,
      name: 'Webhook Response',
      type: 'n8n-nodes-base.respondToWebhook',
      position: [1000, 300],
      parameters: {
        respondWith: 'json',
        responseBody: '={"success": true, "message": "Data processed successfully", "data": {{ $json }}}'
      },
      typeVersion: 1
    });
    
    // Connexions
    connections['API Webhook'] = {
      main: [[{ node: 'Validate Input', type: 'main', index: 0 }]]
    };
    connections['Validate Input'] = {
      main: [[{ node: 'Process Data', type: 'main', index: 0 }]]
    };
    connections['Process Data'] = {
      main: [[{ node: 'Webhook Response', type: 'main', index: 0 }]]
    };
    
    return {
      name: 'API Webhook Workflow',
      nodes,
      connections,
      settings: {},
      active: false,
      versionId: '1'
    };
  }

  // 6. Data Processing Workflow
  createDataProcessingWorkflow(analysis) {
    // Workflow générique pour traitement de données
    return this.createAPIWebhookWorkflow(analysis);
  }

  // 7. Database Sync Workflow
  createDatabaseSyncWorkflow(analysis) {
    this.nodeCounter = 0;
    const nodes = [];
    const connections = {};
    
    // Schedule Trigger
    const scheduleId = this.generateId('schedule');
    nodes.push({
      id: scheduleId,
      name: 'Schedule Sync',
      type: 'n8n-nodes-base.schedule',
      position: [250, 300],
      parameters: {
        rule: {
          interval: [{ field: 'hours', hoursInterval: 1 }]
        }
      },
      typeVersion: 1.1
    });
    
    // Query Database
    const queryId = this.generateId('query');
    nodes.push({
      id: queryId,
      name: 'Query Source Database',
      type: 'n8n-nodes-base.postgres',
      position: [500, 300],
      parameters: {
        operation: 'executeQuery',
        query: 'SELECT * FROM source_table WHERE updated_at > NOW() - INTERVAL \'1 hour\''
      },
      credentials: {
        postgres: {
          id: 'USER_DB_CREDENTIAL_ID',
          name: 'USER_DB_CREDENTIAL_NAME'
        }
      },
      typeVersion: 2.4
    });
    
    // Transform Data
    const transformId = this.generateId('transform');
    nodes.push({
      id: transformId,
      name: 'Transform Data',
      type: 'n8n-nodes-base.function',
      position: [750, 300],
      parameters: {
        functionCode: `// Transform data for target database
return items.map(item => ({
  json: {
    ...item.json,
    syncedAt: new Date().toISOString(),
    synced: true
  }
}));`
      },
      typeVersion: 1
    });
    
    // Insert to Target
    const insertId = this.generateId('insert');
    nodes.push({
      id: insertId,
      name: 'Insert to Target Database',
      type: 'n8n-nodes-base.postgres',
      position: [1000, 300],
      parameters: {
        operation: 'insert',
        schema: 'public',
        table: 'target_table',
        columns: 'id, data, synced_at',
        options: {}
      },
      credentials: {
        postgres: {
          id: 'USER_DB_CREDENTIAL_ID',
          name: 'USER_DB_CREDENTIAL_NAME'
        }
      },
      typeVersion: 2.4
    });
    
    // Connexions
    connections['Schedule Sync'] = {
      main: [[{ node: 'Query Source Database', type: 'main', index: 0 }]]
    };
    connections['Query Source Database'] = {
      main: [[{ node: 'Transform Data', type: 'main', index: 0 }]]
    };
    connections['Transform Data'] = {
      main: [[{ node: 'Insert to Target Database', type: 'main', index: 0 }]]
    };
    
    return {
      name: 'Database Sync Workflow',
      nodes,
      connections,
      settings: {},
      active: false,
      versionId: '1'
    };
  }

  // 8. Notification Workflow
  createNotificationWorkflow(analysis) {
    this.nodeCounter = 0;
    const nodes = [];
    const connections = {};
    
    // Webhook
    const webhookId = this.generateId('webhook');
    nodes.push({
      id: webhookId,
      name: 'Notification Webhook',
      type: 'n8n-nodes-base.webhook',
      position: [250, 300],
      parameters: {
        path: 'notification',
        httpMethod: 'POST',
        responseMode: 'responseNode'
      },
      typeVersion: 1.1
    });
    
    // Process Notification
    const processId = this.generateId('process');
    nodes.push({
      id: processId,
      name: 'Process Notification',
      type: 'n8n-nodes-base.function',
      position: [500, 300],
      parameters: {
        functionCode: `// Process notification data
const body = items[0].json.body || {};
const channel = body.channel || '#general';
const message = body.message || 'Notification';

return [{
  json: {
    channel,
    message,
    timestamp: new Date().toISOString()
  }
}];`
      },
      typeVersion: 1
    });
    
    // Send to Slack
    const slackId = this.generateId('slack');
    nodes.push({
      id: slackId,
      name: 'Send to Slack',
      type: 'n8n-nodes-base.slack',
      position: [750, 300],
      parameters: {
        operation: 'postMessage',
        channel: '={{ $json.channel }}',
        text: '={{ $json.message }}'
      },
      credentials: {
        slack: {
          id: 'USER_SLACK_CREDENTIAL_ID',
          name: 'USER_SLACK_CREDENTIAL_NAME'
        }
      },
      typeVersion: 2.1
    });
    
    // Response
    const responseId = this.generateId('response');
    nodes.push({
      id: responseId,
      name: 'Webhook Response',
      type: 'n8n-nodes-base.respondToWebhook',
      position: [1000, 300],
      parameters: {
        respondWith: 'json',
        responseBody: '={"success": true, "message": "Notification sent"}'
      },
      typeVersion: 1
    });
    
    // Connexions
    connections['Notification Webhook'] = {
      main: [[{ node: 'Process Notification', type: 'main', index: 0 }]]
    };
    connections['Process Notification'] = {
      main: [[{ node: 'Send to Slack', type: 'main', index: 0 }]]
    };
    connections['Send to Slack'] = {
      main: [[{ node: 'Webhook Response', type: 'main', index: 0 }]]
    };
    
    return {
      name: 'Notification Workflow',
      nodes,
      connections,
      settings: {},
      active: false,
      versionId: '1'
    };
  }

  // 9. Scheduled Task Workflow
  createScheduledTaskWorkflow(analysis) {
    // Utilise Schedule Trigger avec logique métier
    return this.createDatabaseSyncWorkflow(analysis); // Structure similaire
  }

  // 10. AI Agent Workflow
  createAIAgentWorkflow(analysis) {
    // Workflow avec Agent IA complet
    return this.createEmailSummaryWorkflow(analysis); // Structure similaire
  }

  // 11. Newsletter Workflow
  createNewsletterWorkflow(analysis) {
    this.nodeCounter = 0;
    const nodes = [];
    const connections = {};
    
    // 1. Schedule Trigger
    const scheduleId = this.generateId('schedule');
    const scheduleName = 'Schedule Trigger';
    nodes.push({
      id: scheduleId,
      name: scheduleName,
      type: 'n8n-nodes-base.schedule',
      position: [250, 300],
      parameters: {
        rule: {
          interval: [{
            field: 'hours',
            hoursInterval: 24
          }]
        }
      },
      typeVersion: 1.1
    });
    
    // 2. RSS Feed
    const rssId = this.generateId('rss');
    const rssName = 'RSS Feed';
    nodes.push({
      id: rssId,
      name: rssName,
      type: 'n8n-nodes-base.rssFeed',
      position: [500, 300],
      parameters: {
        url: 'https://techcrunch.com/feed/',
        options: {}
      },
      typeVersion: 1
    });
    
    // 3. Code (Filter Articles)
    const filterId = this.generateId('filter');
    const filterName = 'Filter Top 5 Articles';
    nodes.push({
      id: filterId,
      name: filterName,
      type: 'n8n-nodes-base.code',
      position: [750, 300],
      parameters: {
        jsCode: `// Filter and select top 5 articles
const articles = $input.all();
const sorted = articles
  .map(item => ({
    ...item.json,
    priority: calculatePriority(item.json)
  }))
  .sort((a, b) => b.priority - a.priority)
  .slice(0, 5);

function calculatePriority(article) {
  let score = 0;
  const title = (article.title || '').toLowerCase();
  const content = (article.content || '').toLowerCase();
  
  if (title.includes('ai') || title.includes('artificial intelligence')) score += 10;
  if (title.includes('security') || title.includes('cyber')) score += 8;
  if (title.includes('launch') || title.includes('release')) score += 6;
  if (title.includes('acquisition') || title.includes('merger')) score += 7;
  
  return score;
}

return sorted.map(article => ({ json: article }));`
      },
      typeVersion: 1
    });
    
    // 4. Aggregate
    const aggregateId = this.generateId('aggregate');
    const aggregateName = 'Aggregate Articles';
    nodes.push({
      id: aggregateId,
      name: aggregateName,
      type: 'n8n-nodes-base.aggregate',
      position: [1000, 300],
      parameters: {
        destinationFieldName: 'articles',
        aggregate: 'aggregateAllItemData'
      },
      typeVersion: 1
    });
    
    // 5. OpenRouter Chat Model
    const openRouterId = this.generateId('openrouter');
    const openRouterName = 'OpenRouter Chat Model';
    nodes.push({
      id: openRouterId,
      name: openRouterName,
      type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
      position: [1250, 200],
      parameters: {
        model: analysis.aiRequirements?.model || 'qwen/qwen-2.5-coder-32b-instruct',
        options: {}
      },
      typeVersion: 1,
      credentials: {
        openRouterApi: {
          id: 'openrouter-credentials',
          name: 'OpenRouter API'
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
      position: [1250, 300],
      parameters: {},
      typeVersion: 1
    });
    
    // 7. Memory Buffer
    const memoryId = this.generateId('memory');
    const memoryName = 'Memory Buffer';
    nodes.push({
      id: memoryId,
      name: memoryName,
      type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
      position: [1250, 400],
      parameters: {
        sessionId: 'newsletter-session',
        windowSize: 5
      },
      typeVersion: 1
    });
    
    // 8. AI Agent
    const agentId = this.generateId('agent');
    const agentName = 'AI Agent';
    nodes.push({
      id: agentId,
      name: agentName,
      type: '@n8n/n8n-nodes-langchain.agent',
      position: [1500, 300],
      parameters: {
        agent: 'conversationalAgent',
        promptType: 'define',
        text: `Generate a newsletter content from these articles: {{ $json.articles.toJsonString() }}

Instructions:
1. Write an engaging introduction (max 50 words)
2. For each article, write a concise summary (3-4 sentences)
3. Use professional, informative, slightly enthusiastic tone
4. End with a conclusion encouraging readers to return tomorrow

Format as HTML for email.`
      },
      typeVersion: 1
    });
    
    // 9. Code (Format HTML)
    const formatId = this.generateId('format');
    const formatName = 'Format HTML Email';
    nodes.push({
      id: formatId,
      name: formatName,
      type: 'n8n-nodes-base.code',
      position: [1750, 300],
      parameters: {
        jsCode: `// Format newsletter as HTML email
const content = $input.first().json.output || $input.first().json.text || '';
const date = new Date().toLocaleDateString('fr-FR', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

const html = \`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; max-width: 600px; margin: 0 auto; }
    .article { margin: 20px 0; padding: 15px; border-left: 4px solid #4F46E5; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    a { color: #4F46E5; text-decoration: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Tech Daily | \${date}</h1>
  </div>
  <div class="content">
    \${content}
  </div>
  <div class="footer">
    <p>Merci de votre lecture ! Revenez demain pour plus d'actualités tech.</p>
  </div>
</body>
</html>\`;

return [{ json: { html, subject: \`🚀 Tech Daily : \${date}\` } }];`
      },
      typeVersion: 1
    });
    
    // 10. Send Email
    const emailId = this.generateId('email');
    const emailName = 'Send Email';
    nodes.push({
      id: emailId,
      name: emailName,
      type: 'n8n-nodes-base.emailSend',
      position: [2000, 300],
      parameters: {
        fromEmail: '{{ $env.NEWSLETTER_FROM_EMAIL }}',
        toEmail: '{{ $env.NEWSLETTER_TO_EMAIL }}',
        subject: '={{ $json.subject }}',
        emailType: 'html',
        message: '={{ $json.html }}',
        options: {}
      },
      typeVersion: 1,
      credentials: {
        smtp: {
          id: 'smtp-credentials',
          name: 'SMTP'
        }
      }
    });
    
    // Connections
    connections[scheduleName] = {
      main: [[{ node: rssName, type: 'main', index: 0 }]]
    };
    connections[rssName] = {
      main: [[{ node: filterName, type: 'main', index: 0 }]]
    };
    connections[filterName] = {
      main: [[{ node: aggregateName, type: 'main', index: 0 }]]
    };
    connections[aggregateName] = {
      main: [[{ node: agentName, type: 'main', index: 0 }]]
    };
    connections[openRouterName] = {
      ai_languageModel: [[{ node: agentName, type: 'ai_languageModel', index: 0 }]]
    };
    connections[calculatorName] = {
      ai_tool: [[{ node: agentName, type: 'ai_tool', index: 0 }]]
    };
    connections[memoryName] = {
      ai_memory: [[{ node: agentName, type: 'ai_memory', index: 0 }]]
    };
    connections[agentName] = {
      main: [[{ node: formatName, type: 'main', index: 0 }]]
    };
    connections[formatName] = {
      main: [[{ node: emailName, type: 'main', index: 0 }]]
    };
    
    return {
      name: 'Newsletter Tech Quotidienne',
      nodes,
      connections,
      settings: {},
      active: false,
      versionId: '1'
    };
  }

  // 12. Form Processing Workflow
  createFormProcessingWorkflow(analysis) {
    return this.createAPIWebhookWorkflow(analysis);
  }

  // 13. File Processing Workflow
  createFileProcessingWorkflow(analysis) {
    return this.createPDFAnalysisWorkflow(analysis);
  }

  // 14. Integration Workflow
  createIntegrationWorkflow(analysis) {
    return this.createAPIWebhookWorkflow(analysis);
  }

  // 15. Generic Workflow (fallback)
  createGenericWorkflow(analysis) {
    // Workflow générique basé sur l'analyse
    this.nodeCounter = 0;
    const nodes = [];
    const connections = {};
    
    // Trigger (premier détecté)
    const triggerType = analysis.triggers[0] || 'webhook';
    let triggerId, triggerName, triggerNode;
    
    if (triggerType === 'webhook') {
      triggerId = this.generateId('webhook');
      triggerName = 'Webhook Trigger';
      triggerNode = {
        id: triggerId,
        name: triggerName,
        type: 'n8n-nodes-base.webhook',
        position: [250, 300],
        parameters: {
          path: 'workflow-endpoint',
          httpMethod: 'POST',
          responseMode: 'responseNode'
        },
        typeVersion: 1.1
      };
    } else if (triggerType === 'schedule') {
      triggerId = this.generateId('schedule');
      triggerName = 'Schedule Trigger';
      triggerNode = {
        id: triggerId,
        name: triggerName,
        type: 'n8n-nodes-base.schedule',
        position: [250, 300],
        parameters: {
          rule: {
            interval: [{ field: 'hours', hoursInterval: 1 }]
          }
        },
        typeVersion: 1.1
      };
    }
    
    nodes.push(triggerNode);
    
    // Processing node
    const processId = this.generateId('process');
    nodes.push({
      id: processId,
      name: 'Process Data',
      type: 'n8n-nodes-base.function',
      position: [500, 300],
      parameters: {
        functionCode: `// Process data
return items.map(item => ({
  json: {
    ...item.json,
    processed: true,
    processedAt: new Date().toISOString()
  }
}));`
      },
      typeVersion: 1
    });
    
    // Output node
    if (analysis.dataFlow.output.includes('webhook-response')) {
      const responseId = this.generateId('response');
      nodes.push({
        id: responseId,
        name: 'Webhook Response',
        type: 'n8n-nodes-base.respondToWebhook',
        position: [750, 300],
        parameters: {
          respondWith: 'json',
          responseBody: '={"success": true, "data": {{ $json }}}'
        },
        typeVersion: 1
      });
      
      connections[triggerName] = {
        main: [[{ node: 'Process Data', type: 'main', index: 0 }]]
      };
      connections['Process Data'] = {
        main: [[{ node: 'Webhook Response', type: 'main', index: 0 }]]
      };
    }
    
    return {
      name: 'Generic Workflow',
      nodes,
      connections,
      settings: {},
      active: false,
      versionId: '1'
    };
  }
}

module.exports = EnhancedWorkflowTemplates;



