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
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        ) : field.type === 'number' ? (
          <input
            type="number"
            value={formData[field.name] || field.defaultValue || ''}
            onChange={(e) => handleInputChange(field.name, parseInt(e.target.value) || 0)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        ) : (
          <input
            type={field.type}
            value={formData[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? 'border-red-500' : 'border-gray-300'
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'select' && 'Sélectionner un workflow'}
            {step === 'configure' && 'Configuration des credentials'}
            {step === 'deploying' && 'Déploiement en cours...'}
            {step === 'success' && 'Déploiement réussi !'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {step === 'select' && (
            <div>
              <p className="text-gray-600 mb-4">
                Sélectionnez un workflow à déployer. Le système analysera automatiquement 
                les credentials requis et générera un formulaire personnalisé.
              </p>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {workflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      onClick={() => handleWorkflowSelect(workflow)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <h3 className="font-medium text-gray-900">{workflow.name}</h3>
                      {workflow.description && (
                        <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Créé le {new Date(workflow.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'configure' && formConfig && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900">{formConfig.title}</h3>
                <p className="text-gray-600 mt-1">{formConfig.description}</p>
              </div>

              {formConfig.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-3">{section.title}</h4>
                  {section.description && (
                    <p className="text-sm text-gray-600 mb-4">{section.description}</p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.fields.map(renderField)}
                  </div>
                </div>
              ))}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Retour
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
                      Déploiement...
                    </>
                  ) : (
                    formConfig.submitText
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'deploying' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Déploiement en cours...</h3>
              <p className="text-gray-600">
                Création des credentials et déploiement du workflow...
              </p>
            </div>
          )}

          {step === 'success' && deployedWorkflow && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Workflow déployé avec succès !</h3>
              <p className="text-gray-600 mb-4">
                Le workflow "{deployedWorkflow.name}" a été déployé et est maintenant actif.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
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
