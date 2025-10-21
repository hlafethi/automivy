import { useState, useEffect } from 'react';
import { Trash2, Eye, EyeOff, FileJson, Loader2, Rocket, Edit } from 'lucide-react';
import { templateService } from '../services';
import { Template } from '../types';
import { WorkflowDeployModal } from './WorkflowDeployModal';
import { TemplateEditModal } from './TemplateEditModal';
import { useAuth } from '../contexts/AuthContext';

export function TemplateList() {
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [deployTemplate, setDeployTemplate] = useState<Template | null>(null);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);

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

  const handleEdit = (template: Template) => {
    setEditTemplate(template);
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-green-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                  <FileJson className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 text-lg mb-1">
                    {template.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Template ID: {template.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                {template.description || 'No description available'}
              </p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-slate-500">
                Created: {new Date(template.created_at).toLocaleDateString()}
              </div>
              <div className="text-xs text-slate-500">
                Nodes: {template.json?.nodes?.length || 0}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTemplate(template)}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  title="View JSON"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                  title="Edit template"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleVisibility(template.id, template.visible)}
                  className={`p-2 rounded-lg transition ${
                    template.visible
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-slate-400 hover:bg-slate-50'
                  }`}
                  title={template.visible ? 'Hide from users' : 'Show to users'}
                >
                  {template.visible ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Delete template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => {
                  console.log('Deploy button clicked in TemplateList for:', template.name);
                  setDeployTemplate(template);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:shadow-md"
                title="Deploy to n8n"
              >
                <Rocket className="w-5 h-5" />
              </button>
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

      {editTemplate && (
        <TemplateEditModal
          template={editTemplate}
          onClose={() => setEditTemplate(null)}
          onSuccess={() => {
            setEditTemplate(null);
            loadTemplates();
          }}
        />
      )}
    </div>
  );
}