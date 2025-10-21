import { useState } from 'react';
import { Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { aiService } from '../services/aiService';
import { templateService } from '../services';
import { useAuth } from '../contexts/AuthContext';

export function AIWorkflowGenerator() {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [aiProvider, setAiProvider] = useState('openrouter');
  const [loading, setLoading] = useState(false);
  const [generatedJson, setGeneratedJson] = useState<any>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setLoading(true);
    setError('');
    setGeneratedJson(null);

    try {
      const workflow = await aiService.generateWorkflow(description, aiProvider);
      setGeneratedJson(workflow);
      setTemplateName(workflow.name || 'AI Generated Workflow');
    } catch (err: any) {
      setError(err.message || 'Failed to generate workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !generatedJson) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await templateService.createTemplate(
        templateName,
        `AI-generated workflow: ${description}`,
        generatedJson,
        user.id
      );
      setSuccess(true);
      setDescription('');
      setTemplateName('');
      setGeneratedJson(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
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
          <option value="openai">OpenAI (GPT-4)</option>
          <option value="anthropic">Anthropic (Claude)</option>
        </select>
        <p className="text-xs text-slate-500 mt-1">
          OpenRouter utilise Claude 3.5 Sonnet (le meilleur LLM) avec les credentials admin
        </p>
      </div>

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
          L'IA génère des workflows n8n complets avec OpenRouter (admin) et credentials utilisateur (IMAP/SMTP)
        </p>
      </div>

      {!generatedJson ? (
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
                    {JSON.stringify(generatedJson, null, 2)}
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
                setGeneratedJson(null);
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
