// Service pour intégrer LocalAI avec l'AI Generator
// LocalAI utilise une API compatible OpenAI, différente d'Ollama
const fetch = require('node-fetch');

class OllamaService {
  constructor() {
    // Configuration LocalAI (pas Ollama)
    // Support Docker : si backend et LocalAI dans Docker, utiliser nom conteneur (localai:8080)
    // Support dev local : utiliser IP VPS + port mappé (147.93.58.155:19080)
    // Port mappé Docker: 19080 (hôte) -> 8080 (conteneur)
    // Par défaut en dev: utiliser l'IP VPS avec le port mappé
    this.baseUrl = process.env.OLLAMA_URL || process.env.VITE_OLLAMA_URL || 'http://147.93.58.155:19080';
    console.log(`🔧 [LocalAI] URL configurée: ${this.baseUrl}`);
    // Modèles disponibles sur LocalAI (sera mis à jour dynamiquement)
    this.availableModels = [
      'qwen2.5-72b-instruct',  // Modèle Qwen 3 recommandé par défaut
      'qwen2.5-72b',  // Variante du nom
      'qwen-2.5-72b-instruct',  // Variante avec tiret
      'mistral-7b-instruct-v0.3',
      'gemma-3-27b-it',
      'openai_gpt-oss-20b-neo',
      'planetoid_27b_v.2',
      'llama3.1:8b',
      'mistral:7b',
      'phi3:mini'
    ];
    this.defaultModel = 'mistral-7b-instruct-v0.3'; // Modèle plus léger par défaut (plus rapide)
  }

  // Vérifier si LocalAI est disponible
  async isAvailable() {
    try {
      // LocalAI utilise /v1/models (format OpenAI)
      const response = await fetch(`${this.baseUrl}/v1/models`);
      return response.ok;
    } catch (error) {
      console.error('❌ [LocalAI] Service non disponible:', error.message);
      return false;
    }
  }

