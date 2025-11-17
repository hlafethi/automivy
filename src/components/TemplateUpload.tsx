import { useState } from 'react';
import { Upload, FileJson, CheckCircle, AlertCircle } from 'lucide-react';
import { templateService } from '../services';
import { templateParserService } from '../services/templateParserService';
import { useAuth } from '../contexts/AuthContext';

export function TemplateUpload() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [jsonContent, setJsonContent] = useState('');
  const [setupTime, setSetupTime] = useState<number | ''>('');
  const [executionTime, setExecutionTime] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const json = JSON.parse(jsonString);

        try {
          const template = templateParserService.parseTemplate(jsonString);

          if (template.templateMetadata?.name && !name) {
            setName(template.templateMetadata.name);
          }
          if (template.templateMetadata?.description && !description) {
            setDescription(template.templateMetadata.description);
          }

          setJsonContent(JSON.stringify(json, null, 2));
          setError('');
        } catch (parseError: any) {
          setJsonContent(JSON.stringify(json, null, 2));
          if (json.name && !name) {
            setName(json.name);
          }
          setError('');
        }
      } catch {
        setError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const json = JSON.parse(jsonContent);
      await templateService.createTemplate(
        name,
        description,
        json,
        setupTime ? Number(setupTime) : undefined,
        executionTime ? Number(executionTime) : undefined
      );
      setSuccess(true);
      setName('');
      setDescription('');
      setJsonContent('');
      setSetupTime('');
      setExecutionTime('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Template Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          placeholder="My Workflow Template"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          placeholder="Describe what this workflow does..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Temps de paramétrage (minutes)
          </label>
          <input
            type="number"
            min="0"
            value={setupTime}
            onChange={(e) => setSetupTime(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="Ex: 5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Temps d'exécution (minutes)
          </label>
          <input
            type="number"
            min="0"
            value={executionTime}
            onChange={(e) => setExecutionTime(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="Ex: 2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Upload JSON File
        </label>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <FileJson className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">
              Click to upload n8n workflow JSON
            </p>
            <p className="text-xs text-slate-500 mt-1">
              or paste JSON content below
            </p>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          JSON Content
        </label>
        <textarea
          value={jsonContent}
          onChange={(e) => setJsonContent(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
          placeholder='{"nodes": [], "connections": {}}'
          rows={10}
          required
        />
        <p className="text-xs text-slate-500 mt-2">
          Use placeholders like {'{{email}}'} for user-configurable parameters
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 border rounded-lg flex items-start gap-3" style={{ backgroundColor: '#e0f4f6', borderColor: '#a3dde3' }}>
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#046f78' }} />
          <p className="text-sm" style={{ color: '#034a52' }}>Template created successfully!</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload className="w-5 h-5" />
        {loading ? 'Creating Template...' : 'Create Template'}
      </button>
    </form>
  );
}
