import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, CheckCircle, AlertCircle, Brain, Target, FileText, Settings, Zap } from 'lucide-react';
import { enhancedAIService, IntelligentWorkflowRequest, OptimizedWorkflowRequest, ApplicationContext } from '../services/enhancedAIService';
import { ollamaService, OllamaWorkflowRequest } from '../services/ollamaService';
import { templateService } from '../services';
import { useAuth } from '../contexts/AuthContext';

export function AIWorkflowGenerator() {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [aiProvider, setAiProvider] = useState('openrouter');
  // Modèle par défaut : openai/gpt-4o-mini (bon rapport performance/prix, très peu cher ~$0.15/1M tokens)
  const [aiModel, setAiModel] = useState('openai/gpt-4o-mini');
  const [generationMode, setGenerationMode] = useState<'intelligent' | 'optimized' | 'template'>('intelligent');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState<ApplicationContext | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [localAIModels, setLocalAIModels] = useState<Array<{id: string, name: string}>>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Charger le contexte de l'application au démarrage
  useEffect(() => {
    loadApplicationContext();
  }, []);

  // Charger les modèles LocalAI quand le provider change ou au montage
  useEffect(() => {
    if (aiProvider === 'ollama') {
      loadLocalAIModels();
    }
  }, [aiProvider]);

  // Mettre à jour le modèle par défaut quand le provider change
  useEffect(() => {
    if (aiProvider === 'ollama') {
      // Vérifier si le modèle actuel est dans la liste chargée
      if (localAIModels.length > 0) {
        const currentModelExists = localAIModels.some(m => (m.id || m.name) === aiModel);
        if (!currentModelExists) {
          // Utiliser le premier modèle disponible
          const firstModel = localAIModels[0].id || localAIModels[0].name;
          setAiModel(firstModel);
        }
      } else {
        // Si les modèles ne sont pas encore chargés, utiliser une valeur par défaut temporaire
        setAiModel('mistral-7b-instruct-v0.3');
      }
    } else if (aiProvider === 'openrouter') {
      // Vérifier si le modèle actuel est un modèle OpenRouter valide (format: provider/model)
      const openRouterPatterns = ['anthropic/', 'openai/', 'google/', 'meta-llama/'];
      const isOpenRouterModel = openRouterPatterns.some(pattern => aiModel.startsWith(pattern));
      
      // Si ce n'est pas un modèle OpenRouter, utiliser le modèle par défaut
      if (!isOpenRouterModel) {
        setAiModel('openai/gpt-4o-mini');
      }
    }
  }, [aiProvider, localAIModels]);

  // Analyser la description quand elle change
  useEffect(() => {
    if (description.trim()) {
      analyzeDescription();
    }
  }, [description]);

  const loadApplicationContext = async () => {
    try {
      const appContext = await enhancedAIService.getApplicationContext();
      setContext(appContext);
      console.log('🧠 [EnhancedAI] Contexte chargé:', appContext);
    } catch (error) {
      console.error('❌ [EnhancedAI] Erreur lors du chargement du contexte:', error);
    }
  };

  const loadLocalAIModels = async () => {
    setLoadingModels(true);
    try {
      const models = await ollamaService.getAvailableModels();
      console.log('📋 [LocalAI] Modèles chargés:', models);
      setLocalAIModels(models);
      
      // Si aucun modèle n'est sélectionné ou le modèle actuel n'est pas dans la liste, utiliser le premier
      if (models.length > 0) {
        const currentModelExists = models.some(m => (m.id || m.name) === aiModel);
        if (!currentModelExists) {
          const firstModel = models[0].id || models[0].name;
          console.log(`🔄 [LocalAI] Sélection du premier modèle disponible: ${firstModel}`);
          setAiModel(firstModel);
        }
      }
    } catch (error) {
      console.error('❌ [LocalAI] Erreur lors du chargement des modèles:', error);
      // En cas d'erreur, utiliser une liste par défaut
      setLocalAIModels([
        { id: 'qwen2.5-72b-instruct', name: 'Qwen 2.5 72B Instruct' },
        { id: 'mistral-7b-instruct-v0.3', name: 'Mistral 7B Instruct v0.3' },
        { id: 'gemma-3-27b-it', name: 'Gemma 3 27B IT' },
        { id: 'openai_gpt-oss-20b-neo', name: 'OpenAI GPT OSS 20B Neo' },
        { id: 'planetoid_27b_v.2', name: 'Planetoid 27B v.2' }
      ]);
    } finally {
      setLoadingModels(false);
    }
  };

  const analyzeDescription = async () => {
    try {
      const analysisResult = await enhancedAIService.analyzeDescription(description);
      setAnalysis(analysisResult);
      console.log('🔍 [EnhancedAI] Analyse:', analysisResult);
    } catch (error) {
      console.error('❌ [EnhancedAI] Erreur lors de l\'analyse:', error);
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setLoading(true);
    setError('');
    setGeneratedWorkflow(null);

    try {
      let response;

      // Utiliser Ollama si sélectionné
      if (aiProvider === 'ollama') {
        const ollamaRequest: OllamaWorkflowRequest = {
          description,
          model: aiModel,
          context
        };
        response = await ollamaService.generateWorkflow(ollamaRequest);
      } else {
        // Utiliser les services externes (OpenRouter, OpenAI, etc.)
        switch (generationMode) {
          case 'intelligent':
            const intelligentRequest: IntelligentWorkflowRequest = {
              description,
              aiProvider,
              aiModel
            };
            response = await enhancedAIService.generateIntelligentWorkflow(intelligentRequest);
            break;

          case 'optimized':
            const optimizedRequest: OptimizedWorkflowRequest = {
              description,
              aiProvider,
              aiModel
            };
            response = await enhancedAIService.generateOptimizedWorkflow(optimizedRequest);
            break;

          case 'template':
            if (!selectedTemplate) {
              throw new Error('Veuillez sélectionner un template');
            }
            const templateRequest = {
              templateId: selectedTemplate,
              customizations: {
                name: templateName || 'Workflow personnalisé',
                description: description
              }
            };
            response = await enhancedAIService.generateFromTemplate(templateRequest);
            break;

          default:
            throw new Error('Mode de génération non supporté');
        }
      }

      // La réponse peut avoir différentes structures selon le provider
      let workflow;
      if (response.workflow) {
        workflow = response.workflow;
      } else if (response.data?.workflow) {
        workflow = response.data.workflow;
      } else if (response.data) {
        workflow = response.data;
      } else {
        workflow = response;
      }
      
      setGeneratedWorkflow(workflow);
      // Limiter la longueur du nom à 100 caractères pour éviter les problèmes
      const workflowName = workflow?.name || 'AI Generated Workflow';
      const truncatedName = workflowName.length > 100 ? workflowName.substring(0, 100) : workflowName;
      setTemplateName(truncatedName);
      
      console.log('✅ [EnhancedAI] Workflow généré:', workflow);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la génération du workflow');
      console.error('❌ [EnhancedAI] Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !generatedWorkflow) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Extraire le workflow de la structure de réponse
      let workflowData = generatedWorkflow;
      if (generatedWorkflow.workflow) {
        workflowData = generatedWorkflow.workflow;
      } else if (generatedWorkflow.data?.workflow) {
        workflowData = generatedWorkflow.data.workflow;
      } else if (generatedWorkflow.data) {
        workflowData = generatedWorkflow.data;
      }

      // S'assurer que workflowData est un objet valide
      if (!workflowData || typeof workflowData !== 'object') {
        console.error('❌ [AIWorkflowGenerator] Workflow data invalide:', workflowData);
        throw new Error('Workflow data invalide');
      }

      // S'assurer que le nom est défini
      const finalName = templateName || workflowData?.name || 'AI Generated Workflow';
      
      if (!finalName || finalName.trim() === '') {
        throw new Error('Le nom du template est requis');
      }

      console.log('💾 [AIWorkflowGenerator] Sauvegarde du template:', {
        name: finalName,
        description: `AI-generated workflow: ${description}`,
        workflowDataKeys: Object.keys(workflowData),
        workflowDataHasNodes: !!workflowData.nodes,
        workflowDataHasConnections: !!workflowData.connections
      });

      await templateService.createTemplate(
        finalName,
        `AI-generated workflow: ${description}`,
        workflowData
      );
      setSuccess(true);
      setDescription('');
      setTemplateName('');
      setGeneratedWorkflow(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde du template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          AI Provider
        </label>
        <select
          value={aiProvider}
          onChange={(e) => setAiProvider(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          disabled={loading}
        >
          <option value="openrouter">OpenRouter (Claude 3.5 Sonnet - Best)</option>
          <option value="ollama">Local AI (Ollama - Gratuit)</option>
          <option value="openai">OpenAI (GPT-4)</option>
          <option value="anthropic">Anthropic (Claude)</option>
        </select>
        <p className="text-xs text-slate-500 mt-1">
          {aiProvider === 'ollama' 
            ? 'Local AI utilise Ollama installé sur votre serveur - Aucun coût d\'API'
            : 'OpenRouter utilise Claude 3.5 Sonnet (le meilleur LLM) avec les credentials admin'
          }
        </p>
      </div>

      {/* Dropdown pour sélectionner le modèle OpenRouter */}
      {aiProvider === 'openrouter' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Modèle OpenRouter
          </label>
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            disabled={loading}
          >
            <option value="openai/gpt-4o-mini">GPT-4o Mini (Recommandé - Très peu cher ~$0.15/1M)</option>
            <option value="meta-llama/llama-3.1-8b-instruct">Llama 3.1 8B (Gratuit avec limites)</option>
            <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B (Payant - Moyen)</option>
            <option value="meta-llama/llama-3.1-405b-instruct">Llama 3.1 405B (Payant - Cher)</option>
            <option value="openai/gpt-4o">GPT-4o (Payant)</option>
            <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Payant)</option>
            <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku (Payant - Rapide)</option>
            <option value="anthropic/claude-3-opus">Claude 3 Opus (Payant - Puissant)</option>
            <option value="google/gemini-pro-1.5">Gemini Pro 1.5 (Payant)</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Choisissez le modèle selon vos besoins : performance, vitesse ou coût
          </p>
        </div>
      )}

      {/* Dropdown pour sélectionner le modèle Local AI (Ollama) */}
      {aiProvider === 'ollama' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Modèle Local AI (Ollama)
          </label>
          <div className="flex gap-2">
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              disabled={loading || loadingModels}
            >
              {loadingModels ? (
                <option value="">Chargement des modèles...</option>
              ) : localAIModels.length > 0 ? (
                localAIModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))
              ) : (
                <option value="">Aucun modèle disponible</option>
              )}
            </select>
            <button
              onClick={loadLocalAIModels}
              disabled={loadingModels || loading}
              className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Actualiser la liste des modèles"
            >
              🔄
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {loadingModels 
              ? 'Chargement des modèles depuis LocalAI...'
              : localAIModels.length > 0
              ? `${localAIModels.length} modèle${localAIModels.length > 1 ? 's' : ''} disponible${localAIModels.length > 1 ? 's' : ''} - Cliquez sur 🔄 pour actualiser`
              : 'Modèles locaux gratuits - Aucun coût d\'API'
            }
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Describe Your Workflow
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          placeholder="Example: Create an email summary workflow that analyzes daily emails and sends a priority report..."
          rows={4}
          disabled={loading}
        />
        <p className="text-xs text-slate-500 mt-2">
          {aiProvider === 'ollama' 
            ? 'L\'IA génère des workflows n8n complets avec Local AI (Ollama) installé sur votre serveur'
            : 'L\'IA génère des workflows n8n complets avec OpenRouter (admin) et credentials utilisateur (IMAP/SMTP)'
          }
        </p>
      </div>

      {/* Affichage du contexte de l'application */}
      {context && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Contexte de l'application chargé
              </h3>
              <div className="text-xs text-blue-700 space-y-1">
                <p>• {context.templates?.length || 0} templates disponibles</p>
                <p>• {Object.keys(context.popularNodes || {}).length} types de nœuds populaires</p>
                <p>• {Object.keys(context.connectionPatterns || {}).length} patterns de connexion</p>
                <p>• {Object.keys(context.availableCredentials || {}).length} credentials disponibles</p>
                {context.usageStats && (
                  <p>• {context.usageStats.templates?.total_templates || 0} templates au total</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Affichage de debug si le contexte n'est pas chargé */}
      {!context && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                Chargement du contexte...
              </h3>
              <div className="text-xs text-yellow-700">
                <p>Récupération des données de l'application en cours...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Affichage de l'analyse de la description */}
      {analysis && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-purple-800 mb-2">
                Analyse de votre description
              </h3>
              <div className="text-xs text-purple-700">
                <p>L'IA a analysé votre demande et va générer un workflow optimisé.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!generatedWorkflow ? (
        <button
          onClick={handleGenerate}
          disabled={loading || !description.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Workflow...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate with AI
            </>
          )}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 mb-2">
                  Workflow generated successfully!
                </p>
                <div className="bg-white rounded p-3 max-h-64 overflow-auto">
                  <pre className="text-xs text-slate-700">
                    {JSON.stringify(generatedWorkflow.workflow, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Template Name
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="My AI Workflow"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setGeneratedWorkflow(null);
                setTemplateName('');
              }}
              className="flex-1 px-6 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition"
            >
              Generate New
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">
            AI-generated template saved successfully!
          </p>
        </div>
      )}
    </div>
  );
}
