const config = require('../config');

// Fonction pour appeler l'API n8n directement
async function callN8nDirect(method, path, body) {
  const n8nUrl = config.n8n.url;
  const n8nApiKey = config.n8n.apiKey;
  
  const fullUrl = `${n8nUrl}/api/v1${path}`;
  console.log(`Appel direct n8n: ${method} ${fullUrl}`);
  
  const response = await fetch(fullUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': n8nApiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n API error (${response.status}): ${errorText}`);
  }
  
  return await response.json();
}

// Fonction pour nettoyer un workflow pour n8n
function cleanWorkflowForN8n(workflow) {
  console.log('Input workflow to clean:', {
    hasName: !!workflow?.name,
    hasNodes: !!workflow?.nodes,
    nodeCount: workflow?.nodes?.length || 0,
    hasConnections: !!workflow?.connections,
    keys: Object.keys(workflow || {})
  });

  const cleanedWorkflow = {
    name: workflow.name || 'Untitled Workflow',
    nodes: workflow.nodes || [],
    connections: workflow.connections || {},
    settings: workflow.settings || {}
  };

  if (workflow.nodes) {
    cleanedWorkflow.nodes = workflow.nodes.map((node) => {
      const cleanedNode = {
        parameters: node.parameters || {},
        id: node.id,
        name: node.name,
        type: node.type,
        typeVersion: node.typeVersion || 1,
        position: node.position || [0, 0],
      };

      if (node.credentials && Object.keys(node.credentials).length > 0) {
        cleanedNode.credentials = node.credentials;
      }
      if (node.disabled !== undefined) cleanedNode.disabled = node.disabled;
      if (node.notes) cleanedNode.notes = node.notes;
      if (node.notesInFlow !== undefined) cleanedNode.notesInFlow = node.notesInFlow;
      if (node.alwaysOutputData !== undefined) cleanedNode.alwaysOutputData = node.alwaysOutputData;
      if (node.executeOnce !== undefined) cleanedNode.executeOnce = node.executeOnce;
      if (node.retryOnFail !== undefined) cleanedNode.retryOnFail = node.retryOnFail;
      if (node.maxTries !== undefined) cleanedNode.maxTries = node.maxTries;
      if (node.waitBetweenTries !== undefined) cleanedNode.waitBetweenTries = node.waitBetweenTries;
      if (node.continueOnFail !== undefined) cleanedNode.continueOnFail = node.continueOnFail;

      return cleanedNode;
    });
  }

  console.log('Cleaned workflow for n8n:', {
    name: cleanedWorkflow.name,
    nodeCount: cleanedWorkflow.nodes?.length || 0,
    hasConnections: !!cleanedWorkflow.connections,
    hasSettings: !!cleanedWorkflow.settings,
    keys: Object.keys(cleanedWorkflow)
  });

  return cleanedWorkflow;
}

// Fonction pour créer un workflow
async function createWorkflow(workflow) {
  const cleaned = cleanWorkflowForN8n(workflow);
  const result = await callN8nDirect('POST', '/workflows', cleaned);
  console.log('n8n createWorkflow response:', result);
  
  if (!result.id) {
    console.log('ID manquant dans la réponse, récupération depuis la liste des workflows...');
    const workflows = await callN8nDirect('GET', '/workflows');
    const createdWorkflow = workflows.find((w) => w.name === result.name);
    if (createdWorkflow) {
      console.log('Workflow trouvé dans la liste:', createdWorkflow);
      return { id: createdWorkflow.id };
    } else {
      throw new Error('Impossible de trouver l\'ID du workflow créé');
    }
  }
  
  return result;
}

