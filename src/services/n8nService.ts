import { apiKeyService, oauthService } from './index';

export interface N8nWorkflow {
  id?: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  settings?: any;
  tags?: string[];
}

async function callN8nProxy(method: string, path: string, body?: any): Promise<any> {
  const response = await fetch(`http://localhost:3004/api/n8n${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

export const n8nService = {
  cleanWorkflowForN8n(workflow: any): any {
    console.log('Input workflow to clean:', {
      hasName: !!workflow?.name,
      hasNodes: !!workflow?.nodes,
      nodeCount: workflow?.nodes?.length || 0,
      hasConnections: !!workflow?.connections,
      keys: Object.keys(workflow || {})
    });

    const cleanedWorkflow: any = {
      name: workflow.name || 'Untitled Workflow',
      nodes: workflow.nodes || [],
      connections: workflow.connections || {},
      settings: workflow.settings || {}
    };

    if (workflow.nodes) {
      cleanedWorkflow.nodes = workflow.nodes.map((node: any) => {
        const cleanedNode: any = {
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
  },

  async createWorkflow(workflow: N8nWorkflow, userId?: string, userEmail?: string, userPassword?: string, userImapServer?: string): Promise<{ id: string }> {
    let processedWorkflow = workflow;
    
    // Si les paramètres utilisateur sont fournis, injecter les credentials automatiquement
    if (userId && userEmail && userPassword && userImapServer) {
      console.log('🔧 [createWorkflow] Injection automatique des credentials...');
      processedWorkflow = await this.injectParams(workflow, {
        USER_EMAIL: userEmail,
        IMAP_PASSWORD: userPassword,
        IMAP_SERVER: userImapServer
      }, userId, userEmail);
    }
    
    const cleaned = this.cleanWorkflowForN8n(processedWorkflow);
    const result = await callN8nProxy('POST', '/workflows', cleaned);
    console.log('n8n createWorkflow response:', result);
    
    if (!result.id) {
      console.log('ID manquant dans la réponse, récupération depuis la liste des workflows...');
      const workflows = await callN8nProxy('GET', '/workflows');
      const createdWorkflow = workflows.find((w: any) => w.name === result.name);
      if (createdWorkflow) {
        console.log('Workflow trouvé dans la liste:', createdWorkflow);
        return { id: createdWorkflow.id };
      } else {
        throw new Error('Impossible de trouver l\'ID du workflow créé');
      }
    }
    
    return result;
  },

  async activateWorkflow(workflowId: string): Promise<void> {
    console.log(`🔧 [n8nService] Activation workflow ${workflowId}`);
    try {
      await callN8nProxy('POST', `/workflows/${workflowId}/activate`);
      console.log('✅ [n8nService] Workflow activé');
    } catch (error) {
      console.error('❌ [n8nService] Erreur activation:', error);
      throw error;
    }
  },

  async deactivateWorkflow(workflowId: string): Promise<void> {
    console.log(`🔧 [n8nService] Désactivation workflow ${workflowId}`);
    try {
      await callN8nProxy('POST', `/workflows/${workflowId}/deactivate`);
      console.log('✅ [n8nService] Workflow désactivé');
    } catch (error) {
      console.error('❌ [n8nService] Erreur désactivation:', error);
      throw error;
    }
  },

  async getAdminCredentials(): Promise<Record<string, string>> {
    console.log('🔍 [n8nService] Récupération des credentials admin existants...');
    
    try {
      const allCredentials = await callN8nProxy('GET', '/credentials');
      console.log('🔍 [n8nService] Credentials trouvés dans n8n:', allCredentials.length);
      
      const adminCreds: Record<string, string> = {};
      
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
  },

  async createCredential(credentialData: any): Promise<{ id: string }> {
    return await callN8nProxy('POST', '/credentials', credentialData);
  },

  async getCredentials(): Promise<any[]> {
    return await callN8nProxy('GET', '/credentials');
  },

  async updateCredential(credentialId: string, data: any): Promise<void> {
    await callN8nProxy('PUT', `/credentials/${credentialId}`, data);
  },

  async deleteCredential(credentialId: string): Promise<void> {
    await callN8nProxy('DELETE', `/credentials/${credentialId}`);
  },

  async getCredential(credentialId: string): Promise<any> {
    return await callN8nProxy('GET', `/credentials/${credentialId}`);
  },

  async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return await callN8nProxy('GET', `/workflows/${workflowId}`);
  },

  async updateWorkflow(workflowId: string, workflow: N8nWorkflow): Promise<N8nWorkflow> {
    return await callN8nProxy('PATCH', `/workflows/${workflowId}`, workflow);
  },

  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      console.log(`Suppression du workflow ${workflowId} sur n8n...`);
      await callN8nProxy('DELETE', `/workflows/${workflowId}`);
      console.log(`Workflow ${workflowId} supprimé avec succès`);
    } catch (error) {
      console.error('Error deleting workflow from n8n:', error);
      throw error;
    }
  },

  buildWorkflowName(templateName: string, userId: string, userEmail?: string): string {
    if (userEmail) {
      return `${templateName} - ${userEmail}`;
    }
    return `${templateName}-${userId.substring(0, 8)}`;
  },

  async injectParams(workflowJson: any, params: Record<string, any>, userId: string, _userEmail?: string): Promise<any> {
    let workflowString = JSON.stringify(workflowJson);

    const adminApiKeys = await apiKeyService.getActiveApiKeys();

    // 1. Replace {{PLACEHOLDER}} patterns with user-provided values
    Object.entries(params).forEach(([key, value]) => {
      workflowString = workflowString.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        String(value)
      );
    });

    // 2. Replace admin API keys
    const openaiKey = adminApiKeys.find(k => k.service === 'openai')?.key;
    if (openaiKey) {
      workflowString = workflowString.replace(/\{\{OPENAI_API_KEY\}\}/g, openaiKey);
    }
    const anthropicKey = adminApiKeys.find(k => k.service === 'anthropic')?.key;
    if (anthropicKey) {
      workflowString = workflowString.replace(/\{\{ANTHROPIC_API_KEY\}\}/g, anthropicKey);
    }
    const googleKey = adminApiKeys.find(k => k.service === 'google')?.key;
    if (googleKey) {
      workflowString = workflowString.replace(/\{\{GOOGLE_API_KEY\}\}/g, googleKey);
    }
    const deepseekKey = adminApiKeys.find(k => k.service === 'deepseek')?.key;
    if (deepseekKey) {
      workflowString = workflowString.replace(/\{\{DEEPSEEK_API_KEY\}\}/g, deepseekKey);
    }
    const openrouterKey = adminApiKeys.find(k => k.service === 'openrouter')?.key;
    if (openrouterKey) {
      workflowString = workflowString.replace(/\{\{OPENROUTER_API_KEY\}\}/g, openrouterKey);
    }
    const huggingfaceKey = adminApiKeys.find(k => k.service === 'huggingface')?.key;
    if (huggingfaceKey) {
      workflowString = workflowString.replace(/\{\{HUGGINGFACE_API_KEY\}\}/g, huggingfaceKey);
    }
    const mistralKey = adminApiKeys.find(k => k.service === 'mistral')?.key;
    if (mistralKey) {
      workflowString = workflowString.replace(/\{\{MISTRAL_API_KEY\}\}/g, mistralKey);
    }
    const cohereKey = adminApiKeys.find(k => k.service === 'cohere')?.key;
    if (cohereKey) {
      workflowString = workflowString.replace(/\{\{COHERE_API_KEY\}\}/g, cohereKey);
    }

    // 3. Auto-replace hardcoded email addresses with USER_EMAIL parameter (if provided)
    if (params.USER_EMAIL) {
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = workflowString.match(emailPattern);
      if (emails && emails.length > 0) {
        const uniqueEmails = Array.from(new Set(emails));
        if (uniqueEmails.length === 1) {
          workflowString = workflowString.replace(
            new RegExp(uniqueEmails[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            params.USER_EMAIL
          );
        }
      }
    }

    // 4. Replace schedule/interval if CHECK_INTERVAL is provided
    if (params.CHECK_INTERVAL) {
      workflowString = workflowString.replace(
        /"minutesInterval"\s*:\s*"CHECK_INTERVAL_PLACEHOLDER"/g,
        `"minutesInterval": ${params.CHECK_INTERVAL}`
      );
      workflowString = workflowString.replace(
        /"minutesInterval"\s*:\s*null/g,
        `"minutesInterval": ${params.CHECK_INTERVAL}`
      );
    }

    // 5. Récupérer les credentials admin
    const adminCreds = await this.getAdminCredentials();
    
    // 6. Créer les credentials IMAP et SMTP pour l'utilisateur
    // Au lieu de créer de nouveaux credentials, modifier directement le JSON du workflow
    console.log('🔧 [injectParams] Modification directe du JSON du workflow avec les credentials utilisateur');
    
    // Dériver automatiquement le serveur SMTP
    const smtpServer = params.IMAP_SERVER.replace('imap', 'smtp');
    console.log('🔧 [injectParams] Serveur SMTP dérivé:', smtpServer);

    // 7. Injecter directement les credentials dans le JSON du workflow
    if (params.USER_EMAIL && params.IMAP_PASSWORD && params.IMAP_SERVER) {
      console.log('🔧 [injectParams] Injection des credentials utilisateur dans le workflow JSON');
      
      // Remplacer les credentials SMTP avec les données utilisateur
      const smtpCredentials = {
        user: params.USER_EMAIL,
        password: params.IMAP_PASSWORD,
        host: smtpServer,
        port: 465,
        secure: true, // SSL/TLS activé
        disableStartTls: true // SSL direct
      };
      
      // Remplacer le placeholder SMTP par les vraies credentials
      workflowString = workflowString.replace(
        /"USER_SMTP_CREDENTIAL_ID"/g,
        'USER_SMTP_CREDENTIAL_ID' // Garder l'ID pour référence
      );
      workflowString = workflowString.replace(
        /"USER_SMTP_CREDENTIAL_NAME"/g,
        `SMTP-${userId}`
      );
      
      // Remplacer le placeholder des credentials SMTP par les vraies données
      workflowString = workflowString.replace(
        /"USER_SMTP_CREDENTIAL_PLACEHOLDER"/g,
        JSON.stringify(smtpCredentials)
      );
      
      console.log('✅ [injectParams] Credentials SMTP injectés dans le workflow:', {
        user: params.USER_EMAIL,
        host: smtpServer,
        port: 465,
        secure: true
      });
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

    // 8. Clean and handle nodes
    if (workflow.nodes) {
      workflow.nodes = workflow.nodes.map((node: any) => {
        const cleanedNode: any = {
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
            node.name?.toLowerCase().includes('openrouter') ||
            node.name?.toLowerCase().includes('llm') ||
            node.name?.toLowerCase().includes('ai')) {
          // Nœud LLM/AI - utiliser le credential OpenRouter
          if (adminCreds.OPENROUTER_ID) {
            cleanedNode.credentials = {
              openAiApi: {
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

    // 9. Clean up workflow - only keep essential properties for n8n API
    const cleanedWorkflow: any = {
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
  },

  // 📝 Fonction pour créer un template avec placeholders
  createTemplateWithPlaceholders(): any {
    // Charger le template depuis le fichier
    const fs = require('fs');
    const path = require('path');
    const templatePath = path.join(__dirname, '../../workflow-template-email-summary.json');
    
    try {
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      return JSON.parse(templateContent);
    } catch (error) {
      console.error('❌ Erreur chargement template:', error);
      // Fallback vers un template simple
      return {
        "name": "Email Summary Agent - USER_EMAIL_PLACEHOLDER",
        "active": false,
        "nodes": [],
        "connections": {}
      };
    }
  },

  // 🚀 Fonction pour déployer un workflow Email Summary avec credentials automatiques
  async deployEmailSummaryWorkflow(userId: string, userEmail: string, userPassword: string, userImapServer: string): Promise<{ id: string }> {
    console.log('🚀 [n8nService] Déploiement workflow Email Summary pour utilisateur:', userEmail);
    
    try {
      // 1. Créer le template avec placeholders
      const template = this.createTemplateWithPlaceholders();
      
      // 2. Injecter les paramètres utilisateur
      const workflowWithCredentials = await this.injectParams(template, {
        USER_EMAIL: userEmail,
        IMAP_PASSWORD: userPassword,
        IMAP_SERVER: userImapServer
      }, userId, userEmail);
      
      // 3. Créer le workflow dans n8n
      const result = await this.createWorkflow(workflowWithCredentials);
      
      console.log('✅ [n8nService] Workflow Email Summary déployé:', result.id);
      return result;
      
    } catch (error) {
      console.error('❌ [n8nService] Erreur déploiement workflow:', error);
      throw error;
    }
  }
};
