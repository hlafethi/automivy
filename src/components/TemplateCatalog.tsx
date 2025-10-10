import { useState, useEffect } from 'react';
import { FileCode, Plus, Loader2 } from 'lucide-react';
import { Template } from '../types';
import { templateService } from '../services';
import { WorkflowDeployModal } from './WorkflowDeployModal';
import { useAuth } from '../contexts/AuthContext';

export function TemplateCatalog() {
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (user && !authLoading) {
      loadTemplates();
    }
  }, [user, authLoading]);

  const loadTemplates = async () => {
    try {
      const data = await templateService.getVisibleTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <FileCode className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Please log in</h3>
        <p className="text-slate-600">
          You need to be logged in to view the template catalog
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Template Catalog</h2>
        <p className="text-slate-600 mt-1">
          Choose a template to deploy your automation workflow
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <FileCode className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No templates available yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Contact an admin to add workflow templates
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FileCode className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{template.name}</h3>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {template.description || 'No description available'}
              </p>

              <button
                onClick={() => {
                  console.log('Deploy button clicked for template:', template.name);
                  console.log('Template object:', template);
                  setSelectedTemplate(template);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                Deploy
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedTemplate && (
        <>
          {console.log('Rendering WorkflowDeployModal, selectedTemplate:', selectedTemplate.name)}
          <WorkflowDeployModal
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            onSuccess={() => {
              setSelectedTemplate(null);
              // Rediriger vers My Automations après création
              window.location.href = '/user-dashboard';
            }}
          />
        </>
      )}
    </div>
  );
}
