import { useState, useEffect } from 'react';
import { Trash2, Eye, EyeOff, FileJson, Loader2, Rocket } from 'lucide-react';
import { templateService } from '../services';
import { Template } from '../types';
import { WorkflowDeployModal } from './WorkflowDeployModal';
import { useAuth } from '../contexts/AuthContext';

export function TemplateList() {
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [deployTemplate, setDeployTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (user && !authLoading) {
      loadTemplates();
    }
  }, [user, authLoading]);

  const loadTemplates = async () => {
    try {
      const data = await templateService.getAllTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await templateService.deleteTemplate(id);
      loadTemplates();
    } catch (error) {
      alert('Failed to delete template');
    }
  };

  const handleToggleVisibility = async (templateId: string, currentVisible: boolean) => {
    try {
      await templateService.updateTemplateVisibility(templateId, !currentVisible);
      loadTemplates();
    } catch (error: any) {
      console.error('Error updating template visibility:', error);
      alert('Failed to update template visibility');
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <FileJson className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Please log in</h3>
        <p className="text-slate-600">
          You need to be logged in to view templates
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <FileJson className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No Templates Yet</h3>
        <p className="text-slate-600">
          Upload or generate your first template to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          All Templates ({templates.length})
        </h3>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-1">
                  {template.name}
                </h4>
                <p className="text-sm text-slate-600 mb-3">
                  {template.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>
                    Created: {new Date(template.created_at).toLocaleDateString()}
                  </span>
                  <span>
                    Nodes: {template.json?.nodes?.length || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTemplate(template)}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  title="View JSON"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    console.log('Deploy button clicked in TemplateList for:', template.name);
                    setDeployTemplate(template);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Deploy to n8n"
                >
                  <Rocket className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleToggleVisibility(template.id, template.visible)}
                  className={`p-2 rounded-lg transition ${
                    template.visible 
                      ? 'text-green-600 hover:bg-green-50' 
                      : 'text-orange-600 hover:bg-orange-50'
                  }`}
                  title={template.visible ? 'Hide from users' : 'Show to users'}
                >
                  {template.visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedTemplate && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedTemplate(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {selectedTemplate.name}
              </h3>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <pre className="bg-slate-50 p-4 rounded-lg overflow-auto text-xs text-slate-700">
                {JSON.stringify(selectedTemplate.json, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {deployTemplate && (
        <WorkflowDeployModal
          template={deployTemplate}
          onClose={() => setDeployTemplate(null)}
          onSuccess={() => {
            setDeployTemplate(null);
            loadTemplates();
          }}
        />
      )}
    </div>
  );
}