// Fonction pour récupérer les credentials admin
async function getAdminCredentials() {
  console.log('🔍 [n8nService] Récupération des credentials admin existants...');
  
  try {
    // Utiliser les routes du backend au lieu de se connecter directement à n8n
    const response = await fetch('http://localhost:3004/api/n8n/credentials', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const allCredentials = await response.json();
    console.log('🔍 [n8nService] Credentials trouvés dans n8n:', allCredentials.length);
    
    const adminCreds = {};
    
    for (const cred of allCredentials) {
      console.log(`  - ${cred.name} (${cred.type}) [ID: ${cred.id}]`);
      
      if (cred.name.toLowerCase().includes('openrouter') || 
          cred.name.toLowerCase().includes('llm') || 
          cred.name.toLowerCase().includes('ai') ||
          cred.name.toLowerCase().includes('admin')) {
        adminCreds.OPENROUTER_ID = cred.id;
        console.log('✅ Credential OpenRouter/LLM trouvé:', cred.id);
      }
      
      if (cred.name.toLowerCase().includes('smtp') || 
          cred.name.toLowerCase().includes('email') ||
          cred.name.toLowerCase().includes('mail')) {
        adminCreds.SMTP_ID = cred.id;
        console.log('✅ Credential SMTP/Email trouvé:', cred.id);
      }
    }
    
    console.log('✅ [n8nService] Credentials admin récupérés:', adminCreds);
    return adminCreds;
  } catch (error) {
    console.error('❌ [n8nService] Erreur récupération credentials admin:', error);
    return {};
  }
}

// Fonction pour créer un credential
async function createCredential(credentialData) {
  return await callN8nDirect('POST', '/credentials', credentialData);
}

// Fonction pour injecter les paramètres dans un workflow
async function injectParams(workflowJson, params, userId, userEmail) {
  console.log('🔥🔥🔥 [injectParams] FONCTION APPELÉE ! 🔥🔥🔥');
  console.log('🔥🔥🔥 [injectParams] Paramètres:', { params, userId, userEmail });
  
  let workflowString = JSON.stringify(workflowJson);

  // 1. Replace {{PLACEHOLDER}} patterns with user-provided values
  Object.entries(params).forEach(([key, value]) => {
    workflowString = workflowString.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
      String(value)
    );
  });

  // 2. Récupérer les credentials admin
  const adminCreds = await getAdminCredentials();
  
  // 3. Créer les credentials IMAP et SMTP pour l'utilisateur
  let userImapCredentialId = null;
  let userSmtpCredentialId = null;
  
  if (params.USER_EMAIL && params.IMAP_PASSWORD && params.IMAP_SERVER) {
    try {
      // Créer credential IMAP
      const imapCred = await createCredential({
        name: `IMAP-${userId}-${Date.now()}`,
        type: 'imap',
        data: {
          user: params.USER_EMAIL,
          password: params.IMAP_PASSWORD,
          host: params.IMAP_SERVER,
          port: 993,
          secure: true
        }
      });
      userImapCredentialId = imapCred.id;
      console.log('✅ [injectParams] Credential IMAP utilisateur créé:', imapCred.id);

      // Dériver automatiquement le serveur SMTP
      const smtpServer = params.IMAP_SERVER.replace('imap', 'smtp');
      console.log('🔧 [injectParams] Serveur SMTP dérivé:', smtpServer);

      // Créer credential SMTP avec les mêmes infos
      const smtpCred = await createCredential({
        name: `SMTP-${userId}-${Date.now()}`,
        type: 'smtp',
        data: {
          user: params.USER_EMAIL,
          password: params.IMAP_PASSWORD, // Même mot de passe
          host: smtpServer, // Serveur dérivé automatiquement
          port: 587,
          secure: false // STARTTLS
        }
      });
      userSmtpCredentialId = smtpCred.id;
      console.log('✅ [injectParams] Credential SMTP utilisateur créé:', smtpCred.id);
      
    } catch (error) {
      console.error('❌ [injectParams] Erreur création credentials utilisateur:', error);
    }
  }

  // 4. Remplacer les placeholders de credentials
  if (userImapCredentialId) {
    workflowString = workflowString.replace(
      /"USER_IMAP_CREDENTIAL_PLACEHOLDER"/g,
      JSON.stringify({ id: userImapCredentialId, name: `IMAP-${userId}` })
    );
  }
  
  if (userSmtpCredentialId) {
    workflowString = workflowString.replace(
      /"USER_SMTP_CREDENTIAL_ID"/g,
      userSmtpCredentialId
    );
    workflowString = workflowString.replace(
      /"USER_SMTP_CREDENTIAL_NAME"/g,
      `SMTP-${userId}`
    );
  }
  
  if (adminCreds.OPENROUTER_ID) {
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_PLACEHOLDER"/g,
      JSON.stringify({ id: adminCreds.OPENROUTER_ID, name: 'OpenRouter Admin' })
    );
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_ID"/g,
      adminCreds.OPENROUTER_ID
    );
    workflowString = workflowString.replace(
      /"ADMIN_OPENROUTER_CREDENTIAL_NAME"/g,
      'OpenRouter Admin'
    );
  }
  
  if (adminCreds.SMTP_ID) {
    workflowString = workflowString.replace(
      /"ADMIN_SMTP_PLACEHOLDER"/g,
      JSON.stringify({ id: adminCreds.SMTP_ID, name: 'SMTP Admin' })
    );
  }

  const workflow = JSON.parse(workflowString);

  // 5. Clean and handle nodes with automatic credential injection
  console.log('🔧 [injectParams] Début injection automatique des credentials...');
  console.log('🔧 [injectParams] Admin credentials:', adminCreds);
  console.log('🔧 [injectParams] User IMAP credential ID:', userImapCredentialId);
  console.log('🔧 [injectParams] User SMTP credential ID:', userSmtpCredentialId);
  
  if (workflow.nodes) {
    workflow.nodes = workflow.nodes.map((node) => {
      const cleanedNode = {
        parameters: node.parameters || {},
        id: node.id,
        name: node.name,
        type: node.type,
        typeVersion: node.typeVersion || 1,
        position: node.position || [0, 0],
      };

      // Configuration automatique des credentials selon le type de nœud
      if (node.type === 'n8n-nodes-base.openAi' || 
          node.type === 'n8n-nodes-base.openAiChatModel' ||
          node.type === 'n8n-nodes-base.openAiEmbedding' ||
          node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter' ||
          node.name?.toLowerCase().includes('openrouter') ||
          node.name?.toLowerCase().includes('llm') ||
          node.name?.toLowerCase().includes('ai')) {
        // Nœud LLM/AI - utiliser le credential OpenRouter
        if (adminCreds.OPENROUTER_ID) {
          cleanedNode.credentials = {
            openRouterApi: {
              id: adminCreds.OPENROUTER_ID,
              name: 'OpenRouter Admin'
            }
          };
          console.log('✅ [injectParams] Credential OpenRouter assigné au nœud:', node.name);
        }
      } else if (node.type === 'n8n-nodes-base.emailSend' || 
                 node.type === 'n8n-nodes-base.smtp' ||
                 node.name?.toLowerCase().includes('smtp') ||
                 node.name?.toLowerCase().includes('email')) {
        // Nœud SMTP - utiliser le credential SMTP utilisateur
        if (userSmtpCredentialId) {
          cleanedNode.credentials = {
            smtp: {
              id: userSmtpCredentialId,
              name: `SMTP-${userId}`
            }
          };
          console.log('✅ [injectParams] Credential SMTP assigné au nœud:', node.name, 'ID:', userSmtpCredentialId);
        }
      } else if (node.type === 'n8n-nodes-base.imap' ||
                 node.name?.toLowerCase().includes('imap')) {
        // Nœud IMAP - utiliser le credential IMAP utilisateur
        if (userImapCredentialId) {
          cleanedNode.credentials = {
            imap: {
              id: userImapCredentialId,
              name: `IMAP-${userId}`
            }
          };
          console.log('✅ [injectParams] Credential IMAP assigné au nœud:', node.name, 'ID:', userImapCredentialId);
        }
      } else if (node.credentials && Object.keys(node.credentials).length > 0) {
        // Garder les credentials existants pour les autres nœuds
        cleanedNode.credentials = node.credentials;
      }

      if (node.disabled !== undefined) {
        cleanedNode.disabled = node.disabled;
      }
      if (node.notes) {
        cleanedNode.notes = node.notes;
      }
      if (node.notesInFlow !== undefined) {
        cleanedNode.notesInFlow = node.notesInFlow;
      }
      if (node.alwaysOutputData !== undefined) {
        cleanedNode.alwaysOutputData = node.alwaysOutputData;
      }
      if (node.executeOnce !== undefined) {
        cleanedNode.executeOnce = node.executeOnce;
      }
      if (node.retryOnFail !== undefined) {
        cleanedNode.retryOnFail = node.retryOnFail;
      }
      if (node.maxTries !== undefined) {
        cleanedNode.maxTries = node.maxTries;
      }
      if (node.waitBetweenTries !== undefined) {
        cleanedNode.waitBetweenTries = node.waitBetweenTries;
      }
      if (node.continueOnFail !== undefined) {
        cleanedNode.continueOnFail = node.continueOnFail;
      }

      return cleanedNode;
    });
  }

  // 6. Clean up workflow - only keep essential properties for n8n API
  const cleanedWorkflow = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
  };

  if (workflow.settings && Object.keys(workflow.settings).length > 0) {
    cleanedWorkflow.settings = workflow.settings;
  }

  console.log('Cleaned workflow keys:', Object.keys(cleanedWorkflow));
  console.log('Cleaned workflow:', JSON.stringify(cleanedWorkflow, null, 2));

  return cleanedWorkflow;
}

