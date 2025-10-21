import { useState, useEffect } from 'react';
import { FileCode, Loader2 } from 'lucide-react';
import { Template } from '../types';
import { templateService } from '../services';
import { useAuth } from '../contexts/AuthContext';

export function TemplateCatalog() {
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

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
          Browse available workflow templates
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-green-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                    <FileCode className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 text-lg">{template.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">
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

              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Created: {new Date(template.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
