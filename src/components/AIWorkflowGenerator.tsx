import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Loader2, CheckCircle, AlertCircle, Brain, Target, 
  Zap, Mail, FileText, Rss, Code, Settings, ChevronDown, 
  ChevronUp, Copy, Download, RefreshCw, Wand2
} from 'lucide-react';
import { enhancedAIService, IntelligentWorkflowRequest, ApplicationContext } from '../services/enhancedAIService';
import { ollamaService, OllamaWorkflowRequest } from '../services/ollamaService';
import { templateService } from '../services';
import { useAuth } from '../contexts/AuthContext';

// Types pour les cas d'usage prédéfinis
interface UseCaseTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  category: 'email' | 'content' | 'api' | 'data';
}

// Cas d'usage prédéfinis pour génération rapide
const USE_CASE_TEMPLATES: UseCaseTemplate[] = [
  {
    id: 'email-summary',
    name: 'Résumé des emails',
    description: 'Analyse tes emails et génère un résumé quotidien par priorité',
    icon: <Mail className="w-5 h-5" />,
    prompt: 'Crée un workflow qui lit mes emails IMAP chaque jour à 9h, les analyse avec l\'IA pour créer un résumé par priorité (Urgent, Important, Normal), et m\'envoie ce résumé par email.',
    category: 'email'
  },
  {
    id: 'newsletter',
    name: 'Newsletter Tech',
    description: 'Génère une newsletter à partir de flux RSS',
    icon: <Rss className="w-5 h-5" />,
    prompt: 'Crée un workflow newsletter qui s\'exécute tous les jours à 6h, lit le flux RSS de TechCrunch, filtre les 5 articles les plus récents, utilise l\'IA pour générer un contenu engageant, et envoie la newsletter par email.',
    category: 'content'
  },
  {
    id: 'pdf-analysis',
    name: 'Analyse de PDFs',
    description: 'Reçoit des PDFs via webhook et les analyse avec l\'IA',
    icon: <FileText className="w-5 h-5" />,
    prompt: 'Crée un workflow qui reçoit des fichiers PDF via webhook, extrait le texte, utilise l\'IA pour analyser le contenu et générer un résumé, puis retourne le résultat en JSON.',
    category: 'api'
  },
  {
    id: 'api-endpoint',
    name: 'API REST',
    description: 'Crée un endpoint API avec validation et traitement',
    icon: <Code className="w-5 h-5" />,
    prompt: 'Crée un workflow API REST qui reçoit des requêtes POST, valide les données entrantes, les traite avec du code personnalisé, et retourne une réponse JSON structurée.',
    category: 'api'
  }
];

// Modèles AI disponibles
const AI_MODELS = {
  openrouter: [
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Recommandé)', description: 'Excellent rapport qualité/prix', cost: '~$0.15/1M tokens' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Plus puissant', cost: '~$5/1M tokens' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Très bon pour le code', cost: '~$3/1M tokens' },
    { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', description: 'Rapide et économique', cost: '~$0.25/1M tokens' },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', description: 'Open source', cost: '~$0.50/1M tokens' },
    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', description: 'Google AI', cost: '~$1.25/1M tokens' }
  ]
};

