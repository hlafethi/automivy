import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { smartDeployService, FormConfig, CredentialField, WorkflowListItem } from '../services/smartDeployService';

interface SmartDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (workflow?: any) => void;
  initialTemplateId?: string; // Template ID à sélectionner automatiquement
}

interface FormData {
  [key: string]: string | number;
}

interface FormErrors {
  [key: string]: string;
}

export default function SmartDeployModal({ isOpen, onClose, onSuccess, initialTemplateId }: SmartDeployModalProps) {
  console.log('🔧 [SmartDeployModal] Rendu du composant, isOpen:', isOpen);
  const [step, setStep] = useState<'select' | 'configure' | 'deploying' | 'success'>('select');
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowListItem | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployedWorkflow, setDeployedWorkflow] = useState<any>(null);
  const [selectedStorageType, setSelectedStorageType] = useState<string>('');

  // Charger les workflows disponibles
  useEffect(() => {
    if (isOpen && step === 'select') {
      loadWorkflows();
    }
  }, [isOpen, step]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const response = await smartDeployService.getAvailableWorkflows();
      // Le format standardisé est { success: true, data: { workflows: [...] } }
      const workflows = response.data?.workflows || [];
      setWorkflows(workflows);
      
      // Si un templateId initial est fourni, sélectionner automatiquement le workflow
      if (initialTemplateId && workflows.length > 0) {
        const matchingWorkflow = workflows.find(w => w.id === initialTemplateId);
        if (matchingWorkflow) {
          console.log('🔧 [SmartDeployModal] Sélection automatique du workflow:', matchingWorkflow.name);
          // Attendre un peu pour que les workflows soient chargés, puis sélectionner
          setTimeout(() => {
            handleWorkflowSelect(matchingWorkflow);
          }, 100);
        }
      }
    } catch (error: any) {
      setError('Erreur lors du chargement des workflows');
      console.error('Erreur chargement workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowSelect = async (workflow: WorkflowListItem) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 [SmartDeployModal] Workflow sélectionné:');
      console.log('  - ID:', workflow.id);
      console.log('  - Nom:', workflow.name);
      console.log('  - Description:', workflow.description);
      
      const response = await smartDeployService.analyzeWorkflow(workflow.id);
      // Le format standardisé est { success: true, data: { workflow, requiredCredentials, formConfig } }
      const data = response.data || response; // Fallback pour compatibilité
      const formConfig = data.formConfig || response.formConfig;
      console.log('🔍 [SmartDeployModal] Réponse analyse:', response);
      console.log('🔍 [SmartDeployModal] FormConfig reçu:', formConfig);
      console.log('🔍 [SmartDeployModal] Sections:', formConfig?.sections);
      console.log('🔍 [SmartDeployModal] Nombre de sections:', formConfig?.sections?.length);
      formConfig?.sections?.forEach((section, index) => {
        console.log(`  Section ${index + 1}: ${section.title} - ${section.fields?.length || 0} champ(s)`);
        section.fields?.forEach((field, fieldIndex) => {
          console.log(`    Champ ${fieldIndex + 1}: ${field.name} (${field.type}) - ${field.label}`);
        });
      });
      setSelectedWorkflow(workflow);
      setFormConfig(formConfig);
      
      // Initialiser storageType si présent dans le formulaire
      const storageTypeField = formConfig?.sections
        .flatMap(s => s.fields)
        .find(f => f.name === 'storageType');
      if (storageTypeField) {
        const defaultValue = storageTypeField.defaultValue || (storageTypeField.options && storageTypeField.options[0]?.value) || '';
        if (defaultValue) {
          console.log('🔧 [SmartDeployModal] Initialisation storageType:', defaultValue);
          setSelectedStorageType(defaultValue);
          setFormData(prev => ({ ...prev, storageType: defaultValue }));
        }
      }
      
      setStep('configure');
    } catch (error: any) {
      setError('Erreur lors de l\'analyse du workflow');
      console.error('Erreur analyse workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldName: string, value: string | number) => {
    // Si c'est le champ storageType, mettre à jour l'état et réinitialiser les credentials de stockage
    if (fieldName === 'storageType') {
      console.log('🔧 [SmartDeployModal] Changement storageType:', value);
      setSelectedStorageType(value as string);
      // Réinitialiser les credentials de stockage non sélectionnés
      const storageCredFields = ['googleSheetsOAuth2', 'airtableApiKey', 'notionApiKey', 'postgres_host', 'postgres_database', 'postgres_user', 'postgres_password', 'postgres_port'];
      setFormData(prev => {
        const newData = { ...prev, [fieldName]: value };
        // Supprimer les anciens credentials de stockage
        storageCredFields.forEach(field => {
          delete newData[field];
        });
        console.log('🔍 [SmartDeployModal] formData après changement storageType:', newData);
        return newData;
      });
    } else {
      setFormData(prev => {
        const newData = { ...prev, [fieldName]: value };
        if (fieldName.includes('OAuth') || fieldName.includes('google')) {
          console.log('🔍 [SmartDeployModal] Champ OAuth/Google changé:', fieldName, '=', value);
          console.log('🔍 [SmartDeployModal] formData mis à jour:', newData);
        }
        return newData;
      });
    }
    
    // Effacer l'erreur pour ce champ
    if (formErrors[fieldName]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!formConfig) return false;
    
    formConfig.sections.forEach(section => {
      section.fields.forEach(field => {
        // Pour les champs OAuth, on accepte si l'utilisateur a cliqué sur "Connecter"
        if (field.type === 'oauth') {
          if (field.required && !formData[field.name]) {
            errors[field.name] = `Veuillez connecter ${field.label}`;
          }
        } else if (field.required && (!formData[field.name] || formData[field.name].toString().trim() === '')) {
          errors[field.name] = `${field.label} est requis`;
        }
      });
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDeploy = async () => {
    if (!validateForm() || !selectedWorkflow) return;
    
    try {
      setLoading(true);
      setError(null);
      setStep('deploying');
      
      console.log('🚀 [SmartDeployModal] Déploiement du workflow:');
      console.log('  - ID:', selectedWorkflow.id);
      console.log('  - Nom:', selectedWorkflow.name);
      console.log('  - Description:', selectedWorkflow.description);
      console.log('🔍 [SmartDeployModal] formData complet:', formData);
      console.log('🔍 [SmartDeployModal] googleSheetsOAuth2 dans formData:', formData.googleSheetsOAuth2);
      console.log('🔍 [SmartDeployModal] Tous les champs OAuth dans formData:', Object.keys(formData).filter(key => key.includes('OAuth')));
      
      const response = await smartDeployService.deployWorkflow(selectedWorkflow.id, formData);
      // Le format standardisé est { success: true, data: { workflow: {...} } }
      const workflow = response.data?.workflow || response.workflow;
      setDeployedWorkflow(workflow);
      setStep('success');
      
      // Appeler le callback de succès après un délai
      setTimeout(() => {
        onSuccess(workflow);
        handleClose();
      }, 2000);
      
    } catch (error: any) {
      setError('Erreur lors du déploiement du workflow');
      console.error('Erreur déploiement:', error);
      setStep('configure');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedWorkflow(null);
    setFormConfig(null);
    setFormData({});
    setFormErrors({});
    setError(null);
    setDeployedWorkflow(null);
    onClose();
  };

  const handleOAuthConnect = async (provider: string, fieldName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 [SmartDeployModal] handleOAuthConnect appelé:', { provider, fieldName });
      
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
        console.error('❌ [SmartDeployModal] Erreur OAuth:', errorData);
        
        // Si c'est une erreur de configuration, afficher un message plus clair
        if (errorMessage.includes('non configuré') || errorMessage.includes('GOOGLE_CLIENT_ID')) {
          throw new Error('Google OAuth n\'est pas encore configuré. L\'administrateur doit configurer les credentials Google dans le backend. Cette fonctionnalité sera bientôt disponible.');
        }
        
        throw new Error(errorMessage);
      }
      
      const { authUrl } = await response.json();
      
      // Déterminer le nom de la fenêtre selon le provider
      const windowName = provider === 'microsoft' ? 'Microsoft Outlook OAuth' : 
                        provider === 'google_sheets' ? 'Google Sheets OAuth' : 
                        'Gmail OAuth';
      
      // Ouvrir la fenêtre OAuth
      const oauthWindow = window.open(
        authUrl,
        windowName,
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );
      
      // Variables pour gérer le cleanup
      let messageReceived = false;
      let cleanupDone = false;
      let timeoutId: NodeJS.Timeout | null = null;
      
      // Fonction de nettoyage
      const cleanup = () => {
        if (cleanupDone) return;
        cleanupDone = true;
        window.removeEventListener('message', handleMessage);
        if (timeoutId) clearTimeout(timeoutId);
        setLoading(false);
      };
      
      // Écouter le message du callback OAuth
      const handleMessage = (event: MessageEvent) => {
        // Vérifier l'origine pour la sécurité
        if (event.origin !== window.location.origin) return;
        
        messageReceived = true;
        
        if (event.data.type === 'oauth_success') {
          console.log('✅ [SmartDeployModal] OAuth success, mise à jour du champ:', fieldName);
          handleInputChange(fieldName, 'connected');
          setError(null);
          // La fenêtre OAuth se fermera automatiquement via OAuthCallback
          // Ne pas essayer de la fermer ici pour éviter les erreurs Cross-Origin-Opener-Policy
          cleanup();
        } else if (event.data.type === 'oauth_error') {
          setError(`Erreur OAuth: ${event.data.error}`);
          // La fenêtre OAuth se fermera automatiquement via OAuthCallback
          // Ne pas essayer de la fermer ici pour éviter les erreurs Cross-Origin-Opener-Policy
          cleanup();
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Timeout de sécurité : si aucun message n'est reçu après 5 minutes, nettoyer
      // Note: On ne peut pas utiliser window.closed à cause de Cross-Origin-Opener-Policy
      timeoutId = setTimeout(() => {
        if (!messageReceived) {
          setError('Le processus OAuth a pris trop de temps. Veuillez réessayer.');
          cleanup();
        }
      }, 300000); // 5 minutes
      
    } catch (error: any) {
      setError(`Erreur lors de la connexion OAuth: ${error.message}`);
      setLoading(false);
    }
  };

  const renderField = (field: CredentialField) => {
    const hasError = !!formErrors[field.name];
    
    // ⚠️ DEBUG: Log pour voir les valeurs du champ
    if (field.type === 'oauth') {
      console.log('🔍 [SmartDeployModal] Champ OAuth:', {
        name: field.name,
        label: field.label,
        provider: field.provider,
        type: field.type
      });
    }
    
    return (
      <div key={field.name} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.type === 'oauth' ? (
          <div className="space-y-2">
            {(() => {
              // Déterminer le texte du bouton une seule fois
              const label = field.label || '';
              const provider = field.provider || '';
              const name = field.name || '';
              let buttonText = 'Connecter Gmail'; // Par défaut
              
              console.log('🔍 [SmartDeployModal] Calcul buttonText:', { label, provider, name });
              
              // Vérifier le label d'abord
              if (label && (label.toLowerCase().includes('google sheets') || label.toLowerCase().includes('googlesheets'))) {
                buttonText = label; // "Connecter Google Sheets"
                console.log('✅ [SmartDeployModal] buttonText depuis label:', buttonText);
              } 
              // Vérifier Microsoft Outlook
              else if (label && (label.toLowerCase().includes('microsoft') || label.toLowerCase().includes('outlook'))) {
                buttonText = 'Connecter Microsoft Outlook';
                console.log('✅ [SmartDeployModal] buttonText depuis label (Microsoft):', buttonText);
              }
              // Vérifier le provider
              else if (provider === 'google_sheets') {
                buttonText = 'Connecter Google Sheets';
                console.log('✅ [SmartDeployModal] buttonText depuis provider:', buttonText);
              }
              else if (provider === 'microsoft') {
                buttonText = 'Connecter Microsoft Outlook';
                console.log('✅ [SmartDeployModal] buttonText depuis provider (Microsoft):', buttonText);
              }
              // Vérifier le nom du champ
              else if (name && name.toLowerCase().includes('googlesheets')) {
                buttonText = 'Connecter Google Sheets';
                console.log('✅ [SmartDeployModal] buttonText depuis name:', buttonText);
              }
              else if (name && (name.toLowerCase().includes('microsoft') || name.toLowerCase().includes('outlook'))) {
                buttonText = 'Connecter Microsoft Outlook';
                console.log('✅ [SmartDeployModal] buttonText depuis name (Microsoft):', buttonText);
              } else {
                console.log('⚠️ [SmartDeployModal] buttonText par défaut (Gmail):', buttonText);
              }
              
              console.log('🔍 [SmartDeployModal] buttonText final:', buttonText);
              
              // Déterminer le provider réel
              const actualProvider = provider || (name && name.toLowerCase().includes('microsoft') ? 'microsoft' : 'gmail');
              const isMicrosoft = actualProvider === 'microsoft' || label.toLowerCase().includes('microsoft') || label.toLowerCase().includes('outlook');
              
              return (
                <button
                  type="button"
                  onClick={() => handleOAuthConnect(actualProvider, field.name)}
                  className={`w-full px-4 py-3 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md ${
                    isMicrosoft 
                      ? 'bg-[#0078d4] hover:bg-[#106ebe]' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isMicrosoft ? (
                    // Icône Microsoft Outlook (logo officiel)
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <path d="M7.5 7.5h9v9h-9z" fill="#0078d4"/>
                      <path d="M7.5 2v5.5H2V7.5h5.5V2H7.5zm9 0v5.5H11V7.5h5.5V2H16.5zm-9 14.5V22h5.5v-5.5H7.5zm9 0V22H22v-5.5h-5.5z" fill="#0078d4"/>
                      <path d="M2 2h5.5v5.5H2V2zm14.5 0H22v5.5h-5.5V2zM2 16.5h5.5V22H2v-5.5zm14.5 0H22V22h-5.5v-5.5z" fill="#0078d4"/>
                    </svg>
                  ) : (
                    // Icône Google/Gmail
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {buttonText}
                </button>
              );
            })()}
            {formData[field.name] && (
              <p className="text-sm flex items-center gap-1" style={{ color: '#046f78' }}>
                <CheckCircle className="w-4 h-4" />
                {(() => {
                  // Utiliser la même logique que pour le bouton
                  const label = field.label || '';
                  const provider = field.provider || '';
                  const name = field.name || '';
                  
                  // Déterminer le provider réel (même logique que pour le bouton)
                  const actualProvider = provider || (name && name.toLowerCase().includes('microsoft') ? 'microsoft' : 'gmail');
                  const isMicrosoftProvider = actualProvider === 'microsoft' || 
                                              label.toLowerCase().includes('microsoft') || 
                                              label.toLowerCase().includes('outlook') ||
                                              name.toLowerCase().includes('microsoft') || 
                                              name.toLowerCase().includes('outlook');
                  
                  if (label.toLowerCase().includes('google sheets') || provider === 'google_sheets' || name.toLowerCase().includes('googlesheets')) {
                    return 'Google Sheets connecté avec succès';
                  }
                  if (isMicrosoftProvider) {
                    return 'Microsoft Outlook connecté avec succès';
                  }
                  return 'Gmail connecté avec succès';
                })()}
              </p>
            )}
          </div>
        ) : field.type === 'password' ? (
          <input
            type="password"
            value={formData[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all duration-200 ${
              hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400'
            }`}
            style={!hasError ? {
              '--tw-ring-color': '#046f78',
            } as React.CSSProperties & { '--tw-ring-color'?: string } : undefined}
            onFocus={(e) => {
              if (!hasError) {
                e.currentTarget.style.borderColor = '#046f78';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
              }
            }}
            onBlur={(e) => {
              if (!hasError) {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          />
        ) : field.type === 'time' ? (
          <input
            type="time"
            value={formData[field.name] || field.defaultValue || '09:00'}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder || 'HH:MM'}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all duration-200 ${
              hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400'
            }`}
            style={!hasError ? {
              '--tw-ring-color': '#046f78',
            } as React.CSSProperties & { '--tw-ring-color'?: string } : undefined}
            onFocus={(e) => {
              if (!hasError) {
                e.currentTarget.style.borderColor = '#046f78';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
              }
            }}
            onBlur={(e) => {
              if (!hasError) {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          />
        ) : field.type === 'number' ? (
          <input
            type="number"
            value={formData[field.name] || field.defaultValue || ''}
            onChange={(e) => handleInputChange(field.name, parseInt(e.target.value) || 0)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all duration-200 ${
              hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400'
            }`}
            style={!hasError ? {
              '--tw-ring-color': '#046f78',
            } as React.CSSProperties & { '--tw-ring-color'?: string } : undefined}
            onFocus={(e) => {
              if (!hasError) {
                e.currentTarget.style.borderColor = '#046f78';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
              }
            }}
            onBlur={(e) => {
              if (!hasError) {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          />
        ) : field.type === 'select' ? (
          <select
            value={formData[field.name] || field.defaultValue || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all duration-200 ${
              hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400'
            }`}
            style={!hasError ? {
              '--tw-ring-color': '#046f78',
            } as React.CSSProperties & { '--tw-ring-color'?: string } : undefined}
            onFocus={(e) => {
              if (!hasError) {
                e.currentTarget.style.borderColor = '#046f78';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
              }
            }}
            onBlur={(e) => {
              if (!hasError) {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field.type}
            value={formData[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none transition-all duration-200 ${
              hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400'
            }`}
            style={!hasError ? {
              '--tw-ring-color': '#046f78',
            } as React.CSSProperties & { '--tw-ring-color'?: string } : undefined}
            onFocus={(e) => {
              if (!hasError) {
                e.currentTarget.style.borderColor = '#046f78';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 111, 120, 0.1)';
              }
            }}
            onBlur={(e) => {
              if (!hasError) {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          />
        )}
        {hasError && (
          <p className="text-red-500 text-sm mt-1">{formErrors[field.name]}</p>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden border border-slate-200">
        {/* Header avec gradient */}
        <div className="px-8 py-6 text-white" style={{ background: 'linear-gradient(to right, #046f78, #034a52)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold">A</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {step === 'select' && '🚀 Smart Deploy'}
                  {step === 'configure' && '⚙️ Configuration'}
                  {step === 'deploying' && '⏳ Déploiement'}
                  {step === 'success' && '✅ Succès'}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  {step === 'select' && 'Sélectionnez un workflow à déployer'}
                  {step === 'configure' && 'Configurez vos credentials'}
                  {step === 'deploying' && 'Déploiement en cours...'}
                  {step === 'success' && 'Workflow déployé avec succès !'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
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

          {step === 'select' && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                  <span className="text-2xl">🚀</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Choisissez votre workflow</h3>
                <p className="text-slate-600 max-w-2xl mx-auto">
                  Sélectionnez un workflow à déployer. Le système analysera automatiquement 
                  les credentials requis et générera un formulaire personnalisé.
                </p>
              </div>
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#046f78' }} />
                  </div>
                  <p className="text-slate-600 font-medium">Chargement des workflows...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workflows.map((workflow) => {
                    console.log('🔍 [SmartDeployModal] Affichage workflow:', {
                      id: workflow.id,
                      name: workflow.name,
                      description: workflow.description?.substring(0, 50)
                    });
                    
                    return (
                      <div
                        key={workflow.id}
                        onClick={() => {
                          console.log('🔍 [SmartDeployModal] Clic sur workflow:', {
                            id: workflow.id,
                            name: workflow.name
                          });
                          handleWorkflowSelect(workflow);
                        }}
                        className="group p-6 border border-slate-200 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg"
                        style={{
                          borderColor: 'inherit'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#75ccd5';
                          e.currentTarget.style.background = 'linear-gradient(to bottom right, #e0f4f6, #ffffff)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                            <span className="text-lg">⚡</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 transition-colors" style={{ color: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.color = '#046f78'} onMouseLeave={(e) => e.currentTarget.style.color = '#1e293b'}>{workflow.name}</h3>
                            {workflow.description && (
                              <p className="text-sm text-slate-600 mt-2 line-clamp-2">{workflow.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                {new Date(workflow.created_at).toLocaleDateString()}
                              </span>
                              <span className="text-xs px-2 py-1 rounded-full" style={{ color: '#046f78', backgroundColor: '#e0f4f6', border: '1px solid #75ccd5' }}>
                                Prêt à déployer
                              </span>
                            </div>
                            <div className="mt-2">
                              <span className="text-xs text-slate-400 font-mono">ID: {workflow.id.substring(0, 8)}...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 'configure' && formConfig && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                  <span className="text-2xl">⚙️</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">{formConfig.title}</h3>
                <p className="text-slate-600 max-w-2xl mx-auto">{formConfig.description}</p>
              </div>

              {formConfig.sections.map((section, sectionIndex) => {
                // Vérifier si cette section contient storageType et des credentials conditionnels
                const storageTypeField = section.fields.find(f => f.name === 'storageType');
                const sectionWithConditional = (section as any).conditionalCredentials;
                
                // Filtrer les champs selon le storageType sélectionné
                let fieldsToRender = section.fields;
                
                // Si la section contient storageType, gérer l'affichage conditionnel
                if (storageTypeField && sectionWithConditional) {
                  // Toujours afficher le champ storageType
                  const otherFields = section.fields.filter(f => f.name !== 'storageType');
                  
                  if (selectedStorageType) {
                    // Si un type est sélectionné, afficher storageType + credentials du type choisi
                    const selectedCredential = sectionWithConditional.find(
                      (cc: any) => cc.storageValue === selectedStorageType
                    );
                    
                    if (selectedCredential && selectedCredential.credentialConfig) {
                      // Remplacer les champs par storageType + autres champs + credentials du type choisi
                      fieldsToRender = [
                        storageTypeField,
                        ...otherFields,
                        ...selectedCredential.credentialConfig.fields
                      ];
                    } else {
                      // Si pas de credential trouvé, afficher storageType + autres champs
                      fieldsToRender = [storageTypeField, ...otherFields];
                    }
                  } else {
                    // Si aucun type n'est sélectionné, afficher storageType + autres champs (pas de credentials de stockage)
                    fieldsToRender = [storageTypeField, ...otherFields];
                  }
                }
                
                return (
                  <div key={sectionIndex} className="mb-8 bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                        <span className="text-sm font-bold" style={{ color: '#046f78' }}>{sectionIndex + 1}</span>
                      </div>
                      <h4 className="text-lg font-semibold text-slate-800">{section.title}</h4>
                    </div>
                    {section.description && (
                      <p className="text-sm text-slate-600 mb-6 pl-11">{section.description}</p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {fieldsToRender.map(renderField)}
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-200">
                <button
                  onClick={() => setStep('select')}
                  className="px-6 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all duration-200 font-medium"
                >
                  ← Retour
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={loading}
                  className="px-8 py-3 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
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
                      <Loader2 className="w-5 h-5 animate-spin mr-2 inline" />
                      Déploiement...
                    </>
                  ) : (
                    <>
                      🚀 {formConfig.submitText}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'deploying' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#046f78' }} />
              </div>
              <h3 className="text-2xl font-semibold text-slate-800 mb-3">Déploiement en cours...</h3>
              <p className="text-slate-600 text-lg max-w-md mx-auto">
                Création des credentials et déploiement du workflow...
              </p>
              <div className="mt-6 bg-slate-50 rounded-xl p-4 max-w-md mx-auto">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#046f78' }}></div>
                  <span>Configuration des credentials...</span>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && deployedWorkflow && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: 'linear-gradient(to bottom right, #e0f4f6, #d1eef1)' }}>
                <CheckCircle className="w-10 h-10" style={{ color: '#046f78' }} />
              </div>
              <h3 className="text-2xl font-semibold text-slate-800 mb-3">Workflow déployé avec succès !</h3>
              <p className="text-slate-600 text-lg mb-6 max-w-md mx-auto">
                Le workflow "{deployedWorkflow.name}" a été déployé et est maintenant actif.
              </p>
              <div className="rounded-xl p-6 max-w-md mx-auto shadow-sm" style={{ background: 'linear-gradient(to right, #e0f4f6, #d1eef1)', border: '1px solid #75ccd5' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#75ccd5' }}>
                    <span className="text-sm">🎉</span>
                  </div>
                  <h4 className="font-semibold" style={{ color: '#034a52' }}>Déploiement réussi</h4>
                </div>
                <p className="text-sm" style={{ color: '#046f78' }}>
                  <strong>ID du workflow :</strong> {deployedWorkflow.n8n_workflow_id}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
