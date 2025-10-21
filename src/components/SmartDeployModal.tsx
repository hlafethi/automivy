import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { smartDeployService, FormConfig, CredentialField, WorkflowListItem } from '../services/smartDeployService';

interface SmartDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (workflow: any) => void;
}

interface FormData {
  [key: string]: string | number;
}

interface FormErrors {
  [key: string]: string;
}

export default function SmartDeployModal({ isOpen, onClose, onSuccess }: SmartDeployModalProps) {
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
      setWorkflows(response.workflows);
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
      
      const response = await smartDeployService.analyzeWorkflow(workflow.id);
      setSelectedWorkflow(workflow);
      setFormConfig(response.formConfig);
      setStep('configure');
    } catch (error: any) {
      setError('Erreur lors de l\'analyse du workflow');
      console.error('Erreur analyse workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldName: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
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
        if (field.required && (!formData[field.name] || formData[field.name].toString().trim() === '')) {
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
      
      const response = await smartDeployService.deployWorkflow(selectedWorkflow.id, formData);
      setDeployedWorkflow(response.workflow);
      setStep('success');
      
      // Appeler le callback de succès après un délai
      setTimeout(() => {
        onSuccess(response.workflow);
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

  const renderField = (field: CredentialField) => {
    const hasError = !!formErrors[field.name];
    
    return (
      <div key={field.name} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.type === 'password' ? (
          <input
            type="password"
            value={formData[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 ${
              hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400'
            }`}
          />
        ) : field.type === 'number' ? (
          <input
            type="number"
            value={formData[field.name] || field.defaultValue || ''}
            onChange={(e) => handleInputChange(field.name, parseInt(e.target.value) || 0)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 ${
              hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400'
            }`}
          />
        ) : (
          <input
            type={field.type}
            value={formData[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 ${
              hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400'
            }`}
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
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6 text-white">
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
                <p className="text-green-100 text-sm mt-1">
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
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
                  <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mb-4">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                  </div>
                  <p className="text-slate-600 font-medium">Chargement des workflows...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      onClick={() => handleWorkflowSelect(workflow)}
                      className="group p-6 border border-slate-200 rounded-xl hover:border-green-300 hover:bg-gradient-to-br hover:from-green-50 hover:to-white cursor-pointer transition-all duration-300 hover:shadow-lg"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300">
                          <span className="text-lg">⚡</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 group-hover:text-green-700 transition-colors">{workflow.name}</h3>
                          {workflow.description && (
                            <p className="text-sm text-slate-600 mt-2 line-clamp-2">{workflow.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                              {new Date(workflow.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                              Prêt à déployer
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'configure' && formConfig && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚙️</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">{formConfig.title}</h3>
                <p className="text-slate-600 max-w-2xl mx-auto">{formConfig.description}</p>
              </div>

              {formConfig.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mb-8 bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-green-700">{sectionIndex + 1}</span>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-800">{section.title}</h4>
                  </div>
                  {section.description && (
                    <p className="text-sm text-slate-600 mb-6 pl-11">{section.description}</p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {section.fields.map(renderField)}
                  </div>
                </div>
              ))}

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
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
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
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 animate-spin text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-800 mb-3">Déploiement en cours...</h3>
              <p className="text-slate-600 text-lg max-w-md mx-auto">
                Création des credentials et déploiement du workflow...
              </p>
              <div className="mt-6 bg-slate-50 rounded-xl p-4 max-w-md mx-auto">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Configuration des credentials...</span>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && deployedWorkflow && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-800 mb-3">Workflow déployé avec succès !</h3>
              <p className="text-slate-600 text-lg mb-6 max-w-md mx-auto">
                Le workflow "{deployedWorkflow.name}" a été déployé et est maintenant actif.
              </p>
              <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-6 max-w-md mx-auto shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center">
                    <span className="text-sm">🎉</span>
                  </div>
                  <h4 className="font-semibold text-green-800">Déploiement réussi</h4>
                </div>
                <p className="text-sm text-green-700">
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
