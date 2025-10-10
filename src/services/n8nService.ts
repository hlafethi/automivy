import { apiClient } from '../lib/api';
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

// interface ProxyResponse {
//   ok: boolean;
//   status: number;
//   data: any;
//   error?: string;
// }

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

        if (node.credentials) cleanedNode.credentials = node.credentials;
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

  async createWorkflow(workflow: N8nWorkflow): Promise<{ id: string }> {
    const cleaned = this.cleanWorkflowForN8n(workflow);
    const result = await callN8nProxy('POST', '/workflows', cleaned);
    console.log('n8n createWorkflow response:', result);
    console.log('n8n createWorkflow response keys:', Object.keys(result));
    console.log('n8n createWorkflow response id:', result.id);
    
    // Si l'ID n'est pas dans la réponse, on doit le récupérer depuis la liste des workflows
    if (!result.id) {
      console.log('ID manquant dans la réponse, récupération depuis la liste des workflows...');
      const workflows = await this.getWorkflows();
      const createdWorkflow = workflows.find(w => w.name === result.name);
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
      // Récupérer le workflow pour obtenir le nom
      const workflow = await callN8nProxy('GET', `/workflows/${workflowId}`);
      console.log('🔍 [n8nService] Workflow récupéré:', workflow.name);
      
      // Utiliser PUT pour mettre à jour le workflow complet
      try {
        const { id, ...updatedWorkflow } = workflow;
        updatedWorkflow.active = true;
        
        await callN8nProxy('PUT', `/workflows/${workflowId}`, updatedWorkflow);
        console.log('✅ [n8nService] Workflow activé via API v1 (PUT)');
      } catch (apiError) {
        console.error('❌ [n8nService] Erreur activation workflow:', apiError);
        throw apiError;
      }
    } catch (error) {
      console.error('❌ [n8nService] Erreur activation workflow:', error);
      throw error;
    }
  },

  async deactivateWorkflow(workflowId: string): Promise<void> {
    console.log(`🔧 [n8nService] Désactivation workflow ${workflowId}`);
    try {
      // Récupérer le workflow pour obtenir le nom
      const workflow = await callN8nProxy('GET', `/workflows/${workflowId}`);
      console.log('🔍 [n8nService] Workflow récupéré:', workflow.name);
      
      // Utiliser PUT pour mettre à jour le workflow complet
      try {
        const { id, ...updatedWorkflow } = workflow;
        updatedWorkflow.active = false;
        
        await callN8nProxy('PUT', `/workflows/${workflowId}`, updatedWorkflow);
        console.log('✅ [n8nService] Workflow désactivé via API v1 (PUT)');
      } catch (apiError) {
        console.error('❌ [n8nService] Erreur désactivation workflow:', apiError);
        throw apiError;
      }
    } catch (error) {
      console.error('❌ [n8nService] Erreur désactivation workflow:', error);
      throw error;
    }
  },

  async deleteWorkflow(workflowId: string): Promise<void> {
    // Dans n8n, il faut d'abord archiver puis supprimer
    try {
      console.log(`Archivage du workflow ${workflowId} sur n8n...`);
      // 1. Archiver le workflow
      await this.archiveWorkflow(workflowId);
      console.log(`Workflow ${workflowId} archivé avec succès`);
      
      // 2. Attendre un peu pour que l'archivage soit pris en compte
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`Tentative de suppression du workflow archivé ${workflowId} sur n8n...`);
      
      // 3. Essayer la suppression (privilégier l'endpoint qui fonctionne)
      let deleted = false;
      
      // Essayer d'abord l'endpoint API v1 (qui fonctionne)
      try {
        console.log(`Tentative suppression via API v1: /workflows/${workflowId}`);
        await callN8nProxy('DELETE', `/workflows/${workflowId}`);
        console.log(`Workflow ${workflowId} supprimé via API v1 avec succès`);
        deleted = true;
      } catch (apiError) {
        console.warn(`Suppression API v1 échouée:`, apiError);
        
        // Fallback sur l'endpoint REST si API v1 échoue
        try {
          console.log(`Tentative suppression via REST: /rest/workflows/${workflowId}`);
          await callN8nProxy('DELETE', `/rest/workflows/${workflowId}`);
          console.log(`Workflow ${workflowId} supprimé via REST avec succès`);
          deleted = true;
        } catch (restError) {
          console.warn(`Suppression REST échouée:`, restError);
        }
      }
      
      if (!deleted) {
        console.warn(`Impossible de supprimer le workflow ${workflowId} de n8n automatiquement`);
        console.log(`Le workflow ${workflowId} a été archivé sur n8n`);
        console.log(`Pour le supprimer définitivement, allez sur n8n → Workflows → Filtres → Archivés → Supprimer`);
      }
      
    } catch (error) {
      console.error('Error archiving workflow from n8n:', error);
      throw error;
    }
  },

  async archiveWorkflow(workflowId: string): Promise<void> {
    // Récupérer le workflow complet pour avoir toutes les propriétés requises
    const workflow = await this.getWorkflow(workflowId);
    
    console.log(`Workflow récupéré pour archivage:`, {
      id: workflow.id,
      name: workflow.name,
      hasNodes: !!workflow.nodes,
      hasConnections: !!workflow.connections,
      hasSettings: !!workflow.settings,
      hasVersionId: !!workflow.versionId,
      active: workflow.active
    });
    
    // Créer le payload avec SEULEMENT les propriétés natives n8n acceptées
    // L'archivage se fait par active: false (convention n8n)
    const archivePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {},
      active: false // Désactiver le workflow pour l'archiver
      // Note: id, tags, versionId ne sont PAS inclus car non acceptés par l'API n8n
    };
    
    console.log(`Payload d'archivage:`, {
      name: archivePayload.name,
      active: archivePayload.active
    });
    
    // Envoyer le payload à l'API n8n
    try {
      await callN8nProxy('PUT', `/workflows/${workflowId}`, archivePayload);
      console.log(`Workflow ${workflowId} archivé avec succès`);
    } catch (error: any) {
      // Si l'erreur indique que 'active' est read-only, retirer cette propriété
      if (error.message && error.message.includes('active is read-only')) {
        console.log(`'active' est read-only, archivage sans cette propriété...`);
        const archivePayloadWithoutActive = {
          name: workflow.name,
          nodes: workflow.nodes,
          connections: workflow.connections,
          settings: workflow.settings || {}
          // Pas de 'active' si read-only
        };
        
        console.log(`Payload d'archivage (sans active):`, {
          name: archivePayloadWithoutActive.name
        });
        
        await callN8nProxy('PUT', `/workflows/${workflowId}`, archivePayloadWithoutActive);
        console.log(`Workflow ${workflowId} archivé avec succès (sans active)`);
      } else {
        throw error;
      }
    }
  },

  async unarchiveWorkflow(workflowId: string): Promise<void> {
    await callN8nProxy('PUT', `/workflows/${workflowId}`, { isArchived: false });
  },

  async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return await callN8nProxy('GET', `/workflows/${workflowId}`);
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

  async findOrCreateCredential(_nodeType: string, credType: string, params: Record<string, any>, userId: string): Promise<string | null> {
    // Map credential types to OAuth providers
    const oauthProviderMap: Record<string, string> = {
      'gmailOAuth2': 'gmail',
      'googleSheetsOAuth2': 'google_sheets',
      'slackOAuth2': 'slack',
      'githubOAuth2': 'github',
    };

    const provider = oauthProviderMap[credType];

    if (provider) {
      // Try to get stored OAuth credential
      try {
        const n8nCredId = await oauthService.getN8nCredentialId(provider);
        if (n8nCredId) {
          console.log(`Using stored OAuth credential for ${provider}: ${n8nCredId}`);
          return n8nCredId;
        }
      } catch (error) {
        console.error(`Failed to get OAuth credential for ${provider}:`, error);
      }

      // If no stored credential, user needs to connect via OAuth
      console.warn(`No OAuth credential found for ${provider}. User must connect via OAuth flow.`);
      return null;
    }

    // For API key based services, we can create them programmatically
    const credentialMap: Record<string, any> = {
      'httpHeaderAuth': params.API_KEY ? {
        type: 'httpHeaderAuth',
        name: `API Key - User ${userId.substring(0, 8)}`,
        data: {
          name: 'Authorization',
          value: `Bearer ${params.API_KEY}`,
        }
      } : null,
      'slackApi': params.SLACK_TOKEN ? {
        type: 'slackApi',
        name: `Slack - User ${userId.substring(0, 8)}`,
        data: {
          accessToken: params.SLACK_TOKEN,
        }
      } : null,
    };

    const credConfig = credentialMap[credType];
    if (!credConfig) return null;

    try {
      const result = await this.createCredential({
        name: credConfig.name,
        type: credConfig.type,
        data: credConfig.data,
      });
      return result.id;
    } catch (error) {
      console.error(`Failed to create credential for ${credType}:`, error);
      return null;
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
    if (adminApiKeys.openai) {
      workflowString = workflowString.replace(/\{\{OPENAI_API_KEY\}\}/g, adminApiKeys.openai);
    }
    if (adminApiKeys.anthropic) {
      workflowString = workflowString.replace(/\{\{ANTHROPIC_API_KEY\}\}/g, adminApiKeys.anthropic);
    }
    if (adminApiKeys.google) {
      workflowString = workflowString.replace(/\{\{GOOGLE_API_KEY\}\}/g, adminApiKeys.google);
    }
    if (adminApiKeys.deepseek) {
      workflowString = workflowString.replace(/\{\{DEEPSEEK_API_KEY\}\}/g, adminApiKeys.deepseek);
    }
    if (adminApiKeys.openrouter) {
      workflowString = workflowString.replace(/\{\{OPENROUTER_API_KEY\}\}/g, adminApiKeys.openrouter);
    }
    if (adminApiKeys.huggingface) {
      workflowString = workflowString.replace(/\{\{HUGGINGFACE_API_KEY\}\}/g, adminApiKeys.huggingface);
    }
    if (adminApiKeys.mistral) {
      workflowString = workflowString.replace(/\{\{MISTRAL_API_KEY\}\}/g, adminApiKeys.mistral);
    }
    if (adminApiKeys.cohere) {
      workflowString = workflowString.replace(/\{\{COHERE_API_KEY\}\}/g, adminApiKeys.cohere);
    }

    // 3. Auto-replace hardcoded email addresses with USER_EMAIL parameter (if provided)
    if (params.USER_EMAIL) {
      // Find all unique email addresses in the template
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = workflowString.match(emailPattern);
      if (emails && emails.length > 0) {
        const uniqueEmails = Array.from(new Set(emails));
        // Replace the first unique email with the user's email
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
        /"mode"\s*:\s*"[^"]+"/g,
        `"mode": "${params.CHECK_INTERVAL}"`
      );
    }

    const workflow = JSON.parse(workflowString);

    // 5. Find or create credentials for nodes that need them
    const createdCredentials: Record<string, string> = {};
    const missingOAuthCreds: string[] = [];

    if (workflow.nodes) {
      for (const node of workflow.nodes) {
        if (node.credentials && Object.keys(node.credentials).length > 0) {
          const credType = Object.keys(node.credentials)[0];
          const credentialId = await this.findOrCreateCredential(node.type, credType, params, userId);

          if (credentialId) {
            createdCredentials[`${node.type}_${credType}`] = credentialId;
          } else {
            // Track missing OAuth credentials
            missingOAuthCreds.push(credType);
          }
        }
      }
    }

    // Log warning if OAuth credentials are missing
    if (missingOAuthCreds.length > 0) {
      console.warn('OAuth credentials required - user must configure in n8n:', missingOAuthCreds);
    }

    // 6. Clean and handle nodes
    if (workflow.nodes) {
      workflow.nodes = workflow.nodes.map((node: any) => {
        // Clean node - keep only allowed properties
        const cleanedNode: any = {
          parameters: node.parameters || {},
          id: node.id,
          name: node.name,
          type: node.type,
          typeVersion: node.typeVersion || 1,
          position: node.position || [0, 0],
        };

        // Attach created credentials
        if (node.credentials && Object.keys(node.credentials).length > 0) {
          const credType = Object.keys(node.credentials)[0];
          const credentialId = createdCredentials[`${node.type}_${credType}`];

          if (credentialId) {
            cleanedNode.credentials = {
              [credType]: {
                id: credentialId,
                name: node.credentials[credType].name || `${node.type} credential`,
              }
            };
          }
        }

        // For AI nodes with API keys from admin, inject them directly in parameters
        if (node.parameters && adminApiKeys) {
          if (node.type.includes('openai') || node.type.includes('OpenAi')) {
            if (adminApiKeys.openai) {
              cleanedNode.parameters.authentication = 'apiKey';
              cleanedNode.parameters.apiKey = adminApiKeys.openai;
            }
          }
          if (node.type.includes('anthropic') || node.type.includes('Anthropic')) {
            if (adminApiKeys.anthropic) {
              cleanedNode.parameters.authentication = 'apiKey';
              cleanedNode.parameters.apiKey = adminApiKeys.anthropic;
            }
          }
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

    // 7. Clean up workflow - only keep essential properties for n8n API
    const cleanedWorkflow: any = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
    };

    // Only add settings if it exists and is not empty
    if (workflow.settings && Object.keys(workflow.settings).length > 0) {
      cleanedWorkflow.settings = workflow.settings;
    }

    console.log('Cleaned workflow keys:', Object.keys(cleanedWorkflow));
    console.log('Cleaned workflow:', JSON.stringify(cleanedWorkflow, null, 2));

    return cleanedWorkflow;
  },

  // Méthodes pour la gestion des credentials utilisateur
  async createCredential(credentialData: any): Promise<{ id: string }> {
    console.log('🔧 [n8nService] Création credential:', credentialData.name);
    const result = await callN8nProxy('POST', '/credentials', credentialData);
    console.log('✅ [n8nService] Credential créé:', result.id);
    return result;
  },

  async deleteCredential(credentialId: string): Promise<void> {
    console.log('🔧 [n8nService] Suppression credential:', credentialId);
    await callN8nProxy('DELETE', `/credentials/${credentialId}`);
    console.log('✅ [n8nService] Credential supprimé');
  },

  async getCredential(credentialId: string): Promise<any> {
    return await callN8nProxy('GET', `/credentials/${credentialId}`);
  },

  async updateCredential(credentialId: string, data: any): Promise<void> {
    console.log('🔧 [n8nService] Mise à jour credential:', credentialId);
    await callN8nProxy('PUT', `/credentials/${credentialId}`, data);
    console.log('✅ [n8nService] Credential mis à jour');
  }
};
