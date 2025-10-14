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

  // Version spécialisée pour l'activation/désactivation - ne garde que les propriétés minimales
  cleanWorkflowForToggle(workflow: any): any {
    console.log('Cleaning workflow for toggle:', {
      name: workflow.name,
      active: workflow.active,
      keys: Object.keys(workflow)
    });

    // Pour l'activation/désactivation, on ne garde que les propriétés essentielles
    const minimalWorkflow: any = {
      name: workflow.name,
      nodes: workflow.nodes || [],
      connections: workflow.connections || {},
      settings: workflow.settings || {} // Toujours inclure settings, même vide
    };

    console.log('Minimal workflow for toggle:', {
      name: minimalWorkflow.name,
      nodeCount: minimalWorkflow.nodes?.length || 0,
      hasConnections: !!minimalWorkflow.connections,
      hasSettings: !!minimalWorkflow.settings,
      settingsKeys: Object.keys(minimalWorkflow.settings),
      keys: Object.keys(minimalWorkflow)
    });

    return minimalWorkflow;
  },

  // Fonction utilitaire pour créer un schedule n8n valide
  createScheduleFromMinutes(minutes: number): any {
    // Si moins d'une heure, utiliser le format minutes
    if (minutes < 60) {
      return {
        rule: {
          interval: [{
            field: 'minutes',
            minutesInterval: minutes
          }]
        }
      };
    }
    
    // Si multiple d'heure exacte, utiliser le format hours
    if (minutes % 60 === 0) {
      return {
        rule: {
          interval: [{
            field: 'hours',
            hoursInterval: minutes / 60
          }]
        }
      };
    }
    
    // Si multiple de jour, utiliser le format days
    if (minutes % 1440 === 0) {
      return {
        rule: {
          interval: [{
            field: 'days',
            daysInterval: minutes / 1440
          }]
        }
      };
    }
    
    // Sinon, utiliser minutes
    return {
      rule: {
        interval: [{
          field: 'minutes',
          minutesInterval: minutes
        }]
      }
    };
  },

  // Corrige les expressions cron invalides dans le workflow
  fixCronExpression(workflow: any): any {
    console.log('🔧 [n8nService] Vérification des expressions cron...');
    
    if (!workflow.nodes) {
      return workflow;
    }

    let hasChanges = false;
    const fixedWorkflow = { ...workflow };
    fixedWorkflow.nodes = workflow.nodes.map((node: any) => {
      // Vérifier si c'est un nœud de déclencheur schedule
      if (node.type === 'n8n-nodes-base.scheduleTrigger') {
        console.log('🔍 [n8nService] Nœud schedule trouvé:', node.name);
        
        // Vérifier l'expression cron
        if (node.parameters && node.parameters.rule) {
          const rule = node.parameters.rule;
          console.log('🔍 [n8nService] Règle actuelle:', rule);
          
          // Si c'est un interval, le convertir en cron valide
          if (rule.interval && rule.interval.length > 0) {
            const interval = rule.interval[0];
            console.log('🔍 [n8nService] Interval trouvé:', interval);
            
            // Convertir l'interval en expression cron valide
            let cronExpression = '0 */1 * * *'; // Par défaut: toutes les heures
            
            if (interval.field === 'cronExpression' && interval.cronExpression) {
              // Vérifier si l'expression cron est valide
              const cron = interval.cronExpression;
              console.log('🔍 [n8nService] Expression cron actuelle:', cron);
              
              // Corriger les expressions cron communes invalides
              if (cron === 'undefined NaN * * *' || cron.includes('undefined') || cron.includes('NaN')) {
                cronExpression = '0 */1 * * *'; // Toutes les heures
                console.log('🔧 [n8nService] Expression cron invalide détectée:', cron);
                hasChanges = true;
                interval.cronExpression = cronExpression;
              } else if (cron === '0 0 * * *' || cron === '0 0 0 * *' || cron === '0 0 0 0 *') {
                cronExpression = '0 0 * * *'; // Tous les jours à minuit
                if (cronExpression !== cron) {
                  hasChanges = true;
                  interval.cronExpression = cronExpression;
                }
              } else if (cron.includes('* * * * *')) {
                cronExpression = '0 */1 * * *'; // Toutes les heures
                if (cronExpression !== cron) {
                  hasChanges = true;
                  interval.cronExpression = cronExpression;
                }
              } else if (cron.includes('*/5 * * * *')) {
                cronExpression = '0 */5 * * *'; // Toutes les 5 heures
                if (cronExpression !== cron) {
                  hasChanges = true;
                  interval.cronExpression = cronExpression;
                }
              } else if (cron.includes('*/15 * * * *')) {
                cronExpression = '0 */15 * * *'; // Toutes les 15 heures
                if (cronExpression !== cron) {
                  hasChanges = true;
                  interval.cronExpression = cronExpression;
                }
              } else {
                // Essayer de corriger l'expression cron
                const parts = cron.split(' ');
                if (parts.length === 5) {
                  // Format standard: minute heure jour mois jour_semaine
                  cronExpression = `${parts[0]} ${parts[1]} * * *`;
                  if (cronExpression !== cron) {
                    hasChanges = true;
                    interval.cronExpression = cronExpression;
                  }
                } else {
                  cronExpression = '0 0 * * *'; // Par défaut: tous les jours à minuit
                  if (cronExpression !== cron) {
                    hasChanges = true;
                    interval.cronExpression = cronExpression;
                  }
                }
              }
              
              if (hasChanges) {
                console.log('🔧 [n8nService] Correction cron:', cron, '->', cronExpression);
              }
            }
          }
        }
      }
      
      return node;
    });

    if (hasChanges) {
      console.log('✅ [n8nService] Corrections cron appliquées');
    } else {
      console.log('ℹ️ [n8nService] Aucune correction cron nécessaire');
    }

    return hasChanges ? fixedWorkflow : workflow;
  },

  async createWorkflow(workflow: N8nWorkflow): Promise<{ id: string }> {
    // 🔍 DEBUG : Vérifier les credentials AVANT nettoyage
    console.log('🔍 [DEBUG] Workflow AVANT envoi à N8N:');
    console.log('Nodes avec credentials:', 
      workflow.nodes
        .filter((n: any) => n.credentials)
        .map((n: any) => ({
          name: n.name,
          type: n.type,
          credentials: n.credentials
        }))
    );
    
    const cleaned = this.cleanWorkflowForN8n(workflow);
    
    // 🔍 DEBUG : Vérifier les credentials APRÈS nettoyage
    console.log('🔍 [DEBUG] Workflow APRÈS nettoyage:');
    console.log('Nodes avec credentials:', 
      cleaned.nodes
        .filter((n: any) => n.credentials)
        .map((n: any) => ({
          name: n.name,
          type: n.type,
          credentials: n.credentials
        }))
    );
    
    const result = await callN8nProxy('POST', '/workflows', cleaned);
    console.log('n8n createWorkflow response:', result);
    console.log('n8n createWorkflow response keys:', Object.keys(result));
    console.log('n8n createWorkflow response id:', result.id);
    
    // 🔍 DEBUG : Vérifier ce qui a été créé dans N8N
    try {
      const createdWorkflow = await this.getWorkflow(result.id);
      console.log('🔍 [DEBUG] Workflow APRÈS création dans N8N:');
      console.log('Nodes avec credentials:', 
        createdWorkflow.nodes
          .filter((n: any) => n.credentials)
          .map((n: any) => ({
            name: n.name,
            credentials: n.credentials
          }))
      );
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du workflow créé:', error);
    }
    
    // Si l'ID n'est pas dans la réponse, on doit le récupérer depuis la liste des workflows
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
      // 🔍 DIAGNOSTIC: Désactivé temporairement (problème 405)
      // await this.listAllCredentials();
      
      // 1. Récupérer le workflow
      const workflow = await callN8nProxy('GET', `/workflows/${workflowId}`);
      
      console.log('🔍 [DEBUG] État du workflow AVANT activation:');
      console.log('  - Nom:', workflow.name);
      console.log('  - Nombre de nodes:', workflow.nodes?.length);
      
      // 🔍 DIAGNOSTIC: Vérifier les credentials de chaque node
      workflow.nodes.forEach((node: any, index: number) => {
        console.log(`Node ${index + 1}: ${node.name} (${node.type})`);
        if (node.credentials) {
          console.log(`  - Credentials:`, Object.keys(node.credentials));
          Object.entries(node.credentials).forEach(([type, cred]: [string, any]) => {
            console.log(`    - ${type}: ${cred.id} (${cred.name})`);
          });
        } else {
          console.log(`  - PAS DE CREDENTIALS`);
        }
      });
      
      // 2. ATTACHER manuellement les credentials admin connus
      const workflowWithCredentials = {
        ...workflow,
        nodes: workflow.nodes.map((node: any) => {
          let updatedNode = { ...node };
          
          // Node Email Send → SMTP credential (ID réel)
          if (node.type === 'n8n-nodes-base.emailSend') {
            updatedNode.credentials = {
              ...updatedNode.credentials,
              smtp: {
                id: 'D4oqu1Q1cbRrqVPc', // ID SMTP réel
                name: 'smtp_auto_0e371f97'
              }
            };
            console.log('✅ Credential SMTP attaché manuellement au node Email');
          }
          
          // Node HTTP Request → OpenRouter credential (ID réel)
          if (node.type === 'n8n-nodes-base.httpRequest' && 
              (node.parameters?.url?.includes('openrouter') || node.parameters?.url?.includes('openai'))) {
            updatedNode.credentials = {
              ...updatedNode.credentials,
              httpHeaderAuth: {
                id: 'DJ4JtAswl4vKWvdI', // ID OpenRouter réel
                name: 'OpenRouter account'
              }
            };
            console.log('✅ Credential OpenRouter attaché manuellement au node HTTP');
          }
          
          return updatedNode;
        })
      };
      
      // 3. TOUJOURS sauvegarder le workflow avec les credentials attachés
      console.log('🔧 Sauvegarde du workflow avec credentials...');
      
      await callN8nProxy('PUT', `/workflows/${workflowId}`, {
        name: workflowWithCredentials.name,
        nodes: workflowWithCredentials.nodes,
        connections: workflowWithCredentials.connections,
        settings: workflowWithCredentials.settings || {}
      });
      
      console.log('✅ Workflow avec credentials sauvegardé');
      
      // 4. Activer le workflow
      await callN8nProxy('POST', `/workflows/${workflowId}/activate`);
      console.log('✅ [n8nService] Workflow activé');
      
      // 5. FORCER la correction du schedule trigger (optionnel)
      let needsUpdate = false;
      const updatedNodes = workflowWithCredentials.nodes.map((node: any) => {
        if (node.type === 'n8n-nodes-base.scheduleTrigger') {
          const currentInterval = node.parameters?.rule?.interval?.[0];
          console.log('🔍 Current schedule:', currentInterval);
          
          // Si l'interval est null ou invalide, le corriger
          if (!currentInterval?.minutesInterval || currentInterval.minutesInterval === null) {
            console.log('🔧 Correction du schedule trigger: minutesInterval null → 60');
            needsUpdate = true;
            
            return {
              ...node,
              parameters: {
                rule: {
                  interval: [{
                    field: 'minutes',
                    minutesInterval: 60
                  }]
                }
              }
            };
          }
        }
        
        // 3. Supprimer les credentials avec id: null
        if (node.credentials) {
          const cleanCreds: any = {};
          let hasValidCreds = false;
          
          Object.entries(node.credentials).forEach(([type, cred]: [string, any]) => {
            if (cred.id && cred.id !== null && cred.id !== 'null') {
              cleanCreds[type] = cred;
              hasValidCreds = true;
            } else {
              console.warn(`⚠️ Credential invalide supprimé: ${node.name} - ${type}`);
              needsUpdate = true;
            }
          });
          
          if (hasValidCreds) {
            return { ...node, credentials: cleanCreds };
          } else {
            // Supprimer complètement credentials si tous invalides
            const { credentials, ...cleanNode } = node;
            return cleanNode;
          }
        }
        
        return node;
      });
      
      // 4. Si on a fait des modifications, sauvegarder
      if (needsUpdate) {
        console.log('🔧 Sauvegarde du workflow corrigé...');
        
        await callN8nProxy('PUT', `/workflows/${workflowId}`, {
          name: workflow.name,
          nodes: updatedNodes,
          connections: workflow.connections,
          settings: workflow.settings || {}
        });
        
        console.log('✅ Workflow corrigé et sauvegardé');
      }
      
      // 5. Maintenant activer
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
      // ✅ JUSTE appeler l'endpoint de désactivation
      await callN8nProxy('POST', `/workflows/${workflowId}/deactivate`);
      console.log('✅ [n8nService] Workflow désactivé');
    } catch (error) {
      console.error('❌ [n8nService] Erreur désactivation:', error);
      throw error;
    }
  },

  // 🔧 Fonction pour récupérer les IDs des credentials admin EXISTANTS dans n8n
  async getAdminCredentials(): Promise<Record<string, string>> {
    console.log('🔍 [n8nService] Récupération des credentials admin existants...');
    
    try {
      // Récupérer TOUS les credentials de n8n
      const allCredentials = await callN8nProxy('GET', '/credentials');
      console.log('🔍 [n8nService] Credentials trouvés dans n8n:', allCredentials.length);
      
      const adminCreds: Record<string, string> = {};
      
      // Chercher les credentials admin par leur nom
      for (const cred of allCredentials) {
        console.log(`  - ${cred.name} (${cred.type}) [ID: ${cred.id}]`);
        
        // Identifier les credentials admin par leur nom (plus flexible)
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
        
        if (cred.name.toLowerCase().includes('mcp') || 
            cred.name.toLowerCase().includes('header') ||
            cred.name.toLowerCase().includes('auth') ||
            cred.name.toLowerCase().includes('http')) {
          adminCreds.MCP_ID = cred.id;
          console.log('✅ Credential MCP/HTTP trouvé:', cred.id);
        }
      }
      
      console.log('✅ [n8nService] Credentials admin récupérés:', adminCreds);
      return adminCreds;
    } catch (error) {
      console.error('❌ [n8nService] Erreur récupération credentials admin:', error);
      return {};
    }
  },

  // 🔧 Fonction pour attacher automatiquement les credentials admin aux workflows
  async attachAdminCredentialsToWorkflow(workflow: any): Promise<any> {
    console.log('🔧 [n8nService] Attachement automatique des credentials admin...');
    
    try {
      // Récupérer les credentials admin
      const adminCreds = await this.getAdminCredentials();
      
      if (Object.keys(adminCreds).length === 0) {
        console.warn('⚠️ [n8nService] Aucun credential admin trouvé');
        return workflow;
      }
      
      // Attacher les credentials aux nodes qui en ont besoin
      const updatedNodes = workflow.nodes.map((node: any) => {
        let updatedNode = { ...node };
        
        // Node HTTP Request → OpenRouter credential
        if (node.type === 'n8n-nodes-base.httpRequest' && 
            node.parameters?.url?.includes('openrouter')) {
          if (adminCreds.OPENROUTER_ID) {
            updatedNode.credentials = {
              ...updatedNode.credentials,
              httpHeaderAuth: {
                id: adminCreds.OPENROUTER_ID,
                name: 'OpenRouter Admin'
              }
            };
            console.log('✅ Credential OpenRouter attaché au node HTTP');
          }
        }
        
        // Node Email Send → SMTP credential
        if (node.type === 'n8n-nodes-base.emailSend') {
          if (adminCreds.SMTP_ID) {
            updatedNode.credentials = {
              ...updatedNode.credentials,
              smtp: {
                id: adminCreds.SMTP_ID,
                name: 'SMTP Admin'
              }
            };
            console.log('✅ Credential SMTP attaché au node Email');
          }
        }
        
        return updatedNode;
      });
      
      return {
        ...workflow,
        nodes: updatedNodes
      };
      
    } catch (error) {
      console.error('❌ [n8nService] Erreur attachement credentials:', error);
      return workflow;
    }
  },

  // 🔍 Fonction de diagnostic pour lister TOUS les credentials
  async listAllCredentials(): Promise<void> {
    console.log('🔍 [DIAGNOSTIC] Liste complète des credentials n8n...');
    try {
      const allCredentials = await callN8nProxy('GET', '/credentials');
      console.log(`📊 Total credentials: ${allCredentials.length}`);
      
      allCredentials.forEach((cred: any, index: number) => {
        console.log(`${index + 1}. ${cred.name}`);
        console.log(`   - Type: ${cred.type}`);
        console.log(`   - ID: ${cred.id}`);
        console.log(`   - Créé: ${cred.createdAt}`);
        console.log('---');
      });
    } catch (error) {
      console.error('❌ [DIAGNOSTIC] Erreur:', error);
    }
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
      // Fallback vers l'ancien template
      return {
        "name": "Email Summary Agent - USER_EMAIL_PLACEHOLDER",
        "active": false,
        "nodes": [
        {
          "parameters": {
            "options": {}
          },
          "id": "661ebbde-47c5-4986-85c2-a4b6c5ada4a8",
          "name": "Fetch Emails via IMAP",
          "type": "n8n-nodes-base.emailReadImap",
          "position": [-208, 176],
          "typeVersion": 1,
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
            "include": "allFields",
            "options": {}
          },
          "id": "bdf20575-304e-4873-a962-89e91b9b5ebf",
          "name": "Organize Email Data",
          "type": "n8n-nodes-base.aggregate",
          "position": [48, 176],
          "typeVersion": 1
        },
        {
          "parameters": {
            "fromEmail": "USER_EMAIL_PLACEHOLDER",
            "toEmail": "USER_EMAIL_PLACEHOLDER",
            "subject": "=Résumé quotidien des emails importants du {{ $now.format('DD/MM/YYYY') }}",
            "html": "=<!DOCTYPE html>\n<html lang=\"fr\">\n<head>\n  <meta charset=\"UTF-8\">\n  <style>\n    body { font-family: Arial, sans-serif; background: #f9fafb; color: #23272f; margin: 0; }\n    .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 6px #dedede; padding: 24px; }\n    h1 { background: #0066cc; color: #fff; border-radius: 8px; padding: 14px 0; text-align: center; font-size: 20px; letter-spacing: 1px; }\n    .priority { margin: 18px 0 10px 0; font-size: 17px; font-weight: bold; }\n    .urgent { color: #fff; background: #d32f2f; padding: 6px 14px; border-radius: 5px; display: inline-block;}\n    .important { color: #fff; background: #fbc02d; padding: 6px 14px; border-radius: 5px; display: inline-block;}\n    .info { color: #fff; background: #1976d2; padding: 6px 14px; border-radius: 5px; display: inline-block;}\n    ul { padding-left: 20px; }\n    li { margin-bottom: 12px; }\n    .icon { font-size: 20px; margin-right: 8px; }\n    .recap { margin-top: 25px; background: #F1F0F5; border-left: 4px solid #0073e6; padding: 14px; border-radius: 6px; font-size: 16px; }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <h1>📬 Résumé & actions des emails reçus ces 24h</h1>\n    <div style=\"white-space: pre-line; font-family: Arial, sans-serif;\">{{ $json.output }}</div>\n  </div>\n</body>\n</html>",
            "options": {}
          },
          "id": "08365b04-b24e-469e-ba20-e34d0e633ebe",
          "name": "Send Summary via SMTP",
          "type": "n8n-nodes-base.emailSend",
          "position": [624, 176],
          "typeVersion": 1,
          "credentials": {
            "smtp": {
              "id": "ADMIN_SMTP_PLACEHOLDER",
              "name": "smtp_auto_ff8afa8b"
            }
          }
        },
        {
          "parameters": {
            "promptType": "define",
            "text": "=Voici les emails reçus aujourd'hui : {{ $json.data.toJsonString() }}\n\nAnalyse TOUS les emails et résume sous forme de liste :\n- Catégorise par priorité (urgent, important, à lire)\n- Identifie les emails avec le mot 'urgent' dans le sujet ou le contenu\n- Propose un résumé, puis liste toutes les tâches/action items importantes.\n- Assure-toi de ne manquer aucun email\n",
            "options": {
              "systemMessage": "Tu es un assistant IA spécialisé dans l'analyse d'emails. Synthétise sous forme structurée les informations essentielles et importantes des emails reçus ce jour :\n- Priorise les urgences (emails avec 'urgent' dans le sujet ou contenu)\n- Résume les demandes importantes, \n- Liste les actions à faire.\n- Assure-toi de ne manquer aucun email important.\n\n"
            }
          },
          "type": "@n8n/n8n-nodes-langchain.agent",
          "typeVersion": 2.2,
          "position": [256, 176],
          "id": "86d0db40-1052-4c01-b4a6-063b7ef805ae",
          "name": "AI Agent"
        },
        {
          "parameters": {
            "options": {}
          },
          "type": "@n8n/n8n-nodes-langchain.lmChatOpenRouter",
          "typeVersion": 1,
          "position": [128, 384],
          "id": "63940b34-1929-45fa-924a-a2a0486d4a2d",
          "name": "OpenRouter Chat Model",
          "credentials": {
            "openRouterApi": {
              "id": "ADMIN_OPENROUTER_PLACEHOLDER",
              "name": "OpenRouter account"
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
          "id": "3b7bd374-5b7b-4785-afae-8c8f9b617d08",
          "name": "Simple Memory"
        },
        {
          "parameters": {},
          "type": "@n8n/n8n-nodes-langchain.toolCalculator",
          "typeVersion": 1,
          "position": [560, 384],
          "id": "49e28dd0-cbce-4b9e-a0c9-336b19784b46",
          "name": "Calculator"
        },
        {
          "parameters": {
            "url": "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('URL', ``, 'string') }}",
            "authentication": "genericCredentialType",
            "genericAuthType": "httpHeaderAuth",
            "options": {}
          },
          "type": "n8n-nodes-base.httpRequestTool",
          "typeVersion": 4.2,
          "position": [400, 480],
          "id": "823f77c2-78d7-4fbc-bee7-465d6030110c",
          "name": "HTTP Request",
          "credentials": {
            "httpHeaderAuth": {
              "id": "ADMIN_OPENROUTER_PLACEHOLDER",
              "name": "Header Auth account"
            }
          }
        }
      ],
      "connections": {
        "Schedule Trigger": {
          "main": [
            [
              {
                "node": "Fetch Emails via IMAP",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Fetch Emails via IMAP": {
          "main": [
            [
              {
                "node": "Organize Email Data",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Organize Email Data": {
          "main": [
            [
              {
                "node": "AI Agent",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "AI Agent": {
          "main": [
            [
              {
                "node": "Send Summary via SMTP",
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
                "node": "AI Agent",
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
                "node": "AI Agent",
                "type": "ai_memory",
                "index": 0
              }
            ]
          ]
        },
        "Calculator": {
          "ai_tool": [
            [
              {
                "node": "AI Agent",
                "type": "ai_tool",
                "index": 0
              }
            ]
          ]
        },
        "HTTP Request": {
          "ai_tool": [
            [
              {
                "node": "AI Agent",
                "type": "ai_tool",
                "index": 0
              }
            ]
          ]
        }
      },
      "settings": {
        "executionOrder": "v1"
      },
      "versionId": "dc49e4db-123a-497e-bb12-9686ab4ddaa3",
      "meta": {
        "templateCredsSetupCompleted": true,
        "instanceId": "b0be7bf6e0dec32a9b3d1eb6df3c73694ce94c9ac7838dada4077a352677a688"
      },
      "id": "SvgAte3VVpz8UGaF",
      "tags": []
    };
  },

  // 🧪 Fonction de test pour diagnostiquer les credentials
  async diagnoseWorkflowCredentials(workflowId: string): Promise<void> {
    console.log(`🔍 [DIAGNOSTIC] Analyse des credentials du workflow ${workflowId}`);
    try {
      const workflow = await callN8nProxy('GET', `/workflows/${workflowId}`);
      
      console.log('📊 [DIAGNOSTIC] Résumé du workflow:');
      console.log(`  - Nom: ${workflow.name}`);
      console.log(`  - Nombre de nodes: ${workflow.nodes?.length || 0}`);
      console.log(`  - Active: ${workflow.active || false}`);
      
      const nodesWithCredentials = workflow.nodes?.filter((n: any) => n.credentials) || [];
      const nodesWithoutCredentials = workflow.nodes?.filter((n: any) => !n.credentials) || [];
      
      console.log(`📊 [DIAGNOSTIC] Nodes avec credentials: ${nodesWithCredentials.length}`);
      nodesWithCredentials.forEach((node: any, index: number) => {
        console.log(`  ${index + 1}. ${node.name} (${node.type})`);
        console.log(`     Credentials:`, JSON.stringify(node.credentials, null, 2));
      });
      
      console.log(`📊 [DIAGNOSTIC] Nodes SANS credentials: ${nodesWithoutCredentials.length}`);
      nodesWithoutCredentials.forEach((node: any, index: number) => {
        console.log(`  ${index + 1}. ${node.name} (${node.type})`);
      });
      
      // Recommandations
      if (nodesWithoutCredentials.length > 0) {
        console.log('💡 [RECOMMANDATION] Pour activer ce workflow:');
        console.log('  1. Ouvrez le workflow dans N8N');
        console.log('  2. Configurez les credentials manquants pour chaque nœud');
        console.log('  3. Testez l\'activation depuis votre interface');
      }
      
    } catch (error) {
      console.error('❌ [DIAGNOSTIC] Erreur:', error);
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
      hasVersionId: !!(workflow as any).versionId,
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
      // Remplacer les placeholders pour le Schedule Trigger
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
    let userImapCredentialId: string | null = null;
    let userSmtpCredentialId: string | null = null;
    
    if (params.USER_EMAIL && params.IMAP_PASSWORD && params.IMAP_SERVER) {
      try {
        // Créer credential IMAP
        const imapCred = await this.createCredential({
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
        const smtpCred = await this.createCredential({
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

    // 7. Remplacer les placeholders de credentials
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
    const createdCredentials: Record<string, string> = {};
    const missingOAuthCreds: string[] = [];

    // Log warning if OAuth credentials are missing
    if (missingOAuthCreds.length > 0) {
      console.warn('OAuth credentials required - user must configure in n8n:', missingOAuthCreds);
    }

    // 🔍 Vérifier que les credentials créés existent vraiment
    console.log('🔍 [injectParams] Vérification des credentials créés:');
    for (const [key, credId] of Object.entries(createdCredentials)) {
      try {
        const cred = await this.getCredential(credId);
        console.log(`✅ Credential ${key}:`, cred.id, cred.name);
      } catch (error) {
        console.error(`❌ Credential ${key} INVALIDE:`, credId, error);
      }
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
            console.log(`🔗 [injectParams] Credential attaché à ${node.name}:`, {
              type: credType,
              id: credentialId,
              name: node.credentials[credType].name || `${node.type} credential`
            });
          } else {
            console.warn(`⚠️ [injectParams] Pas de credential pour ${node.name} (${node.type})`);
          }
        }

        // For AI nodes with API keys from admin, inject them directly in parameters
        if (node.parameters && adminApiKeys) {
          if (node.type.includes('openai') || node.type.includes('OpenAi')) {
            const openaiKey = adminApiKeys.find(k => k.service === 'openai')?.key;
            if (openaiKey) {
              cleanedNode.parameters.authentication = 'apiKey';
              cleanedNode.parameters.apiKey = openaiKey;
            }
          }
          if (node.type.includes('anthropic') || node.type.includes('Anthropic')) {
            const anthropicKey = adminApiKeys.find(k => k.service === 'anthropic')?.key;
            if (anthropicKey) {
              cleanedNode.parameters.authentication = 'apiKey';
              cleanedNode.parameters.apiKey = anthropicKey;
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

  async getCredential(credentialId: string): Promise<any> {
    return await callN8nProxy('GET', `/credentials/${credentialId}`);
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
