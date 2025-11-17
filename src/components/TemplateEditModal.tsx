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
    workflowData: null as any,
    setupTime: null as number | null,
    executionTime: null as number | null
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
        workflowData: templateJson,
        setupTime: template.setup_time ?? null,
        executionTime: template.execution_time ?? null
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
        description: formData.description,
        visible: formData.visible
      };
      
      // Ajouter workflowData si le JSON a été modifié
      if (formData.workflowData) {
        updates.workflowData = formData.workflowData;
      }

      // Ajouter les temps (même si null, pour permettre de les effacer)
      updates.setup_time = formData.setupTime;
      updates.execution_time = formData.executionTime;
      
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden border border-slate-200 flex flex-col">
        {/* Header avec gradient vert sapin */}
        <div className="px-8 py-6 text-white" style={{ background: 'linear-gradient(to right, #046f78, #034a52)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Save className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Modifier le template</h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  {template.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl p-2 transition-all duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 max-h-[calc(95vh-200px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom du template
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0 outline-none transition"
                style={{ 
                  '--tw-ring-color': '#046f78',
                  focusRingColor: '#046f78'
                } as React.CSSProperties & { focusRingColor?: string }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                placeholder="Entrez le nom du template"
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
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0 outline-none transition"
                style={{ 
                  '--tw-ring-color': '#046f78',
                  focusRingColor: '#046f78'
                } as React.CSSProperties & { focusRingColor?: string }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                placeholder="Entrez la description du template"
                rows={4}
              />
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="visible"
                  checked={formData.visible}
                  onChange={(e) => handleChange('visible', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 focus:ring-2 focus:ring-offset-0"
                  style={{ 
                    accentColor: '#046f78',
                    '--tw-ring-color': '#046f78'
                  } as React.CSSProperties & { accentColor?: string }}
                />
                <label htmlFor="visible" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Visible dans le catalogue utilisateur
                </label>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-4" style={{ color: '#046f78' }}>
                Temps estimés
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Temps de paramétrage (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.setupTime ?? ''}
                    onChange={(e) => handleChange('setupTime', e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0 outline-none transition bg-white"
                    onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                    placeholder="Ex: 5"
                  />
                  <p className="text-xs text-slate-500 mt-1">Temps nécessaire pour configurer le template</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Temps d'exécution (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.executionTime ?? ''}
                    onChange={(e) => handleChange('executionTime', e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0 outline-none transition bg-white"
                    onFocus={(e) => e.currentTarget.style.borderColor = '#046f78'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                    placeholder="Ex: 2"
                  />
                  <p className="text-xs text-slate-500 mt-1">Temps moyen d'exécution du workflow</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Workflow JSON
              </label>
              <textarea
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-offset-0 outline-none font-mono text-sm transition ${
                  jsonError ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                }`}
                style={!jsonError ? { 
                  '--tw-ring-color': '#046f78',
                  focusRingColor: '#046f78'
                } as React.CSSProperties & { focusRingColor?: string } : undefined}
                onFocus={(e) => !jsonError && (e.currentTarget.style.borderColor = '#046f78')}
                onBlur={(e) => !jsonError && (e.currentTarget.style.borderColor = '#cbd5e1')}
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
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition font-medium"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 text-white rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 flex items-center space-x-2"
              style={{ background: 'linear-gradient(to right, #046f78, #034a52)' }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'linear-gradient(to right, #034a52, #023a42)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'linear-gradient(to right, #046f78, #034a52)';
                }
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Sauvegarder</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
