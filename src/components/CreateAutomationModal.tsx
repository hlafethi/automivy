import { useState, useEffect } from 'react';
import { X, Save, Loader2, Mail, Clock, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { userWorkflowService, UserWorkflowConfig } from '../services/userWorkflowService';
import { templateService } from '../services/templateService';
import { useAuth } from '../contexts/AuthContext';
import SmartDeployModal from './SmartDeployModal';

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
    userPreferences: '',
    storageType: 'google_sheets', // Type de stockage par défaut
    googleSheetsOAuth2: '', // Pour Google Sheets OAuth
    airtableApiKey: '', // Pour Airtable
    notionApiKey: '', // Pour Notion
    postgres_host: '', // Pour PostgreSQL
    postgres_database: '',
    postgres_user: '',
    postgres_password: '',
    postgres_port: 5432
  });
  
  const [selectedStorageType, setSelectedStorageType] = useState<string>('google_sheets');
  const [isCVScreening, setIsCVScreening] = useState(false);
  const [showSmartDeploy, setShowSmartDeploy] = useState(false);
  const [oauthConnected, setOauthConnected] = useState<Record<string, boolean>>({});

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
    // Détecter si c'est un workflow qui nécessite SmartDeployModal
    const templateNameLower = template.name?.toLowerCase() || '';
    const templateDescLower = template.description?.toLowerCase() || '';
    
    // Workflows CV (Screening ou Analysis)
    const isCV = templateNameLower.includes('cv screening') || 
                 templateNameLower.includes('cv analysis') ||
                 templateNameLower.includes('candidate evaluation') ||
                 templateDescLower.includes('cv screening') ||
                 templateDescLower.includes('cv analysis');
    
    // Workflows Email (Gmail Tri ou IMAP Tri)
    const isEmailWorkflow = templateNameLower.includes('gmail tri') ||
                            templateNameLower.includes('imap tri') ||
                            templateNameLower.includes('email tri') ||
                            templateDescLower.includes('gmail tri') ||
                            templateDescLower.includes('imap tri');
    
    // Workflows avec injecteur spécifique (PDF Analysis, etc.)
    const hasSpecificInjector = templateNameLower.includes('pdf analysis') ||
                                templateNameLower.includes('résume email') ||
                                templateNameLower.includes('resume email');
    
    // Si c'est un workflow qui nécessite SmartDeployModal, l'utiliser
    if (isCV || isEmailWorkflow || hasSpecificInjector) {
      setSelectedTemplate(template);
      setShowSmartDeploy(true);
      return;
    }
    
    // Sinon, utiliser le formulaire classique
    setSelectedTemplate(template);
    setIsCVScreening(false);
    
    setFormData(prev => ({
      ...prev,
      templateId: template.id,
      name: template.name || '',
      description: template.description || '',
      storageType: 'google_sheets'
    }));
  };

  const handleOAuthConnect = async (provider: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Appeler l'API backend pour initier le flux OAuth
      const response = await fetch(`http://localhost:3004/api/oauth/initiate/${provider}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        const errorMessage = errorData.message || errorData.details || errorData.error || 'Erreur lors de l\'initiation OAuth';
        console.error('❌ [CreateAutomationModal] Erreur OAuth:', errorData);
        throw new Error(errorMessage);
      }
      
      const { authUrl } = await response.json();
      
      // Ouvrir la fenêtre OAuth
      const oauthWindow = window.open(
        authUrl,
        'Google OAuth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );
      
      if (!oauthWindow) {
        throw new Error('La popup a été bloquée. Veuillez autoriser les popups pour ce site.');
      }
      
      // Variables pour gérer le cleanup
      let messageReceived = false;
      let cleanupDone = false;
      let timeoutId: NodeJS.Timeout | null = null;
      
      // Fonction de nettoyage
      const cleanup = () => {
        if (cleanupDone) return;
        cleanupDone = true;
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        if (oauthWindow && !oauthWindow.closed) {
          oauthWindow.close();
        }
        setLoading(false);
      };
      
      // Écouter le message du callback OAuth
      const messageHandler = (event: MessageEvent) => {
        // Vérifier l'origine pour la sécurité
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'oauth_success') {
          messageReceived = true;
          setOauthConnected(prev => ({ ...prev, [provider]: true }));
          setFormData(prev => ({ ...prev, googleSheetsOAuth2: 'connected' }));
          cleanup();
        } else if (event.data.type === 'oauth_error') {
          messageReceived = true;
          setError(`Erreur OAuth: ${event.data.error}`);
          cleanup();
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Timeout de sécurité (5 minutes)
      timeoutId = setTimeout(() => {
        if (!messageReceived) {
          setError('Le processus OAuth a pris trop de temps. Veuillez réessayer.');
          cleanup();
        }
      }, 300000);
      
      // Vérifier si la fenêtre est fermée manuellement
      const checkClosed = setInterval(() => {
        if (oauthWindow.closed && !messageReceived) {
          clearInterval(checkClosed);
          cleanup();
        }
      }, 500);
      
    } catch (error: any) {
      setError(`Erreur lors de la connexion OAuth: ${error.message}`);
      setLoading(false);
    }
  };

  // Si SmartDeploy est activé pour CV Screening, afficher SmartDeployModal
  if (showSmartDeploy && selectedTemplate) {
    return (
      <SmartDeployModal
        isOpen={true}
        initialTemplateId={selectedTemplate.id}
        onClose={() => {
          setShowSmartDeploy(false);
          setSelectedTemplate(null);
          onClose();
        }}
        onSuccess={() => {
          setShowSmartDeploy(false);
          setSelectedTemplate(null);
          onSuccess();
        }}
      />
    );
  }

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
                  <h4 className="text-lg font-semibold text-slate-800">
                    {isCVScreening ? 'Configuration Email et Stockage' : 'Configuration Email'}
                  </h4>
                </div>
                
                {/* Choix du type de stockage pour CV Screening */}
                {isCVScreening && (
                  <div className="mb-6 pb-6 border-b border-slate-200">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      💾 Type de stockage des résultats
                    </label>
                    <select
                      value={formData.storageType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setSelectedStorageType(newType);
                        handleChange('storageType', newType);
                        // Réinitialiser les credentials de stockage
                        setFormData(prev => ({
                          ...prev,
                          storageType: newType,
                          googleSheetsOAuth2: '',
                          airtableApiKey: '',
                          notionApiKey: '',
                          postgres_host: '',
                          postgres_database: '',
                          postgres_user: '',
                          postgres_password: '',
                          postgres_port: 5432
                        }));
                      }}
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
                    >
                      <option value="google_sheets">Google Sheets</option>
                      <option value="airtable">Airtable</option>
                      <option value="notion">Notion</option>
                      <option value="postgresql">PostgreSQL</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-2">
                      Choisissez où stocker les résultats de l'analyse des CV
                    </p>
                  </div>
                )}
                
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
                
                {/* Credentials de stockage conditionnels pour CV Screening */}
                {isCVScreening && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h5 className="text-sm font-semibold text-slate-700 mb-4">
                      🔐 Credentials de stockage
                    </h5>
                    
                    {selectedStorageType === 'google_sheets' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Connecter Google Sheets
                        </label>
                        {oauthConnected['google_sheets'] ? (
                          <div className="w-full px-4 py-3 bg-green-50 border border-green-200 text-green-700 font-medium rounded-xl flex items-center justify-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            Connecté avec succès
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOAuthConnect('google_sheets')}
                            disabled={loading}
                            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            {loading ? 'Connexion...' : 'Connecter Google Sheets'}
                          </button>
                        )}
                      </div>
                    )}
                    
                    {selectedStorageType === 'airtable' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Clé API Airtable
                        </label>
                        <input
                          type="password"
                          value={formData.airtableApiKey}
                          onChange={(e) => handleChange('airtableApiKey', e.target.value)}
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
                          placeholder="pat..."
                          required
                        />
                      </div>
                    )}
                    
                    {selectedStorageType === 'notion' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Clé API Notion
                        </label>
                        <input
                          type="password"
                          value={formData.notionApiKey}
                          onChange={(e) => handleChange('notionApiKey', e.target.value)}
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
                          placeholder="secret_..."
                          required
                        />
                      </div>
                    )}
                    
                    {selectedStorageType === 'postgresql' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Hôte
                          </label>
                          <input
                            type="text"
                            value={formData.postgres_host}
                            onChange={(e) => handleChange('postgres_host', e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200 hover:border-slate-400"
                            placeholder="localhost"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Base de données
                          </label>
                          <input
                            type="text"
                            value={formData.postgres_database}
                            onChange={(e) => handleChange('postgres_database', e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200 hover:border-slate-400"
                            placeholder="mydb"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Utilisateur
                          </label>
                          <input
                            type="text"
                            value={formData.postgres_user}
                            onChange={(e) => handleChange('postgres_user', e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200 hover:border-slate-400"
                            placeholder="postgres"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Mot de passe
                          </label>
                          <input
                            type="password"
                            value={formData.postgres_password}
                            onChange={(e) => handleChange('postgres_password', e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200 hover:border-slate-400"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Port
                          </label>
                          <input
                            type="number"
                            value={formData.postgres_port}
                            onChange={(e) => handleChange('postgres_port', parseInt(e.target.value) || 5432)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none transition-all duration-200 hover:border-slate-400"
                            placeholder="5432"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
