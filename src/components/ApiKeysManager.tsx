import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Eye, EyeOff, Loader2, Copy, Check } from 'lucide-react';
import { apiKeyService } from '../services';

interface ApiKey {
  id: string;
  service_name: string;
  api_key: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

const AI_SERVICES = [
  { value: 'openai', label: 'OpenAI (GPT)', placeholder: 'sk-...' },
  { value: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
  { value: 'google', label: 'Google (Gemini)', placeholder: 'AIza...' },
  { value: 'deepseek', label: 'DeepSeek', placeholder: 'sk-...' },
  { value: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-...' },
  { value: 'huggingface', label: 'Hugging Face', placeholder: 'hf_...' },
  { value: 'mistral', label: 'Mistral AI', placeholder: 'mistral-...' },
  { value: 'cohere', label: 'Cohere', placeholder: 'co-...' },
];

export function ApiKeysManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [, setEditingKey] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [newKey, setNewKey] = useState({
    service_name: '',
    api_key: '',
    description: '',
    is_active: true,
  });

  const currentCallbackUrl = `${window.location.origin}/oauth/callback`;

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const apiKeys = await apiKeyService.getApiKeys();
      setApiKeys(apiKeys);
    } catch (error: any) {
      console.error('Error loading API keys:', error);
      alert('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKey.service_name || !newKey.api_key) {
      alert('Please fill in service name and API key');
      return;
    }

    setSaving(true);
    try {
      const createdKey = await apiKeyService.createApiKey(newKey.service_name, newKey.api_key, newKey.description);

      setNewKey({
        service_name: '',
        api_key: '',
        description: '',
        is_active: true,
      });

      loadApiKeys();
      alert('API key added successfully');
    } catch (error: any) {
      console.error('Error adding API key:', error);
      alert(error.message || 'Failed to add API key');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateKey = async (id: string, updates: Partial<ApiKey>) => {
    setSaving(true);
    try {
      await apiKeyService.updateApiKey(id, updates);

      loadApiKeys();
      setEditingKey(null);
      alert('API key updated successfully');
    } catch (error: any) {
      console.error('Error updating API key:', error);
      alert('Failed to update API key');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      await apiKeyService.deleteApiKey(id);

      loadApiKeys();
      alert('API key deleted successfully');
    } catch (error: any) {
      console.error('Error deleting API key:', error);
      alert('Failed to delete API key');
    }
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '***';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  const copyCallbackUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentCallbackUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 mb-2">OAuth Callback URL (for Google Console)</h3>
            <p className="text-sm text-amber-800 mb-3">
              Copy this URL and add it to your Google Console OAuth client configuration:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border border-amber-300 rounded px-3 py-2 text-sm text-gray-900 font-mono break-all">
                {currentCallbackUrl}
              </code>
              <button
                onClick={copyCallbackUrl}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shrink-0"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-amber-700 mt-2">
              Note: This URL changes in Bolt WebContainer. Update it in Google Console each time you get a new URL.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">AI Service API Keys</h2>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> These API keys will be automatically injected into user workflows.
            Users will use your admin accounts, not their own API keys.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New API Key</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Service
              </label>
              <select
                value={newKey.service_name}
                onChange={(e) => setNewKey({ ...newKey, service_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select service...</option>
                {AI_SERVICES.map((service) => (
                  <option key={service.value} value={service.value}>
                    {service.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={newKey.api_key}
                onChange={(e) => setNewKey({ ...newKey, api_key: e.target.value })}
                placeholder={AI_SERVICES.find(s => s.value === newKey.service_name)?.placeholder || 'Enter API key...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <input
                type="text"
                value={newKey.description}
                onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
                placeholder="e.g., Production account, Dev environment..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={handleAddKey}
            disabled={saving || !newKey.service_name || !newKey.api_key}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            Add API Key
          </button>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configured API Keys</h3>

          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No API keys configured yet. Add your first one above.
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-gray-900">
                          {AI_SERVICES.find(s => s.value === key.service_name)?.label || key.service_name}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            key.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {key.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          {showKeys[key.id] ? key.api_key : maskApiKey(key.api_key)}
                        </code>
                        <button
                          onClick={() => toggleShowKey(key.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {showKeys[key.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {key.description && (
                        <p className="text-sm text-gray-500">{key.description}</p>
                      )}

                      <p className="text-xs text-gray-400 mt-2">
                        Added {new Date(key.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleUpdateKey(key.id, { is_active: !key.is_active })}
                        disabled={saving}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          key.is_active
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {key.is_active ? 'Disable' : 'Enable'}
                      </button>

                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
