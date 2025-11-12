// Service AI pour le backend - Appelle OpenRouter
const fetch = require('node-fetch');
const n8nService = require('./n8nService');

class AIService {
  
  // Générer un workflow avec OpenRouter
  // Modèle par défaut : openai/gpt-4o-mini (bon rapport performance/prix, très peu cher ~$0.15/1M tokens)
  // Alternative gratuite : meta-llama/llama-3.1-8b-instruct (gratuit avec limites)
  static async generateWorkflow(prompt, aiProvider = 'openrouter', model = 'openai/gpt-4o-mini') {
    try {
      console.log('🤖 [AIService] Génération de workflow avec OpenRouter...');
      console.log('📝 [AIService] Prompt:', prompt.substring(0, 200) + '...');
      
      if (aiProvider !== 'openrouter') {
        throw new Error(`Provider ${aiProvider} non supporté. Utilisez 'openrouter'.`);
      }
      
      // Récupérer la clé API OpenRouter depuis les variables d'environnement
      let openRouterApiKey = process.env.OPENROUTER_API_KEY;
      
      if (!openRouterApiKey) {
        console.error('❌ [AIService] OPENROUTER_API_KEY non trouvée dans les variables d\'environnement');
        console.error('❌ [AIService] Veuillez ajouter OPENROUTER_API_KEY dans votre fichier .env');
        console.error('❌ [AIService] Exemple: OPENROUTER_API_KEY=sk-or-v1-...');
        throw new Error('OPENROUTER_API_KEY non trouvée dans les variables d\'environnement. Ajoutez-la dans .env à la racine du projet backend avec: OPENROUTER_API_KEY=sk-or-v1-votre-cle-api');
      }
      
      console.log('🔑 [AIService] Clé API OpenRouter trouvée');
      
      // Construire le prompt système avec les règles strictes
      const systemPrompt = `You are an expert n8n workflow designer. Generate COMPLETE, FUNCTIONAL n8n workflows in valid JSON format.

CRITICAL RULES - YOU MUST FOLLOW ALL OF THESE:

1. ALWAYS include ALL required nodes mentioned in the user request - DO NOT skip any nodes!

2. For email workflows with AI Agent, you MUST include ALL these nodes in this exact order:
   a. Webhook Trigger (n8n-nodes-base.webhook) OR Schedule Trigger (n8n-nodes-base.schedule) - REQUIRED
   b. IMAP Email Read (n8n-nodes-base.emailReadImap) with credentials USER_IMAP_CREDENTIAL_ID - REQUIRED
   c. Aggregate Emails (n8n-nodes-base.aggregate) with aggregate: "aggregateAllItemData" and destinationFieldName: "data" - REQUIRED
   d. AI Agent (@n8n/n8n-nodes-langchain.agent) with prompt using {{ $json.data.toJsonString() }} - REQUIRED
   e. OpenRouter Chat Model (@n8n/n8n-nodes-langchain.lmChatOpenRouter) with model "${model}" (default: openai/gpt-4o-mini - cheap and reliable) and credentials ADMIN_OPENROUTER_CREDENTIAL_ID - REQUIRED
   f. Calculator Tool (@n8n/n8n-nodes-langchain.toolCalculator) - REQUIRED
   g. Buffer Window Memory (@n8n/n8n-nodes-langchain.memoryBufferWindow) with contextWindowLength: 10 - REQUIRED
   h. Function/Code node (n8n-nodes-base.function) to parse and group by sender - REQUIRED
   i. IMAP nodes (n8n-nodes-imap.imap) to create folders and move emails - REQUIRED
   j. Optional: SMTP Send Email (n8n-nodes-base.emailSend) with toEmail: "{{USER_EMAIL}}"

3. ⚠️ CRITICAL - Every node MUST have an "id" field (unique string like "webhook-trigger", "imap-email", etc.)

4. ⚠️ CRITICAL - Credentials MUST be objects with id and name, NOT strings:
   - IMAP: {"credentials": {"imap": {"id": "USER_IMAP_CREDENTIAL_ID", "name": "USER_IMAP_CREDENTIAL_NAME"}}}
   - OpenRouter: {"credentials": {"openRouterApi": {"id": "ADMIN_OPENROUTER_CREDENTIAL_ID", "name": "ADMIN_OPENROUTER_CREDENTIAL_NAME"}}}
   - SMTP: {"credentials": {"smtp": {"id": "USER_SMTP_CREDENTIAL_ID", "name": "USER_SMTP_CREDENTIAL_NAME"}}}

5. ⚠️ CRITICAL - Connections structure MUST be array of arrays: [[{...}]], NOT [{...}]:
   - Main connections: "main": [[{"node": "Node Name", "type": "main", "index": 0}]]
   - AI connections: "ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]

6. ⚠️ CRITICAL - AI connections direction: Connect FROM the source nodes TO the AI Agent:
   - "OpenRouter Chat Model" connects TO "AI Agent" via "ai_languageModel"
   - "Calculator Tool" connects TO "AI Agent" via "ai_tool"
   - "Buffer Window Memory" connects TO "AI Agent" via "ai_memory"
   - These connections are defined in the SOURCE node (OpenRouter, Calculator, Memory), not in AI Agent

7. Connect nodes using their NAMES (not IDs) in connections

8. Use connection types: "main", "ai_languageModel", "ai_tool", "ai_memory"

9. NEVER use "next" connection type

10. Include "settings": {}, "active": false, "versionId": "1"

11. Every node MUST have: id, name, type, typeVersion, position, parameters

12. Positions must be spaced horizontally: [250, 300], [500, 300], [750, 300], [1000, 300], etc.

13. The workflow name MUST be a short descriptive name (max 50 chars), NOT the prompt or system instructions

14. ALL nodes mentioned in the user request MUST be included - NO EXCEPTIONS

EXAMPLE CONNECTIONS STRUCTURE:
{
  "connections": {
    "Webhook Trigger": {
      "main": [[{"node": "IMAP Email Read", "type": "main", "index": 0}]]
    },
    "IMAP Email Read": {
      "main": [[{"node": "Aggregate Emails", "type": "main", "index": 0}]]
    },
    "Aggregate Emails": {
      "main": [[{"node": "AI Agent", "type": "main", "index": 0}]]
    },
    "AI Agent": {
      "main": [[{"node": "Function", "type": "main", "index": 0}]]
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

Return ONLY valid JSON, no markdown, no explanations. Start with { and end with }.
The workflow name must be extracted from the user request, not from the system prompt.`;

      // Appeler OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterApiKey}`,
          'HTTP-Referer': 'https://automivy.com',
          'X-Title': 'Automivy Workflow Generator'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 8000
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [AIService] Erreur OpenRouter:', response.status, errorText);
        throw new Error(`Erreur OpenRouter: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ [AIService] Réponse OpenRouter reçue');
      
      // Extraire le contenu de la réponse
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Réponse OpenRouter invalide: pas de contenu');
      }
      
      // Parser le JSON (peut être dans des backticks markdown)
      let workflowJson = content.trim();
      
      // Supprimer les backticks markdown
      if (workflowJson.startsWith('```json')) {
        workflowJson = workflowJson.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (workflowJson.startsWith('```')) {
        workflowJson = workflowJson.replace(/```\n?/g, '');
      }
      
      // Supprimer tout texte avant le premier {
      const firstBrace = workflowJson.indexOf('{');
      if (firstBrace > 0) {
        workflowJson = workflowJson.substring(firstBrace);
        console.log(`⚠️ [AIService] Texte supprimé avant le JSON (${firstBrace} caractères)`);
      }
      
      // Supprimer tout texte après le dernier }
      const lastBrace = workflowJson.lastIndexOf('}');
      if (lastBrace >= 0 && lastBrace < workflowJson.length - 1) {
        workflowJson = workflowJson.substring(0, lastBrace + 1);
        console.log(`⚠️ [AIService] Texte supprimé après le JSON`);
      }
      
      // Nettoyer les expressions n8n mal échappées dans les chaînes JSON
      // Les expressions {{ }} doivent être dans des chaînes JSON valides
      // Remplacer les guillemets simples par des guillemets doubles pour les propriétés JSON
      workflowJson = workflowJson.replace(/([{,]\s*)(['"]?)(\w+)(['"]?\s*):/g, (match, prefix, quote1, key, quote2) => {
        // Si les clés utilisent des guillemets simples ou pas de guillemets, les remplacer par des guillemets doubles
        if (quote1 === "'" || quote1 === '') {
          return `${prefix}"${key}":`;
        }
        return match;
      });
      
      // Corriger les expressions n8n avec des guillemets échappés incorrectement
      // L'IA génère souvent \\" au lieu de \" dans les expressions n8n
      // Dans JSON, on doit utiliser \" pour échapper les guillemets, pas \\"
      
      // Remplacer tous les \\" par \" dans les expressions n8n (entre {{ et }})
      workflowJson = workflowJson.replace(/\{\{([^}]*)\}\}/g, (match, expr) => {
        // Dans l'expression n8n, remplacer \\" par \" et \\' par \'
        const correctedExpr = expr.replace(/\\\\"/g, '\\"').replace(/\\\\'/g, "\\'");
        return `{{${correctedExpr}}}`;
      });
      
      // Corriger les chaînes JSON avec des expressions n8n mal échappées
      // Les expressions {{ }} dans les valeurs doivent avoir leurs guillemets internes correctement échappés
      workflowJson = workflowJson.replace(/:\s*"([^"]*\{\{[^}]+\}\}[^"]*)"\s*([,}])/g, (match, value, suffix) => {
        // Échapper correctement les guillemets dans les expressions n8n
        const escapedValue = value.replace(/\\"/g, '"').replace(/"/g, '\\"').replace(/\{\{([^}]+)\}\}/g, (expr, content) => {
          // Dans les expressions n8n, échapper les guillemets doubles
          const escapedContent = content.replace(/"/g, '\\"');
          return `{{${escapedContent}}}`;
        });
        return `: "${escapedValue}"${suffix}`;
      });
      
      // Corriger les chaînes multi-lignes (comme functionCode) qui doivent être échappées
      workflowJson = workflowJson.replace(/("functionCode"\s*:\s*)"([^"]*(?:\n[^"]*)*)"([,}])/g, (match, key, value, suffix) => {
        // Échapper correctement les sauts de ligne et les guillemets dans le code
        const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
        return `${key}"${escapedValue}"${suffix}`;
      });
      
      // Log pour debug (tronqué)
      if (workflowJson.length > 500) {
        console.log(`📝 [AIService] JSON nettoyé (${workflowJson.length} caractères):`, workflowJson.substring(0, 500) + '...');
      } else {
        console.log(`📝 [AIService] JSON nettoyé:`, workflowJson);
      }
      
      let workflow;
      try {
        workflow = JSON.parse(workflowJson);
      } catch (parseError) {
        console.error('❌ [AIService] Erreur de parsing JSON:', parseError.message);
        console.error('❌ [AIService] Position de l\'erreur:', parseError.message.match(/position (\d+)/)?.[1]);
        console.error('❌ [AIService] JSON autour de l\'erreur:');
        
        // Afficher le contexte autour de l'erreur
        const errorPosition = parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0');
        const start = Math.max(0, errorPosition - 100);
        const end = Math.min(workflowJson.length, errorPosition + 100);
        console.error('❌ [AIService] Contexte:', workflowJson.substring(start, end));
        console.error('❌ [AIService] JSON complet:', workflowJson);
        
        throw new Error(`Erreur de parsing JSON généré par l'IA: ${parseError.message}. Le JSON peut contenir des caractères non échappés ou un format invalide.`);
      }
      
      // Post-processing pour corriger les erreurs communes
      console.log('🔧 [AIService] Post-processing du workflow...');
      
      // 1. Corriger le nom du workflow
      if (workflow.name && (workflow.name.length > 100 || workflow.name.includes('Crée un workflow'))) {
        console.log('⚠️ [AIService] Nom du workflow trop long ou mal formaté, correction...');
        const shortName = workflow.name
          .substring(0, 50)
          .replace(/You are an expert.*?\./g, '')
          .replace(/Crée un workflow n8n qui analyse les emails de la/g, 'Analyse Emails par Expéditeur')
          .trim();
        workflow.name = shortName || 'AI Generated Workflow';
      }
      
      // 2. Ajouter des IDs manquants aux nœuds
      if (workflow.nodes) {
        workflow.nodes.forEach((node, index) => {
          if (!node.id) {
            const nodeId = node.name
              ? node.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
              : `node-${index}`;
            node.id = nodeId;
            console.log(`✅ [AIService] ID ajouté au nœud: ${node.name} -> ${node.id}`);
          }
        });
      }
      
      // 3. Corriger le format des credentials (strings -> objets) et corriger les types
      if (workflow.nodes) {
        workflow.nodes.forEach(node => {
          if (node.credentials) {
            const newCredentials = {};
            
            Object.keys(node.credentials).forEach(credType => {
              const credValue = node.credentials[credType];
              
              // Corriger le type de credential OpenRouter
              if (credType === 'openRouter' && node.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter') {
                credType = 'openRouterApi';
              }
              
              if (typeof credValue === 'string') {
                // Convertir string en objet
                const credId = credValue;
                let credName = credId.replace(/_/g, ' ').replace(/ID$/g, '');
                
                // Mapper les noms de credentials
                if (credId.includes('IMAP')) {
                  credName = 'IMAP Email';
                } else if (credId.includes('SMTP')) {
                  credName = 'SMTP Email';
                } else if (credId.includes('OPENROUTER')) {
                  credName = 'OpenRouter';
                }
                
                newCredentials[credType] = {
                  id: credId,
                  name: credName
                };
                console.log(`✅ [AIService] Credential corrigé pour ${node.name}: ${credType}`);
              } else if (typeof credValue === 'object' && credValue !== null) {
                // Si c'est déjà un objet, le garder tel quel
                newCredentials[credType] = credValue;
              }
            });
            
            // Remplacer les credentials si nécessaire
            if (Object.keys(newCredentials).length > 0) {
              node.credentials = newCredentials;
            }
          }
        });
      }
      
      // 4. Corriger la structure des connexions (tableau -> tableau de tableaux)
      // et corriger la direction des connexions IA (doivent partir des nœuds sources vers AI Agent)
      if (workflow.connections) {
        const nodeNames = workflow.nodes?.map(n => n.name) || [];
        const aiAgentNode = workflow.nodes?.find(n => n.type === '@n8n/n8n-nodes-langchain.agent');
        const aiAgentName = aiAgentNode?.name || 'AI Agent';
        
        // Trouver les nœuds IA
        const openRouterNode = workflow.nodes?.find(n => n.type === '@n8n/n8n-nodes-langchain.lmChatOpenRouter');
        const calculatorNode = workflow.nodes?.find(n => n.type === '@n8n/n8n-nodes-langchain.toolCalculator');
        const memoryNode = workflow.nodes?.find(n => n.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow');
        
        // Correction des connexions existantes
        Object.keys(workflow.connections).forEach(fromNode => {
          const nodeConnections = workflow.connections[fromNode];
          Object.keys(nodeConnections).forEach(connectionType => {
            const connections = nodeConnections[connectionType];
            
            // Si c'est un tableau d'objets au lieu d'un tableau de tableaux
            if (Array.isArray(connections) && connections.length > 0) {
              const firstItem = connections[0];
              // Si le premier élément est un objet (pas un tableau), convertir
              if (!Array.isArray(firstItem) && typeof firstItem === 'object') {
                nodeConnections[connectionType] = [connections];
                console.log(`✅ [AIService] Structure de connexion corrigée pour ${fromNode}.${connectionType}`);
              }
            }
          });
        });
        
        // Corriger les connexions IA inversées (si elles partent de l'AI Agent au lieu des nœuds sources)
        if (workflow.connections[aiAgentName]) {
          const aiAgentConnections = workflow.connections[aiAgentName];
          
          // Si les connexions IA sont dans l'AI Agent, les déplacer vers les nœuds sources
          if (aiAgentConnections.ai_languageModel && openRouterNode) {
            if (!workflow.connections[openRouterNode.name]) {
              workflow.connections[openRouterNode.name] = {};
            }
            workflow.connections[openRouterNode.name].ai_languageModel = aiAgentConnections.ai_languageModel;
            delete aiAgentConnections.ai_languageModel;
            console.log(`✅ [AIService] Connexion ai_languageModel déplacée de ${aiAgentName} vers ${openRouterNode.name}`);
          }
          
          if (aiAgentConnections.ai_tool && calculatorNode) {
            if (!workflow.connections[calculatorNode.name]) {
              workflow.connections[calculatorNode.name] = {};
            }
            workflow.connections[calculatorNode.name].ai_tool = aiAgentConnections.ai_tool;
            delete aiAgentConnections.ai_tool;
            console.log(`✅ [AIService] Connexion ai_tool déplacée de ${aiAgentName} vers ${calculatorNode.name}`);
          }
          
          if (aiAgentConnections.ai_memory && memoryNode) {
            if (!workflow.connections[memoryNode.name]) {
              workflow.connections[memoryNode.name] = {};
            }
            workflow.connections[memoryNode.name].ai_memory = aiAgentConnections.ai_memory;
            delete aiAgentConnections.ai_memory;
            console.log(`✅ [AIService] Connexion ai_memory déplacée de ${aiAgentName} vers ${memoryNode.name}`);
          }
        }
        
        // Créer les connexions IA manquantes si les nœuds existent mais n'ont pas de connexions
        if (openRouterNode && aiAgentNode && !workflow.connections[openRouterNode.name]?.ai_languageModel) {
          if (!workflow.connections[openRouterNode.name]) {
            workflow.connections[openRouterNode.name] = {};
          }
          workflow.connections[openRouterNode.name].ai_languageModel = [[{node: aiAgentName, type: 'ai_languageModel', index: 0}]];
          console.log(`✅ [AIService] Connexion ai_languageModel créée pour ${openRouterNode.name}`);
        }
        
        if (calculatorNode && aiAgentNode && !workflow.connections[calculatorNode.name]?.ai_tool) {
          if (!workflow.connections[calculatorNode.name]) {
            workflow.connections[calculatorNode.name] = {};
          }
          workflow.connections[calculatorNode.name].ai_tool = [[{node: aiAgentName, type: 'ai_tool', index: 0}]];
          console.log(`✅ [AIService] Connexion ai_tool créée pour ${calculatorNode.name}`);
        }
        
        if (memoryNode && aiAgentNode && !workflow.connections[memoryNode.name]?.ai_memory) {
          if (!workflow.connections[memoryNode.name]) {
            workflow.connections[memoryNode.name] = {};
          }
          workflow.connections[memoryNode.name].ai_memory = [[{node: aiAgentName, type: 'ai_memory', index: 0}]];
          console.log(`✅ [AIService] Connexion ai_memory créée pour ${memoryNode.name}`);
        }
      }
      
      // 5. Valider que tous les nœuds requis sont présents
      const requiredNodes = ['webhook', 'schedule', 'emailReadImap', 'aggregate', 'agent', 'lmChatOpenRouter', 'toolCalculator', 'memoryBufferWindow'];
      const nodeTypes = workflow.nodes?.map(n => n.type) || [];
      const missingNodes = requiredNodes.filter(req => !nodeTypes.some(nt => nt.includes(req)));
      
      if (missingNodes.length > 0 && nodeTypes.length < 5) {
        console.log('⚠️ [AIService] Nœuds manquants détectés:', missingNodes);
        console.log('⚠️ [AIService] Nœuds présents:', nodeTypes);
      }
      
      console.log('✅ [AIService] Workflow post-processé:', {
        name: workflow.name,
        nodesCount: workflow.nodes?.length || 0,
        hasConnections: !!workflow.connections
      });
      
      return workflow;
      
    } catch (error) {
      console.error('❌ [AIService] Erreur lors de la génération:', error);
      throw error;
    }
  }
}

module.exports = AIService;