export function AIWorkflowGenerator() {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [aiProvider, setAiProvider] = useState('openrouter');
  const [aiModel, setAiModel] = useState('openai/gpt-4o-mini');
  const [loading, setLoading] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState<ApplicationContext | null>(null);
  const [localAIModels, setLocalAIModels] = useState<Array<{id: string, name: string}>>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showWorkflowJson, setShowWorkflowJson] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  const [showNodesMenu, setShowNodesMenu] = useState(false);
  const [availableNodes, setAvailableNodes] = useState<Record<string, any[]>>({});
  const [nodesCategories, setNodesCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [nodesSearchTerm, setNodesSearchTerm] = useState('');
  const [loadingNodes, setLoadingNodes] = useState(false);

  // Charger le contexte de l'application au démarrage
  useEffect(() => {
    loadApplicationContext();
    loadAllNodes();
  }, []);

  // Charger tous les nœuds disponibles
  const loadAllNodes = async () => {
    setLoadingNodes(true);
    try {
      const nodesData = await enhancedAIService.getAllNodes();
      setAvailableNodes(nodesData.nodes || {});
      setNodesCategories(nodesData.categories || []);
      console.log('✅ [AIGenerator] Nœuds chargés:', nodesData.totalCount);
    } catch (error) {
      console.error('❌ [AIGenerator] Erreur chargement nœuds:', error);
    } finally {
      setLoadingNodes(false);
    }
  };

  // Charger les modèles LocalAI quand le provider change
  useEffect(() => {
    if (aiProvider === 'ollama') {
      loadLocalAIModels();
    }
  }, [aiProvider]);

  // Mettre à jour le modèle par défaut quand le provider change
  useEffect(() => {
    if (aiProvider === 'ollama' && localAIModels.length > 0) {
      const currentModelExists = localAIModels.some(modelItem => (modelItem.id || modelItem.name) === aiModel);
      if (!currentModelExists) {
        const firstModel = localAIModels[0].id || localAIModels[0].name;
        setAiModel(firstModel);
      }
    } else if (aiProvider === 'openrouter') {
      const openRouterPatterns = ['anthropic/', 'openai/', 'google/', 'meta-llama/'];
      const isOpenRouterModel = openRouterPatterns.some(pattern => aiModel.startsWith(pattern));
      if (!isOpenRouterModel) {
        setAiModel('openai/gpt-4o-mini');
      }
    }
  }, [aiProvider, localAIModels, aiModel]);

  const loadApplicationContext = async () => {
    try {
      const appContext = await enhancedAIService.getApplicationContext();
      setContext(appContext);
      console.log('🧠 [AIGenerator] Contexte chargé');
    } catch (contextError) {
      console.error('❌ [AIGenerator] Erreur contexte:', contextError);
    }
  };

  const loadLocalAIModels = async () => {
    setLoadingModels(true);
    try {
      const models = await ollamaService.getAvailableModels();
      setLocalAIModels(models);
      if (models.length > 0 && !models.some(modelItem => (modelItem.id || modelItem.name) === aiModel)) {
        setAiModel(models[0].id || models[0].name);
      }
    } catch (modelError) {
      console.error('❌ [AIGenerator] Erreur modèles:', modelError);
      setLocalAIModels([
        { id: 'mistral-7b-instruct-v0.3', name: 'Mistral 7B' },
        { id: 'qwen2.5-72b-instruct', name: 'Qwen 2.5 72B' }
      ]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleUseCaseSelect = (useCase: UseCaseTemplate) => {
    setSelectedUseCase(useCase.id);
    setDescription(useCase.prompt);
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setLoading(true);
    setError('');
    setGeneratedWorkflow(null);
    setValidationResult(null);
    setAnalysisResult(null);

    try {
      let response;

      if (aiProvider === 'ollama') {
        const ollamaRequest: OllamaWorkflowRequest = {
          description,
          model: aiModel,
          context
        };
        response = await ollamaService.generateWorkflow(ollamaRequest);
      } else {
        const intelligentRequest: IntelligentWorkflowRequest = {
          description,
          aiProvider,
          aiModel
        };
        response = await enhancedAIService.generateIntelligentWorkflow(intelligentRequest);
      }

      // Extraire le workflow de la réponse
      let workflow = response.workflow || response.data?.workflow || response.data || response;
      
      setGeneratedWorkflow(workflow);
      setValidationResult(response.validation || response.data?.validation);
      setAnalysisResult(response.analysis || response.data?.analysis);
      
      // Générer un nom par défaut
      const workflowName = workflow?.name || 'AI Generated Workflow';
      setTemplateName(workflowName.length > 100 ? workflowName.substring(0, 100) : workflowName);
      
      console.log('✅ [AIGenerator] Workflow généré avec succès');
    } catch (generateError: any) {
      setError(generateError.message || 'Erreur lors de la génération du workflow');
      console.error('❌ [AIGenerator] Erreur:', generateError);
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
      let workflowData = generatedWorkflow.workflow || generatedWorkflow.data?.workflow || generatedWorkflow.data || generatedWorkflow;

      if (!workflowData || typeof workflowData !== 'object') {
        throw new Error('Workflow data invalide');
      }

      const finalName = templateName || workflowData?.name || 'AI Generated Workflow';
      
      if (!finalName || finalName.trim() === '') {
        throw new Error('Le nom du template est requis');
      }

      await templateService.createTemplate(
        finalName,
        `AI-generated workflow: ${description.substring(0, 200)}`,
        workflowData
      );
      
      setSuccess(true);
      setDescription('');
      setTemplateName('');
      setGeneratedWorkflow(null);
      setSelectedUseCase(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (saveError: any) {
      setError(saveError.message || 'Erreur lors de la sauvegarde du template');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const workflow = generatedWorkflow?.workflow || generatedWorkflow;
    navigator.clipboard.writeText(JSON.stringify(workflow, null, 2));
  };

  const downloadWorkflow = () => {
    const workflow = generatedWorkflow?.workflow || generatedWorkflow;
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${templateName || 'workflow'}.json`;
    downloadLink.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec titre et description */}
      <div className="text-center pb-4 border-b border-slate-200">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Wand2 className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-slate-800">Ultimate AI Workflow Generator</h2>
        </div>
        <p className="text-sm text-slate-600">
          Le générateur de workflows n8n le plus avancé au monde
        </p>
      </div>

      {/* Cas d'usage rapides */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          🚀 Génération rapide
        </label>
        <div className="grid grid-cols-2 gap-3">
          {USE_CASE_TEMPLATES.map((useCase) => (
            <button
              key={useCase.id}
              onClick={() => handleUseCaseSelect(useCase)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedUseCase === useCase.id
                  ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                  : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
              }`}
              disabled={loading}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedUseCase === useCase.id ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {useCase.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800">{useCase.name}</p>
                  <p className="text-xs text-slate-500 truncate">{useCase.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Zone de description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          📝 Décris ton workflow
        </label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition resize-none"
          placeholder="Exemple: Crée un workflow qui analyse mes emails chaque jour à 9h et m'envoie un résumé par priorité..."
          rows={4}
          disabled={loading}
        />
        <p className="text-xs text-slate-500 mt-2">
          💡 Sois précis : heures, sources, formats, étapes... L'IA génère un workflow personnalisé selon ta demande.
        </p>
      </div>

      {/* Options avancées */}
      <div className="border border-slate-200 rounded-lg">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-sm text-slate-700">Options avancées</span>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>
        
        {showAdvanced && (
          <div className="px-4 pb-4 space-y-4 border-t border-slate-200">
            {/* Provider AI */}
            <div className="pt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                🤖 Provider IA
              </label>
              <select
                value={aiProvider}
                onChange={(event) => setAiProvider(event.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                disabled={loading}
              >
                <option value="openrouter">OpenRouter (Recommandé)</option>
                <option value="ollama">Local AI (Ollama - Gratuit)</option>
              </select>
            </div>

            {/* Modèle AI */}
            {aiProvider === 'openrouter' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  🧠 Modèle
                </label>
                <select
                  value={aiModel}
                  onChange={(event) => setAiModel(event.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  disabled={loading}
                >
                  {AI_MODELS.openrouter.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.cost}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {aiProvider === 'ollama' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  🧠 Modèle Local
                </label>
                <div className="flex gap-2">
                  <select
                    value={aiModel}
                    onChange={(event) => setAiModel(event.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                    disabled={loading || loadingModels}
                  >
                    {loadingModels ? (
                      <option value="">Chargement...</option>
                    ) : localAIModels.length > 0 ? (
                      localAIModels.map((model) => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))
                    ) : (
                      <option value="">Aucun modèle disponible</option>
                    )}
                  </select>
                  <button
                    onClick={loadLocalAIModels}
                    disabled={loadingModels || loading}
                    className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
                    title="Actualiser"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingModels ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contexte de l'application */}
      {context && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Contexte intelligent chargé
              </h3>
              <div className="text-xs text-blue-700 grid grid-cols-2 gap-2">
                <p>• {context.templates?.length || 0} templates</p>
                <p>• {Object.keys(context.popularNodes || {}).length} nodes populaires</p>
                <p>• {Object.keys(context.connectionPatterns || {}).length} patterns</p>
                <p>• {Object.keys(context.availableCredentials || {}).length} credentials</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bouton de génération */}
      {!generatedWorkflow ? (
        <button
          onClick={handleGenerate}
          disabled={loading || !description.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Génération en cours...</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span>Générer avec l'IA Ultimate</span>
            </span>
          )}
        </button>
      ) : (
        <div className="space-y-4">
          {/* Résultat de la validation */}
          {validationResult && (
            <div className={`p-4 rounded-lg border ${
              validationResult.valid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-3">
                {validationResult.valid ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${validationResult.valid ? 'text-green-800' : 'text-yellow-800'}`}>
                    {validationResult.valid ? '✅ Workflow valide et prêt à déployer!' : '⚠️ Workflow généré avec corrections'}
                  </p>
                  {validationResult.fixes?.length > 0 && (
                    <p className="text-xs text-slate-600 mt-1">
                      🔧 {validationResult.fixes.length} correction(s) automatique(s) appliquée(s)
                    </p>
                  )}
                  {validationResult.warnings?.length > 0 && (
                    <p className="text-xs text-yellow-700 mt-1">
                      ⚠️ {validationResult.warnings.length} warning(s)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Analyse du workflow */}
          {analysisResult && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-purple-800 mb-2">Analyse du workflow</h3>
                  <div className="text-xs text-purple-700 grid grid-cols-2 gap-2">
                    <p>• Type: {analysisResult.workflowType}</p>
                    <p>• Complexité: {analysisResult.complexity}</p>
                    <p>• Nodes: {analysisResult.requiredNodes?.length || 0}</p>
                    <p>• IA: {analysisResult.aiRequirements?.needsAI ? 'Oui' : 'Non'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aperçu du workflow */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-800">Workflow généré</h3>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition"
                  title="Copier le JSON"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={downloadWorkflow}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition"
                  title="Télécharger"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowWorkflowJson(!showWorkflowJson)}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition"
                  title={showWorkflowJson ? 'Masquer JSON' : 'Voir JSON'}
                >
                  <Code className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Résumé du workflow */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="p-2 bg-white rounded border">
                <p className="text-xs text-slate-500">Nom</p>
                <p className="text-sm font-medium text-slate-800 truncate">
                  {generatedWorkflow?.name || generatedWorkflow?.workflow?.name || 'Workflow'}
                </p>
              </div>
              <div className="p-2 bg-white rounded border">
                <p className="text-xs text-slate-500">Nodes</p>
                <p className="text-sm font-medium text-slate-800">
                  {generatedWorkflow?.nodes?.length || generatedWorkflow?.workflow?.nodes?.length || 0}
                </p>
              </div>
              <div className="p-2 bg-white rounded border">
                <p className="text-xs text-slate-500">Connexions</p>
                <p className="text-sm font-medium text-slate-800">
                  {Object.keys(generatedWorkflow?.connections || generatedWorkflow?.workflow?.connections || {}).length}
                </p>
              </div>
            </div>

            {/* JSON du workflow */}
            {showWorkflowJson && (
              <div className="bg-slate-900 rounded-lg p-4 max-h-64 overflow-auto">
                <pre className="text-xs text-slate-300 font-mono">
                  {JSON.stringify(generatedWorkflow?.workflow || generatedWorkflow, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Nom du template */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nom du template
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              placeholder="Mon workflow AI"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setGeneratedWorkflow(null);
                setTemplateName('');
                setValidationResult(null);
                setAnalysisResult(null);
              }}
              className="flex-1 px-6 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition"
            >
              Nouvelle génération
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {/* Messages d'erreur */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Message de succès */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">
            ✅ Template sauvegardé avec succès! Tu peux maintenant le déployer.
          </p>
        </div>
      )}
    </div>
  );
}
