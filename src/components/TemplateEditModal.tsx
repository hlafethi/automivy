import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Template } from '../types';
import { templateService } from '../services';

interface TemplateEditModalProps {
  template: Template | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function TemplateEditModal({ template, onClose, onSuccess }: TemplateEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visible: true,
    workflowData: null as any
  });
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      const templateJson = (template as any).json || template.workflow_data || {};
      setFormData({
        name: template.name || '',
        description: template.description || '',
        visible: (template as any).visible ?? true,
        workflowData: templateJson
      });
      // Convertir le JSON en string formatée pour l'affichage
      try {
        setJsonText(JSON.stringify(templateJson, null, 2));
        setJsonError(null);
      } catch (err) {
        setJsonText('');
        setJsonError('Erreur lors du formatage du JSON');
      }
    }
  }, [template]);

  const handleJsonChange = (value: string) => {
    setJsonText(value);
    setJsonError(null);
    
    // Essayer de parser le JSON pour valider
    try {
      const parsed = JSON.parse(value);
      setFormData(prev => ({
        ...prev,
        workflowData: parsed
      }));
    } catch (err) {
      setJsonError('JSON invalide');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;

    // Valider le JSON avant de soumettre
    if (jsonError) {
      setError('Veuillez corriger les erreurs JSON avant de sauvegarder');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Préparer les données de mise à jour
      const updates: any = {
        name: formData.name,
        description: formData.description
      };
      
      // Ajouter workflowData si le JSON a été modifié
      if (formData.workflowData) {
        updates.workflowData = formData.workflowData;
      }
      
      await templateService.updateTemplate(template.id, updates);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update template');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!template) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-slate-900">Edit Template</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Template Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Enter template name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Enter template description"
              rows={4}
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="visible"
              checked={formData.visible}
              onChange={(e) => handleChange('visible', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="visible" className="text-sm font-medium text-slate-700">
              Visible to users
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Workflow JSON
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm ${
                jsonError ? 'border-red-300 bg-red-50' : 'border-slate-300'
              }`}
              placeholder="Workflow JSON..."
              rows={15}
            />
            {jsonError && (
              <p className="mt-1 text-sm text-red-600">{jsonError}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Modifiez le JSON du workflow. Le JSON doit être valide pour être sauvegardé.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