  // Lister les modèles disponibles
  async getAvailableModels() {
    try {
      console.log(`📋 [LocalAI] Récupération des modèles depuis ${this.baseUrl}/v1/models`);
      // LocalAI utilise /v1/models (format OpenAI)
      const response = await fetch(`${this.baseUrl}/v1/models`);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`❌ [LocalAI] Erreur HTTP ${response.status}:`, errorText);
        throw new Error(`LocalAI API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      // Format OpenAI: { data: [{ id: "...", ... }] }
      const models = data.data || [];
      console.log(`✅ [LocalAI] ${models.length} modèles trouvés:`, models.map(m => m.id || m.name).join(', '));
      return models;
    } catch (error) {
      console.error('❌ [LocalAI] Erreur lors de la récupération des modèles:', error.message);
      console.error('❌ [LocalAI] Stack:', error.stack);
      throw error; // Propager l'erreur pour que la route puisse la gérer
    }
  }

  // Générer du contenu avec LocalAI (API compatible OpenAI)
  async generateContent(prompt, model = 'llama3.1:8b', options = {}) {
    try {
      console.log(`🤖 [LocalAI] Génération avec ${model}:`, prompt.substring(0, 100) + '...');
      console.log(`🤖 [LocalAI] URL complète: ${this.baseUrl}/v1/chat/completions`);
      
      // LocalAI utilise le format OpenAI avec messages (system + user)
      const messages = [];
      if (options.systemMessage) {
        messages.push({ role: 'system', content: options.systemMessage });
      }
      if (options.userMessage) {
        messages.push({ role: 'user', content: options.userMessage });
      } else {
        messages.push({ role: 'user', content: prompt });
      }
      
      // Vérifier d'abord si le modèle est disponible en le testant
      try {
        console.log(`🔍 [LocalAI] Vérification du modèle ${model}...`);
        const modelsCheck = await this.getAvailableModels();
        const modelExists = modelsCheck.some(m => {
          const modelId = (m.id || m.name || '').toLowerCase();
          const requestedModel = model.toLowerCase();
          return modelId === requestedModel || modelId.includes(requestedModel) || requestedModel.includes(modelId.split(':')[0]);
        });
        
        if (!modelExists && modelsCheck.length > 0) {
          console.warn(`⚠️ [LocalAI] Modèle ${model} non trouvé dans la liste, modèles disponibles:`, modelsCheck.map(m => m.id || m.name));
          // Essayer avec l'ID exact tel qu'il apparaît dans la liste
          const exactMatch = modelsCheck.find(m => {
            const modelId = (m.id || m.name || '').toLowerCase();
            return modelId.includes(model.toLowerCase().split('-')[0]) || model.toLowerCase().includes(modelId.split('-')[0]);
          });
          if (exactMatch) {
            const exactModelId = exactMatch.id || exactMatch.name;
            console.log(`🔄 [LocalAI] Utilisation de l'ID exact du modèle: ${exactModelId}`);
            model = exactModelId;
          }
        }
      } catch (checkError) {
        console.warn(`⚠️ [LocalAI] Impossible de vérifier les modèles: ${checkError.message}`);
      }
      
      const requestBody = {
        model: model,
        messages: messages,
        stream: false,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000
      };
      
      console.log(`🤖 [LocalAI] Corps de la requête:`, JSON.stringify(requestBody, null, 2));
      console.log(`📝 [LocalAI] Nom du modèle utilisé: "${model}"`);
      console.log(`📏 [LocalAI] Taille du prompt: ${JSON.stringify(requestBody).length} caractères`);
      console.log(`📏 [LocalAI] Nombre de messages: ${requestBody.messages.length}`);
      console.log(`📏 [LocalAI] Taille totale des messages: ${requestBody.messages.reduce((sum, m) => sum + m.content.length, 0)} caractères`);
      
      // Vérifier d'abord si LocalAI répond rapidement
      console.log(`🔍 [LocalAI] Vérification de la disponibilité de LocalAI à ${this.baseUrl}...`);
      const healthCheckStart = Date.now();
      try {
        // Essayer plusieurs endpoints possibles
        const healthEndpoints = ['/health', '/ready', '/v1/models'];
        let healthCheckOk = false;
        
        for (const endpoint of healthEndpoints) {
          try {
            const healthResponse = await fetch(`${this.baseUrl}${endpoint}`, {
              method: 'GET',
              signal: AbortSignal.timeout(5000) // 5 secondes max pour le health check
            });
            if (healthResponse.ok || healthResponse.status === 200) {
              const healthCheckTime = Date.now() - healthCheckStart;
              console.log(`✅ [LocalAI] Health check OK via ${endpoint} en ${healthCheckTime}ms`);
              healthCheckOk = true;
              break;
            }
          } catch (e) {
            // Essayer le prochain endpoint
            continue;
          }
        }
        
        if (!healthCheckOk) {
          console.warn(`⚠️ [LocalAI] Aucun endpoint de health check disponible, mais on continue quand même`);
        }
      } catch (healthError) {
        console.warn(`⚠️ [LocalAI] Health check échoué: ${healthError.message}`);
        console.warn(`⚠️ [LocalAI] Le serveur LocalAI à ${this.baseUrl} ne répond peut-être pas. Vérifiez qu'il est démarré et accessible.`);
        // Continuer quand même, certains serveurs n'ont pas de health check
      }
      
      // Timeout de 5 minutes (300 secondes) - les modèles locaux peuvent être lents mais génèrent bien
      const timeoutMs = 300000; // 5 minutes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const requestStartTime = Date.now();
      console.log(`🚀 [LocalAI] Envoi de la requête à ${this.baseUrl}/v1/chat/completions...`);
      
      try {
        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        const requestTime = Date.now() - requestStartTime;
        console.log(`⏱️ [LocalAI] Réponse reçue en ${requestTime}ms`);
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          console.error(`❌ [LocalAI] Erreur HTTP ${response.status}:`, errorText);
          throw new Error(`LocalAI API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        console.log('✅ [LocalAI] Génération terminée');
        
        // Format OpenAI: { choices: [{ message: { content: "..." } }] }
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          console.error('❌ [LocalAI] Réponse invalide - format OpenAI attendu:', JSON.stringify(data, null, 2));
          throw new Error('LocalAI a retourné une réponse invalide (format OpenAI attendu)');
        }
        
        return {
          content: data.choices[0].message.content,
          model: data.model || model,
          usage: data.usage || {}
        };
      } catch (error) {
        clearTimeout(timeoutId);
        const requestTime = Date.now() - requestStartTime;
        if (error.name === 'AbortError') {
          console.error(`⏱️ [LocalAI] Timeout après ${timeoutMs/1000} secondes (${requestTime}ms écoulés) avec le modèle ${model}`);
          console.error(`🔍 [LocalAI] Diagnostic: Le serveur LocalAI à ${this.baseUrl} ne répond pas dans les temps.`);
          console.error(`💡 [LocalAI] Suggestions:`);
          console.error(`   1. Vérifier que LocalAI est bien démarré et accessible`);
          console.error(`   2. Vérifier que le modèle ${model} est chargé en mémoire`);
          console.error(`   3. Vérifier les ressources serveur (CPU/RAM)`);
          console.error(`   4. Essayer un modèle plus léger (mistral-7b-instruct-v0.3, gemma-3-27b-it)`);
          console.error(`   5. Utiliser OpenRouter au lieu de LocalAI pour une génération plus rapide`);
          throw new Error(`La génération a pris trop de temps (plus de ${timeoutMs/1000} secondes). Le serveur LocalAI à ${this.baseUrl} ne répond pas dans les temps. Vérifiez que LocalAI est démarré et accessible, et que le modèle ${model} est chargé. Essayez avec un modèle plus léger ou utilisez OpenRouter pour une génération plus rapide.`);
        }
        throw error;
      }
    } catch (error) {
      console.error('❌ [LocalAI] Erreur lors de la génération:', error.message);
      console.error('❌ [LocalAI] Stack:', error.stack);
      console.error('❌ [LocalAI] URL LocalAI:', this.baseUrl);
      throw error;
    }
  }

  // Générer un workflow n8n avec LocalAI
  async generateWorkflow(description, model = null, context = {}) {
    try {
      // Utiliser le modèle par défaut si aucun modèle n'est spécifié
      if (!model) {
        model = this.defaultModel;
      }
      
      console.log(`🔧 [LocalAI] Début génération workflow avec ${model}`);
      console.log(`🔧 [LocalAI] URL LocalAI: ${this.baseUrl}`);
      
      // Vérifier d'abord les modèles disponibles
      let availableModelIds = [];
      try {
        const availableModels = await this.getAvailableModels();
        console.log(`📋 [LocalAI] Modèles disponibles: ${availableModels.length}`);
        if (availableModels.length > 0) {
          availableModelIds = availableModels.map(m => m.id || m.name).filter(Boolean);
          console.log(`📋 [LocalAI] Modèles: ${availableModelIds.join(', ')}`);
          
          // Vérifier si le modèle demandé existe et utiliser l'ID exact de LocalAI
          const exactModel = availableModelIds.find(m => {
            const modelId = m.toLowerCase();
            const requestedModel = model.toLowerCase();
            // Correspondance exacte ou partielle
            return modelId === requestedModel || 
                   modelId.includes(requestedModel) || 
                   requestedModel.includes(modelId.split('-')[0]) ||
                   modelId.includes(requestedModel.split('-')[0]);
          });
          
          if (exactModel) {
            // Utiliser l'ID exact tel qu'il apparaît dans LocalAI
            console.log(`✅ [LocalAI] Modèle trouvé: ${exactModel} (demandé: ${model})`);
            model = exactModel; // Utiliser l'ID exact
          } else {
            // Utiliser un modèle disponible (priorité aux modèles instruct)
            const fallbackModel = availableModelIds.find(m => 
              m.includes('instruct') || m.includes('mistral') || m.includes('gemma')
            ) || availableModelIds[0];
            
            if (fallbackModel) {
              console.log(`⚠️ [LocalAI] Modèle ${model} non trouvé, utilisation de ${fallbackModel}`);
              model = fallbackModel;
            } else {
              throw new Error(`Aucun modèle disponible sur LocalAI`);
            }
          }
        } else {
          throw new Error(`Aucun modèle disponible sur LocalAI`);
        }
      } catch (modelError) {
        console.warn(`⚠️ [LocalAI] Impossible de récupérer les modèles disponibles: ${modelError.message}`);
        // Continuer avec le modèle demandé ou utiliser le défaut
        if (!model || model === this.defaultModel) {
          model = this.defaultModel;
        }
        // Si on n'a pas de liste de modèles, créer une liste avec les modèles connus
        if (availableModelIds.length === 0) {
          availableModelIds = ['mistral-7b-instruct-v0.3', 'gemma-3-27b-it', 'openai_gpt-oss-20b-neo', 'planetoid_27b_v.2'];
        }
      }
      
      // Construire la liste des nœuds populaires depuis le contexte
      const popularNodesList = context.popularNodes ? Object.keys(context.popularNodes).slice(0, 10).join(', ') : '';
      const templateExamples = context.templates ? context.templates.slice(0, 2).map(t => t.name).join(', ') : '';
      
      const systemPrompt = `Tu es un expert en génération de workflows n8n FONCTIONNELS. 
Génère un workflow JSON VALIDE et FONCTIONNEL basé sur cette description: "${description}"

CONTRÔLES QUALITÉ CRITIQUES:
1. Utilise UNIQUEMENT des types de nœuds n8n VALIDES et TESTÉS
2. Chaque nœud DOIT avoir des paramètres réalistes et fonctionnels
3. Les connexions DOIVENT être logiques et complètes
4. Les credentials DOIVENT utiliser les placeholders dynamiques
5. Le JSON DOIT être valide et parsable

NOEUDS N8N VALIDES UNIQUEMENT - Utilise SEULEMENT ces types:

TRIGGERS (un seul par workflow):
- "n8n-nodes-base.webhook" (pour déclencheurs HTTP)
- "n8n-nodes-base.schedule" (pour déclencheurs programmés)
- "n8n-nodes-base.manualTrigger" (pour déclencheurs manuels)

EMAIL:
- "n8n-nodes-base.emailReadImap" (lecture IMAP)
- "n8n-nodes-base.emailSend" (envoi SMTP)
- "n8n-nodes-imap.imap" (opérations IMAP)

COMMUNICATION:
- "n8n-nodes-base.slack" (Slack)
- "n8n-nodes-base.discord" (Discord)
- "n8n-nodes-base.telegram" (Telegram)

APIS & DONNÉES:
- "n8n-nodes-base.httpRequest" (requêtes HTTP)
- "n8n-nodes-base.postgres" (PostgreSQL)
- "n8n-nodes-base.mysql" (MySQL)

TRAITEMENT:
- "n8n-nodes-base.aggregate" (agrégation)
- "n8n-nodes-base.set" (modification données)
- "n8n-nodes-base.code" (code JavaScript)
- "n8n-nodes-base.markdown" (conversion Markdown)
- "n8n-nodes-base.function" (fonctions)

IA & LANGCHAIN:
- "@n8n/n8n-nodes-langchain.agent" (Agent IA)
- "@n8n/n8n-nodes-langchain.lmChatOpenRouter" (Modèle OpenRouter)
- "@n8n/n8n-nodes-langchain.toolCalculator" (Outil Calcul)
- "@n8n/n8n-nodes-langchain.memoryBufferWindow" (Mémoire)

CREDENTIALS - Utilise ces placeholders:
- OpenRouter: {"id": "ADMIN_OPENROUTER_CREDENTIAL_ID", "name": "ADMIN_OPENROUTER_CREDENTIAL_NAME"}
- IMAP: {"id": "USER_IMAP_CREDENTIAL_ID", "name": "USER_IMAP_CREDENTIAL_NAME"}
- SMTP: {"id": "USER_SMTP_CREDENTIAL_ID", "name": "USER_SMTP_CREDENTIAL_NAME"}
- Slack: {"id": "USER_SLACK_CREDENTIAL_ID", "name": "USER_SLACK_CREDENTIAL_NAME"}
- Discord: {"id": "USER_DISCORD_CREDENTIAL_ID", "name": "USER_DISCORD_CREDENTIAL_NAME"}

STRUCTURE OBLIGATOIRE d'un workflow n8n:
{
  "name": "Nom du Workflow",
  "nodes": [
    {
      "id": "node-id-unique",
      "name": "Nom du nœud",
      "type": "type-de-noeud-valide",
      "typeVersion": 1,
      "position": [x, y],
      "parameters": {
        // Paramètres spécifiques au type de nœud
      },
      "credentials": {
        // Seulement si le nœud nécessite des credentials
      },
      "webhookId": "id-webhook" // Seulement pour les webhooks
    }
  ],
  "connections": {
    "Node Name Source": {
      "main": [
        [
          {
            "node": "Node Name Destination",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {},
  "pinData": {},
  "versionId": "1"
}

EXEMPLE RÉSUMÉ - Workflow Email avec Agent IA:
- Webhook Trigger → IMAP Email (n8n-nodes-base.emailReadImap) → Aggregate Emails (destinationFieldName: "data") → AI Agent (prompt: "{{ $json.data.toJsonString() }}") → Send Email (toEmail: "{{USER_EMAIL}}")
- OpenRouter Chat Model (model: "qwen/qwen2.5-72b-instruct", credentials: ADMIN_OPENROUTER_CREDENTIAL_ID) connecté via ai_languageModel à AI Agent
- Calculator Tool et Buffer Window Memory connectés via ai_tool et ai_memory à AI Agent

RÈGLES CRITIQUES - À RESPECTER ABSOLUMENT:
1. Chaque nœud DOIT avoir un "id" unique (format recommandé: nom-sans-espaces) ET un "name" descriptif
2. Les positions DOIVENT être espacées horizontalement (ex: [250, 300], [500, 300], [750, 300])
3. ⚠️ CRITIQUE - Les connexions DOIVENT référencer les NOMS EXACTS des nœuds (pas les IDs) :
   - Dans "connections", utilise le "name" du nœud source comme clé
   - Dans chaque connexion, le champ "node" doit contenir le "name" exact du nœud de destination
   - Exemple: Si un nœud a "name": "IMAP Email", utilise "IMAP Email" dans les connexions, pas "imap-email"
4. Les paramètres DOIVENT correspondre au type de nœud et être réalistes
5. Les credentials DOIVENT utiliser les placeholders (USER_XXX_CREDENTIAL_ID)
6. Pour les agents IA, connecte le modèle via "ai_languageModel" dans connections (exemple ci-dessous)
7. Les expressions n8n dans les paramètres utilisent les IDs: {{ $('node-id').item.json.field }} (les IDs sont corrects ici)
8. Les connexions principales utilisent "main" UNIQUEMENT (jamais "next" qui n'existe pas dans n8n)
9. Les connexions IA utilisent "ai_languageModel", "ai_tool", "ai_memory"
10. ⚠️ CRITIQUE - Pour les workflows EMAIL avec IMAP :
    - TOUJOURS utiliser n8n-nodes-base.emailReadImap (PAS n8n-nodes-imap.imap)
    - TOUJOURS ajouter un nœud Aggregate entre IMAP et AI Agent
    - Le nœud Aggregate DOIT avoir "destinationFieldName": "data"
    - Le prompt AI Agent DOIT utiliser {{ $json.data.toJsonString() }} (PAS {{ $json.toJsonString() }})
    - Le champ toEmail SMTP DOIT utiliser {{USER_EMAIL}} ou une adresse hardcodée (JAMAIS {{ $('imap-email').item.json.to }})
11. ⚠️ CRITIQUE - Structure workflow obligatoire :
    - TOUJOURS inclure "settings": {} (même si vide) - l'API n8n l'exige
    - TOUJOURS définir "active": false (l'activation se fait après déploiement via API)
    - TOUJOURS inclure "versionId": "1"

⚠️ RÈGLE OBLIGATOIRE - CONNEXIONS POUR AGENTS IA:
Si tu crées un Agent IA, tu DOIS créer ces 4 nœuds ET les connecter TOUS à l'agent:

1. "OpenRouter Chat Model" → connecte via "ai_languageModel" à "AI Agent"
2. "Calculator Tool" → connecte via "ai_tool" à "AI Agent"  
3. "Buffer Window Memory" (ou "Simple Memory") → connecte via "ai_memory" à "AI Agent"

Format exact des connexions:
{
  "AI Agent": {
    "main": [[{"node": "Node Suivant", "type": "main", "index": 0}]]
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

⚠️ IMPORTANT: Les credentials OpenRouter sont ADMIN et sont déjà disponibles - utilise directement ADMIN_OPENROUTER_CREDENTIAL_ID!

Contexte: ${context.templates?.length || 0} templates, nœuds: ${popularNodesList.split(', ').slice(0, 5).join(', ')}

⚠️⚠️⚠️ INSTRUCTION CRITIQUE - FORMAT DE RÉPONSE ⚠️⚠️⚠️
Tu DOIS répondre UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après.
NE PAS inclure de markdown, de commentaires, d'explications, ou de texte.
COMMENCE directement par { et TERMINE par }.
Exemple de format correct:
{
  "name": "Workflow Name",
  "nodes": [...],
  "connections": {...},
  "settings": {},
  "active": false,
  "versionId": "1"
}

❌ FORMAT INCORRECT (NE PAS FAIRE CELA):
"Voici le workflow:"
[bloc markdown json]
{...}
[fin bloc]
"Ce workflow fait..."

✅ FORMAT CORRECT:
{
  "name": "Workflow Name",
  "nodes": [...],
  "connections": {...},
  "settings": {},
  "active": false,
  "versionId": "1"
}

Génère un workflow COMPLET, FONCTIONNEL et VALIDE. Réponds UNIQUEMENT avec le JSON brut, sans texte avant ou après.`;

      console.log(`🔧 [LocalAI] Appel generateContent avec modèle: ${model}...`);
      console.log(`📋 [LocalAI] Modèles disponibles pour retry: ${availableModelIds.join(', ')}`);
      
      // Essayer de générer avec le modèle sélectionné, si échec essayer d'autres modèles
      let result;
      let attempts = 0;
      const maxAttempts = Math.max(availableModelIds.length, 3);
      
      while (attempts < maxAttempts) {
        try {
          // Créer un prompt utilisateur détaillé avec instructions spécifiques
          let userMessage = `Génère un workflow n8n COMPLET et FONCTIONNEL pour: "${description}"\n\n`;
          
          // ⚠️ RÈGLE CRITIQUE - Toujours rappeler l'utilisation des noms dans les connexions
          userMessage += `⚠️ RÈGLE CRITIQUE POUR LES CONNEXIONS:
- Dans la section "connections", utilise TOUJOURS les "name" des nœuds (pas les "id")
- Exemple: Si un nœud a "name": "IMAP Email", utilise "IMAP Email" dans les connexions
- N'utilise JAMAIS "next" dans les connexions - seulement "main", "ai_languageModel", "ai_tool", "ai_memory"

`;
          
          // Ajouter des instructions spécifiques selon la description
          const descLower = description.toLowerCase();
          if (descLower.includes('email') || descLower.includes('imap') || descLower.includes('smtp')) {
            userMessage += `⚠️ RÈGLE CRITIQUE POUR WORKFLOWS EMAIL:

1. IMAP: TOUJOURS utiliser "n8n-nodes-base.emailReadImap" (PAS "n8n-nodes-imap.imap")
   - Paramètres: { "mailbox": "INBOX", "options": {} }
   - IMAP retourne MULTIPLE items (un par email)

2. AGGREGATE: TOUJOURS ajouter un nœud Aggregate ENTRE IMAP et AI Agent
   - Type: "n8n-nodes-base.aggregate"
   - Paramètres: { "aggregate": "aggregateAllItemData", "destinationFieldName": "data" }
   - Ce nœud groupe tous les emails dans un champ "data"

3. AI AGENT: Le prompt DOIT utiliser {{ $json.data.toJsonString() }}
   - PAS {{ $json.toJsonString() }} car Aggregate crée le champ "data"
   - Exemple: "Analyse ces emails : {{ $json.data.toJsonString() }}"

4. SMTP toEmail: TOUJOURS utiliser {{USER_EMAIL}} ou une adresse hardcodée
   - JAMAIS {{ $('imap-email').item.json.to }} qui peut être vide!

Chaîne obligatoire: IMAP Email -> Aggregate Emails -> AI Agent -> Send Email

`;
          }
          
          if (descLower.includes('agent') || descLower.includes('ia') || descLower.includes('ai')) {
            userMessage += `⚠️ RÈGLE OBLIGATOIRE - Si tu crées un Agent IA, tu DOIS automatiquement ajouter:

1. ✅ Nœud "@n8n/n8n-nodes-langchain.agent" (nom: "AI Agent")
   - Paramètres: { "promptType": "define", "text": "..." }

2. ✅ Nœud "@n8n/n8n-nodes-langchain.lmChatOpenRouter" (nom: "OpenRouter Chat Model")
   - OBLIGATOIRE: Utilise les credentials ADMIN directement:
     "credentials": {
       "openRouterApi": {
         "id": "ADMIN_OPENROUTER_CREDENTIAL_ID",
         "name": "ADMIN_OPENROUTER_CREDENTIAL_NAME"
       }
     }
   - ⚠️ CRITIQUE: Toujours utiliser le modèle le PLUS PERFORMANT mais le MOINS CHER - NE JAMAIS utiliser "anthropic/claude" (trop cher!)
     - Modèle recommandé: "qwen/qwen2.5-72b-instruct" (meilleur ratio performance/prix, fiable et disponible via OpenRouter)
     - Alternative si qwen2.5-72b indisponible: "openai/gpt-4o-mini" (économique et fiable)
     - NE JAMAIS utiliser: "anthropic/claude-3.5-sonnet" ou tout modèle anthropic (trop cher!)
     - NE JAMAIS utiliser: "meta-llama/llama-3.1-70b-instruct" (peut ne pas être disponible dans tous les comptes OpenRouter)
   - Paramètres: { "model": "qwen/qwen2.5-72b-instruct" }
   - Connecte à l'agent via "ai_languageModel" (utilise les NOMS!)

3. ✅ Nœud "@n8n/n8n-nodes-langchain.toolCalculator" (nom: "Calculator Tool")
   - Paramètres: {} (vide est OK)
   - Connecte à l'agent via "ai_tool" (utilise les NOMS!)

4. ✅ Nœud "@n8n/n8n-nodes-langchain.memoryBufferWindow" (nom: "Buffer Window Memory" ou "Simple Memory")
   - Paramètres: { "contextWindowLength": 10 } ou { "k": 5 }
   - Connecte à l'agent via "ai_memory" (utilise les NOMS!)

Ces 4 nœuds sont OBLIGATOIRES si tu crées un Agent IA. Ne les oublie JAMAIS!

`;
          }
          
          // Les règles pour email sont déjà dans la section ci-dessus - ne pas répéter
          
          userMessage += `⚠️ RAPPELS FINAUX CRITIQUES:
1. Le JSON généré DOIT être valide, les nœuds DOIVENT être compatibles n8n, et les connexions DOIVENT être complètes
2. TOUJOURS inclure "settings": {} dans le workflow (même si vide) - l'API n8n l'exige
3. TOUJOURS définir "active": false (l'activation se fait après déploiement via API)
4. TOUJOURS inclure "versionId": "1"
5. Les connexions DOIVENT utiliser les NOMS des nœuds (pas les IDs)
6. Pour les workflows EMAIL: TOUJOURS ajouter Aggregate entre IMAP et AI Agent`;
          
          // LocalAI utilise le format OpenAI avec system et user messages
          result = await this.generateContent(systemPrompt, model, {
            temperature: 0.1, // Très déterministe pour générer du code JSON fonctionnel
            max_tokens: 4000, // Réduit pour accélérer (workflows généralement < 3000 tokens)
            systemMessage: systemPrompt,
            userMessage: userMessage
          });
          // Si succès, sortir de la boucle
          break;
        } catch (error) {
          attempts++;
          console.warn(`⚠️ [LocalAI] Échec avec modèle ${model} (tentative ${attempts}/${maxAttempts}):`, error.message);
          
          // Si le modèle ne peut pas être chargé, essayer un autre modèle disponible
          if (error.message.includes('failed to load model') || error.message.includes('could not load model') || error.message.includes('mkdir') || error.message.includes('no such file')) {
            if (availableModelIds.length > 0 && attempts < maxAttempts) {
              // Essayer le modèle suivant dans la liste
              const currentIndex = availableModelIds.findIndex(m => m.toLowerCase() === model.toLowerCase());
              let nextIndex;
              
              if (currentIndex >= 0) {
                // Prendre le modèle suivant dans la liste (rotation)
                nextIndex = (currentIndex + 1) % availableModelIds.length;
              } else {
                // Si le modèle actuel n'est pas dans la liste, prendre le premier
                nextIndex = 0;
              }
              
              const nextModel = availableModelIds[nextIndex];
              
              if (nextModel && nextModel.toLowerCase() !== model.toLowerCase()) {
                console.log(`🔄 [LocalAI] Modèle ${model} ne peut pas être chargé, basculement vers: ${nextModel}`);
                model = nextModel;
                attempts--; // Ne pas compter cette tentative comme échec, on réessaye avec un nouveau modèle
                continue; // Réessayer avec le nouveau modèle
              } else {
                console.warn(`⚠️ [LocalAI] Aucun autre modèle disponible à essayer`);
              }
            }
          }
          
          // Si toutes les tentatives ont échoué ou pas de modèle de secours, lancer l'erreur
          if (attempts >= maxAttempts) {
            throw new Error(`Impossible de charger un modèle fonctionnel sur LocalAI après ${maxAttempts} tentatives. Dernière erreur: ${error.message.substring(0, 200)}`);
          }
          
          // Pour les autres types d'erreurs, relancer
          throw error;
        }
      }
      
      if (!result) {
        throw new Error('Échec de génération après toutes les tentatives');
      }

      console.log('🔍 [LocalAI] Contenu généré (premiers 500 caractères):', result.content.substring(0, 500));
      console.log('🔍 [LocalAI] Contenu généré (derniers 500 caractères):', result.content.substring(Math.max(0, result.content.length - 500)));
      console.log('🔍 [LocalAI] Longueur totale:', result.content.length);
      console.log('🔍 [LocalAI] Modèle utilisé:', result.model || model);

      // Fonction helper pour extraire et parser le JSON
      const extractAndParseJSON = (content) => {
        // Stratégie 1: Chercher du JSON dans un bloc markdown ```json ... ```
        const markdownJsonMatch = content.match(/```json\s*([\s\S]*?)```/i) || 
                                 content.match(/```\s*([\s\S]*?)```/);
        if (markdownJsonMatch) {
          try {
            const jsonStr = markdownJsonMatch[1].trim();
            const parsed = JSON.parse(jsonStr);
            console.log('✅ [LocalAI] JSON extrait depuis bloc markdown');
            return parsed;
          } catch (e) {
            console.warn('⚠️ [LocalAI] Échec parsing JSON depuis markdown:', e.message);
          }
        }

        // Stratégie 2: Chercher le premier bloc JSON valide (du premier { au dernier })
        // Utiliser une approche plus robuste avec comptage des accolades
        let braceCount = 0;
        let startIndex = -1;
        let endIndex = -1;
        
        for (let i = 0; i < content.length; i++) {
          if (content[i] === '{') {
            if (startIndex === -1) {
              startIndex = i;
            }
            braceCount++;
          } else if (content[i] === '}') {
            braceCount--;
            if (braceCount === 0 && startIndex !== -1) {
              endIndex = i;
              break;
            }
          }
        }
        
        if (startIndex !== -1 && endIndex !== -1 && braceCount === 0) {
          try {
            const jsonStr = content.substring(startIndex, endIndex + 1);
            const parsed = JSON.parse(jsonStr);
            console.log('✅ [LocalAI] JSON extrait avec comptage d\'accolades');
            return parsed;
          } catch (e) {
            console.warn('⚠️ [LocalAI] Échec parsing JSON avec comptage:', e.message);
          }
        }

        // Stratégie 3: Regex simple (dernière chance)
        const simpleJsonMatch = content.match(/\{[\s\S]*\}/);
        if (simpleJsonMatch) {
          try {
            // Essayer de trouver le JSON complet en cherchant le dernier }
            let jsonStr = simpleJsonMatch[0];
            // Si le JSON est tronqué, essayer de le compléter ou de trouver une meilleure correspondance
            let lastBrace = jsonStr.lastIndexOf('}');
            if (lastBrace > 0) {
              jsonStr = jsonStr.substring(0, lastBrace + 1);
            }
            const parsed = JSON.parse(jsonStr);
            console.log('✅ [LocalAI] JSON extrait avec regex simple');
            return parsed;
          } catch (e) {
            console.warn('⚠️ [LocalAI] Échec parsing JSON avec regex:', e.message);
            // Essayer de nettoyer le JSON (enlever les caractères invalides à la fin)
            try {
              let cleaned = jsonStr;
              // Enlever les caractères invalides après le dernier }
              let lastValidBrace = cleaned.lastIndexOf('}');
              if (lastValidBrace > 0) {
                cleaned = cleaned.substring(0, lastValidBrace + 1);
                // Essayer de trouver un JSON valide en retirant progressivement des caractères
                for (let i = cleaned.length - 1; i > 0; i--) {
                  if (cleaned[i] === '}') {
                    try {
                      const testJson = cleaned.substring(0, i + 1);
                      const parsed = JSON.parse(testJson);
                      console.log('✅ [LocalAI] JSON nettoyé et parsé avec succès');
                      return parsed;
                    } catch (e2) {
                      // Continuer à chercher
                    }
                  }
                }
              }
            } catch (e3) {
              console.error('❌ [LocalAI] Impossible de nettoyer le JSON');
            }
          }
        }

        // Stratégie 4: Essayer de parser directement (au cas où c'est déjà du JSON pur)
        try {
          const parsed = JSON.parse(content.trim());
          console.log('✅ [LocalAI] Contenu parsé directement comme JSON');
          return parsed;
        } catch (e) {
          console.warn('⚠️ [LocalAI] Échec parsing direct:', e.message);
        }

        return null;
      };

      // Essayer de parser le JSON
      let workflow = extractAndParseJSON(result.content);
      
      if (!workflow) {
        // Afficher plus de détails pour le débogage
        console.error('❌ [LocalAI] Impossible d\'extraire le JSON valide');
        console.error('📝 [LocalAI] Contenu complet (premiers 3000 caractères):', result.content.substring(0, 3000));
        console.error('📝 [LocalAI] Contenu complet (derniers 1000 caractères):', result.content.substring(Math.max(0, result.content.length - 1000)));
        
        // Essayer de trouver des indices sur ce qui ne va pas
        const hasBrace = result.content.includes('{');
        const hasBracket = result.content.includes('}');
        const hasJsonBlock = result.content.includes('```json') || result.content.includes('```');
        const hasTextBefore = !result.content.trim().startsWith('{');
        const hasTextAfter = !result.content.trim().endsWith('}');
        
        console.error('🔍 [LocalAI] Analyse:');
        console.error('  - Contient {:', hasBrace);
        console.error('  - Contient }:', hasBracket);
        console.error('  - Contient bloc markdown:', hasJsonBlock);
        console.error('  - Texte avant JSON:', hasTextBefore);
        console.error('  - Texte après JSON:', hasTextAfter);
        console.error('  - Longueur totale:', result.content.length);
        
        // Essayer de trouver le JSON même s'il y a du texte autour
        if (hasBrace && hasBracket) {
          // Chercher le premier { et le dernier }
          const firstBrace = result.content.indexOf('{');
          const lastBrace = result.content.lastIndexOf('}');
          if (firstBrace >= 0 && lastBrace > firstBrace) {
            const potentialJson = result.content.substring(firstBrace, lastBrace + 1);
            try {
              const parsed = JSON.parse(potentialJson);
              console.log('✅ [LocalAI] JSON trouvé et extrait après nettoyage');
              workflow = parsed;
            } catch (e) {
              console.error('❌ [LocalAI] JSON extrait mais invalide:', e.message);
              console.error('📝 [LocalAI] JSON extrait (premiers 500 caractères):', potentialJson.substring(0, 500));
            }
          }
        }
        
        if (!workflow) {
          if (!hasBrace || !hasBracket) {
            throw new Error(`LocalAI n'a pas généré de JSON valide. La réponse ne contient pas de structure JSON.\n\nContenu reçu (premiers 500 caractères):\n${result.content.substring(0, 500)}`);
          }
          
          throw new Error(`LocalAI a généré du contenu non-JSON valide. Le modèle ${model} n'a peut-être pas généré un JSON valide.\n\nEssayez avec un autre modèle ou vérifiez que LocalAI répond correctement.\n\nContenu reçu (premiers 1000 caractères):\n${result.content.substring(0, 1000)}`);
        }
      }
      
      // Validation du workflow généré
      if (!workflow || typeof workflow !== 'object') {
        throw new Error('Le workflow généré n\'est pas un objet JSON valide.');
      }
      
      // Vérifier la structure de base
      if (!workflow.nodes || !Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
        throw new Error('Le workflow doit contenir au moins un nœud.');
      }
      
      if (!workflow.connections || typeof workflow.connections !== 'object') {
        console.warn('⚠️ [LocalAI] Pas de connexions définies, création d\'un objet vide');
        workflow.connections = {};
      }
      
      // Vérifier que chaque nœud a les champs obligatoires
      for (const node of workflow.nodes) {
        if (!node.id || !node.type || !node.name) {
          console.error('❌ [LocalAI] Nœud invalide trouvé:', JSON.stringify(node, null, 2));
          throw new Error(`Nœud invalide: chaque nœud doit avoir id, type et name.`);
        }
        
        // Vérifier que le type de nœud est valide
        const validNodeTypes = [
          'n8n-nodes-base.webhook',
          'n8n-nodes-base.schedule',
          'n8n-nodes-base.manualTrigger',
          'n8n-nodes-base.emailReadImap',
          'n8n-nodes-base.emailSend',
          'n8n-nodes-imap.imap',
          'n8n-nodes-base.slack',
          'n8n-nodes-base.discord',
          'n8n-nodes-base.telegram',
          'n8n-nodes-base.httpRequest',
          'n8n-nodes-base.postgres',
          'n8n-nodes-base.mysql',
          'n8n-nodes-base.aggregate',
          'n8n-nodes-base.set',
          'n8n-nodes-base.code',
          'n8n-nodes-base.markdown',
          'n8n-nodes-base.function',
          '@n8n/n8n-nodes-langchain.agent',
          '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
          '@n8n/n8n-nodes-langchain.toolCalculator',
          '@n8n/n8n-nodes-langchain.memoryBufferWindow'
        ];
        
        // Vérification plus souple (commence par un type valide)
        const isValidType = validNodeTypes.some(validType => node.type === validType || node.type.startsWith(validType.split('.')[0]));
        
        if (!isValidType && !node.type.includes('langchain') && !node.type.includes('n8n-nodes')) {
          console.warn(`⚠️ [LocalAI] Type de nœud potentiellement invalide: ${node.type}`);
        }
        
        // S'assurer que chaque nœud a une position
        if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
          // Générer une position automatique
          const index = workflow.nodes.indexOf(node);
          node.position = [250 + (index * 250), 300];
          console.log(`📍 [LocalAI] Position générée pour ${node.name}: [${node.position[0]}, ${node.position[1]}]`);
        }
        
        // S'assurer que chaque nœud a typeVersion
        if (!node.typeVersion) {
          node.typeVersion = 1;
        }
        
        // S'assurer que chaque nœud a parameters
        if (!node.parameters) {
          node.parameters = {};
        }
      }
      
      // S'assurer que le workflow a un nom
      if (!workflow.name) {
        workflow.name = `AI Generated Workflow - ${new Date().toISOString().split('T')[0]}`;
      }
      
      // S'assurer que settings existe
      if (!workflow.settings) {
        workflow.settings = {};
      }
      
      // S'assurer que versionId existe
      if (!workflow.versionId) {
        workflow.versionId = "1";
      }
      
      console.log(`✅ [LocalAI] Workflow validé: ${workflow.nodes.length} nœuds, ${Object.keys(workflow.connections).length} connexions`);

      return {
        workflow: workflow,
        metadata: {
          model: result.model,
          tokens: result.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error('❌ [LocalAI] Erreur lors de la génération du workflow:', error.message);
      console.error('❌ [LocalAI] Stack:', error.stack);
      console.error('❌ [LocalAI] Modèle utilisé:', model);
      console.error('❌ [LocalAI] URL LocalAI:', this.baseUrl);
      throw error;
    }
  }

  // Tester la connexion
  async testConnection() {
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return { success: false, error: 'LocalAI service non disponible' };
      }

      const models = await this.getAvailableModels();
      return { 
        success: true, 
        models: models.map(m => m.id || m.name),
        message: `LocalAI disponible avec ${models.length} modèles`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new OllamaService();
