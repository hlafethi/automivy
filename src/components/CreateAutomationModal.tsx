import { useState, useEffect } from 'react';
import { X, Save, Loader2, Mail, Clock, Settings, AlertCircle } from 'lucide-react';
import { userWorkflowService, UserWorkflowConfig } from '../services/userWorkflowService';
import { templateService } from '../services/templateService';
import { useAuth } from '../contexts/AuthContext';

interface CreateAutomationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAutomationModal({ onClose, onSuccess }: CreateAutomationModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [step, setStep] = useState<'select' | 'configure'>('select');
  
  const [formData, setFormData] = useState({
    templateId: '',
    name: '',
    description: '',
    email: '',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapUser: '',
    imapPassword: '',
    schedule: '09:00',
    userPreferences: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const visibleTemplates = await templateService.getVisibleTemplates();
      setTemplates(visibleTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTemplate) return;

    setLoading(true);
    setError(null);

    try {
      const config: UserWorkflowConfig = {
        templateId: formData.templateId,
        name: formData.name,
        description: formData.description,
        email: formData.email,
        imapHost: formData.imapHost,
        imapPort: formData.imapPort,
        imapUser: formData.imapUser,
        imapPassword: formData.imapPassword,
        schedule: formData.schedule,
        userPreferences: formData.userPreferences
      };

      await userWorkflowService.createUserWorkflow(config, user.id);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create automation');
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

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      templateId: template.id,
      name: template.name || '',
      description: template.description || ''
    }));
  };

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
                <h2 className="text-2xl font-bold">Create New Automation</h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  Configurez votre nouvelle automation
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

        <div className="p-8 overflow-y-auto max-h-[calc(95vh-200px)]">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg flex items-center shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          )}

          {!selectedTemplate ? (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                  <Mail className="w-8 h-8" style={{ color: '#046f78' }} />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Choisissez un template</h3>
                <p className="text-slate-600 max-w-2xl mx-auto">
                  Sélectionnez un template pour créer votre automation. Le système configurera automatiquement les paramètres nécessaires.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="group p-6 border border-slate-200 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg"
                    style={{
                      borderColor: selectedTemplate?.id === template.id ? '#046f78' : 'inherit',
                      background: selectedTemplate?.id === template.id ? 'linear-gradient(to bottom right, #e0f4f6, #ffffff)' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedTemplate?.id !== template.id) {
                        e.currentTarget.style.borderColor = '#75ccd5';
                        e.currentTarget.style.background = 'linear-gradient(to bottom right, #e0f4f6, #ffffff)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedTemplate?.id !== template.id) {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                        <Mail className="w-6 h-6" style={{ color: '#046f78' }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 transition-colors" 
                            style={{ color: selectedTemplate?.id === template.id ? '#046f78' : 'inherit' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#046f78'} 
                            onMouseLeave={(e) => {
                              if (selectedTemplate?.id !== template.id) {
                                e.currentTarget.style.color = '#1e293b';
                              }
                            }}>
                          {template.name}
                        </h3>
                        {template.description && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{template.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs px-2 py-1 rounded-full" style={{ color: '#046f78', backgroundColor: '#e0f4f6', border: '1px solid #75ccd5' }}>
                            Prêt à utiliser
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            <>
              {/* Basic Information Section */}
              <div className="mb-8 bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                    <span className="text-sm font-bold" style={{ color: '#046f78' }}>1</span>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-800">Informations de base</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nom de l'automation
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200 hover:border-slate-400"
                      style={{ 
                        '--tw-ring-color': '#046f78',
                      } as React.CSSProperties & { '--tw-ring-color'?: string }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#046f78';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder="Mon analyse d'emails"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Heure d'exécution
                    </label>
                    <input
                      type="time"
                      value={formData.schedule}
                      onChange={(e) => handleChange('schedule', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200 hover:border-slate-400"
                      style={{ 
                        '--tw-ring-color': '#046f78',
                      } as React.CSSProperties & { '--tw-ring-color'?: string }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#046f78';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description (Optionnel)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200 hover:border-slate-400"
                    style={{ 
                      '--tw-ring-color': '#046f78',
                    } as React.CSSProperties & { '--tw-ring-color'?: string }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#046f78';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    placeholder="Décrivez ce que fait cette automation..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Email Configuration Section */}
              <div className="mb-8 bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                    <span className="text-sm font-bold" style={{ color: '#046f78' }}>2</span>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-800">Configuration Email</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Adresse email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200 hover:border-slate-400"
                      style={{ 
                        '--tw-ring-color': '#046f78',
                      } as React.CSSProperties & { '--tw-ring-color'?: string }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#046f78';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder="votre-email@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Serveur IMAP
                    </label>
                    <input
                      type="text"
                      value={formData.imapHost}
                      onChange={(e) => handleChange('imapHost', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200 hover:border-slate-400"
                      style={{ 
                        '--tw-ring-color': '#046f78',
                      } as React.CSSProperties & { '--tw-ring-color'?: string }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#046f78';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder="imap.gmail.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nom d'utilisateur IMAP
                    </label>
                    <input
                      type="text"
                      value={formData.imapUser}
                      onChange={(e) => handleChange('imapUser', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200 hover:border-slate-400"
                      style={{ 
                        '--tw-ring-color': '#046f78',
                      } as React.CSSProperties & { '--tw-ring-color'?: string }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#046f78';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder="votre-email@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mot de passe IMAP
                    </label>
                    <input
                      type="password"
                      value={formData.imapPassword}
                      onChange={(e) => handleChange('imapPassword', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200 hover:border-slate-400"
                      style={{ 
                        '--tw-ring-color': '#046f78',
                      } as React.CSSProperties & { '--tw-ring-color'?: string }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#046f78';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder="Votre mot de passe ou mot de passe d'application"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* User Preferences Section */}
              <div className="mb-8 bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                    <span className="text-sm font-bold" style={{ color: '#046f78' }}>3</span>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-800">Préférences d'analyse (Optionnel)</h4>
                </div>
                <textarea
                  value={formData.userPreferences}
                  onChange={(e) => handleChange('userPreferences', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200 hover:border-slate-400"
                  style={{ 
                    '--tw-ring-color': '#046f78',
                  } as React.CSSProperties & { '--tw-ring-color'?: string }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#046f78';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="Décrivez vos préférences d'analyse d'emails..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between space-x-3 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setFormData({
                      templateId: '',
                      name: '',
                      description: '',
                      email: '',
                      imapHost: 'imap.gmail.com',
                      imapPort: 993,
                      imapUser: '',
                      imapPassword: '',
                      schedule: '09:00',
                      userPreferences: ''
                    });
                  }}
                  className="px-6 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition font-medium"
                  disabled={loading}
                >
                  ← Retour
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition font-medium"
                  disabled={loading}
                >
                  Annuler
                </button>
              <button
                type="submit"
                disabled={loading || !selectedTemplate}
                className="px-8 py-3 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center space-x-2"
                style={{ background: 'linear-gradient(to right, #046f78, #034a52)' }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = 'linear-gradient(to right, #034a52, #023a42)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = 'linear-gradient(to right, #046f78, #034a52)';
                  }
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Créer l'automation</span>
                  </>
                )}
              </button>
            </div>
            </>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