// Fonction pour créer un template avec placeholders
function createTemplateWithPlaceholders() {
  // Template simple pour Email Summary
  return {
    "name": "Email Summary Agent - USER_EMAIL_PLACEHOLDER",
    "active": false,
    "nodes": [
      {
        "parameters": {
          "options": {}
        },
        "id": "fetch-emails-imap",
        "name": "Fetch Emails via IMAP",
        "type": "n8n-nodes-base.emailReadImap",
        "typeVersion": 1,
        "position": [-400, 176],
        "credentials": {
          "imap": {
            "id": "USER_IMAP_CREDENTIAL_PLACEHOLDER",
            "name": "IMAP-USER_EMAIL_PLACEHOLDER"
          }
        }
      },
      {
        "parameters": {
          "aggregate": "aggregateAllItemData",
          "options": {}
        },
        "id": "organize-email-data",
        "name": "Organize Email Data",
        "type": "n8n-nodes-base.aggregate",
        "typeVersion": 1,
        "position": [-208, 80]
      },
      {
        "parameters": {
          "assignments": {
            "assignments": [
              {
                "name": "sessionId",
                "type": "string",
                "value": "=email-summary-{{ $now.format('YYYY-MM-DD') }}"
              }
            ]
          },
          "includeOtherFields": true,
          "options": {}
        },
        "id": "session-generator",
        "name": "Generate Session ID",
        "type": "n8n-nodes-base.set",
        "typeVersion": 3.4,
        "position": [-32, 176]
      },
      {
        "parameters": {
          "promptType": "define",
          "text": "=Voici les emails reçus aujourd'hui : {{ $json.data.toJsonString() }}\n\nAnalyse TOUS les emails et résume sous forme de liste :\n- Catégorise par priorité (urgent, important, à lire)\n- Identifie les emails avec le mot 'urgent' dans le sujet ou le contenu\n- Propose un résumé, puis liste toutes les tâches/action items importantes.\n- Assure-toi de ne manquer aucun email\n",
          "options": {
            "systemMessage": "Tu es un assistant IA spécialisé dans l'analyse d'emails. Synthétise sous forme structurée les informations essentielles et importantes des emails reçus ce jour :\n- Priorise les urgences (emails avec 'urgent' dans le sujet ou contenu)\n- Résume les demandes importantes, \n- Liste les actions à faire.\n- Assure-toi de ne manquer aucun email important.\n\n"
          }
        },
        "id": "ai-agent",
        "name": "AI Agent",
        "type": "@n8n/n8n-nodes-langchain.agent",
        "typeVersion": 2.2,
        "position": [256, 176]
      },
      {
        "parameters": {
          "mode": "markdownToHtml",
          "markdown": "={{ $('AI Agent').item.json.output }}",
          "destinationKey": "html",
          "options": {}
        },
        "id": "markdown",
        "name": "Markdown",
        "type": "n8n-nodes-base.markdown",
        "typeVersion": 1,
        "position": [624, 176]
      },
      {
        "parameters": {
          "fromEmail": "USER_EMAIL_PLACEHOLDER",
          "toEmail": "USER_EMAIL_PLACEHOLDER",
          "subject": "=Résumé quotidien des emails importants du {{ $now.format('DD/MM/YYYY') }}",
          "html": "=<!DOCTYPE html>\n<html lang=\"fr\">\n<head>\n  <meta charset=\"UTF-8\">\n  <style>\n    body { font-family: Arial, sans-serif; background: #f9fafb; color: #23272f; margin: 0; }\n    .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 6px #dedede; padding: 24px; }\n    h1 { background: #0066cc; color: #fff; border-radius: 8px; padding: 14px 0; text-align: center; font-size: 20px; letter-spacing: 1px; }\n    .priority { margin: 18px 0 10px 0; font-size: 17px; font-weight: bold; }\n    .urgent { color: #fff; background: #d32f2f; padding: 6px 14px; border-radius: 5px; display: inline-block;}\n    .important { color: #fff; background: #fbc02d; padding: 6px 14px; border-radius: 5px; display: inline-block;}\n    .info { color: #fff; background: #1976d2; padding: 6px 14px; border-radius: 5px; display: inline-block;}\n    ul { padding-left: 20px; }\n    li { margin-bottom: 12px; }\n    .icon { font-size: 20px; margin-right: 8px; }\n    .recap { margin-top: 25px; background: #F1F0F5; border-left: 4px solid #0073e6; padding: 14px; border-radius: 6px; font-size: 16px; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <h1>📬 Résumé & actions des emails reçus ces 24h</h1>\n    <div style=\"padding: 14px;\">{{ $json.html }}</div>\n  </div>\n</body>\n</html>\n",
          "options": {}
        },
        "id": "send-summary-smtp",
        "name": "Send Summary via SMTP",
        "type": "n8n-nodes-base.emailSend",
        "typeVersion": 1,
        "position": [896, 80],
        "credentials": {
          "smtp": {
            "id": "USER_SMTP_CREDENTIAL_ID",
            "name": "USER_SMTP_CREDENTIAL_NAME"
          }
        }
      },
      {
        "parameters": {
          "options": {}
        },
        "type": "@n8n/n8n-nodes-langchain.lmChatOpenRouter",
        "typeVersion": 1,
        "position": [128, 384],
        "id": "8a2cded9-95d8-4334-8acd-ec50717bef80",
        "name": "OpenRouter Chat Model",
        "credentials": {
          "openRouterApi": {
            "id": "ADMIN_OPENROUTER_CREDENTIAL_ID",
            "name": "ADMIN_OPENROUTER_CREDENTIAL_NAME"
          }
        }
      },
      {
        "parameters": {
          "contextWindowLength": 100
        },
        "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
        "typeVersion": 1.3,
        "position": [272, 384],
        "id": "10f194c2-a8cc-4e97-bb65-0e375e0698d4",
        "name": "Simple Memory"
      }
    ],
    "connections": {
      "fetch-emails-imap": {
        "main": [
          [
            {
              "node": "organize-email-data",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "organize-email-data": {
        "main": [
          [
            {
              "node": "session-generator",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "session-generator": {
        "main": [
          [
            {
              "node": "ai-agent",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "ai-agent": {
        "main": [
          [
            {
              "node": "markdown",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "markdown": {
        "main": [
          [
            {
              "node": "send-summary-smtp",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "OpenRouter Chat Model": {
        "ai_languageModel": [
          [
            {
              "node": "ai-agent",
              "type": "ai_languageModel",
              "index": 0
            }
          ]
        ]
      },
      "Simple Memory": {
        "ai_memory": [
          [
            {
              "node": "ai-agent",
              "type": "ai_memory",
              "index": 0
            }
          ]
        ]
      }
    },
    "active": false,
    "settings": {},
    "versionId": "25438903-5ed9-4381-a9d5-d1131fa5cc9a",
    "meta": {
      "templateCredsSetupCompleted": true,
      "instanceId": "b0be7bf6e0dec32a9b3d1eb6df3c73694ce94c9ac7838dada4077a352677a688"
    },
    "id": "wmlm4b9IOS2XKkZP",
    "tags": []
  };
}

// Fonction pour déployer un workflow Email Summary avec credentials automatiques
async function deployEmailSummaryWorkflow(userId, userEmail, userPassword, userImapServer) {
  console.log('🚀 [n8nService] Déploiement workflow Email Summary pour utilisateur:', userEmail);
  console.log('🔧 [n8nService] Paramètres reçus:', { userId, userEmail, userPassword, userImapServer });
  
  try {
    // 1. Créer le template avec placeholders
    console.log('🔧 [n8nService] Création du template...');
    const template = createTemplateWithPlaceholders();
    console.log('✅ [n8nService] Template créé, nœuds:', template.nodes?.length || 0);
    
    // 2. Injecter les paramètres utilisateur
    console.log('🔧 [n8nService] Début injection des paramètres...');
    const workflowWithCredentials = await injectParams(template, {
      USER_EMAIL: userEmail,
      IMAP_PASSWORD: userPassword,
      IMAP_SERVER: userImapServer
    }, userId, userEmail);
    console.log('✅ [n8nService] Injection terminée, nœuds:', workflowWithCredentials.nodes?.length || 0);
    
    // 3. Créer le workflow dans n8n
    console.log('🔧 [n8nService] Création du workflow dans n8n...');
    const result = await createWorkflow(workflowWithCredentials);
    
    console.log('✅ [n8nService] Workflow Email Summary déployé:', result.id);
    return result;
    
  } catch (error) {
    console.error('❌ [n8nService] Erreur déploiement workflow:', error);
    throw error;
  }
}

module.exports = {
  deployEmailSummaryWorkflow,
  createWorkflow,
  createCredential,
  getAdminCredentials,
  injectParams,
  cleanWorkflowForN8n
};
