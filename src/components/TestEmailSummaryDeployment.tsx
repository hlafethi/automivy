import React, { useState } from 'react';
import { DeployEmailSummaryWorkflow } from './DeployEmailSummaryWorkflow';

export const TestEmailSummaryDeployment: React.FC = () => {
  const [deployedWorkflows, setDeployedWorkflows] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSuccess = (workflowId: string) => {
    console.log('✅ Workflow déployé avec succès:', workflowId);
    setDeployedWorkflows(prev => [...prev, workflowId]);
    setErrors([]);
  };

  const handleError = (error: string) => {
    console.error('❌ Erreur déploiement:', error);
    setErrors(prev => [...prev, error]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">
        🚀 Test Déploiement Email Summary
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulaire de déploiement */}
        <div>
          <DeployEmailSummaryWorkflow
            userId="test-user-123"
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>

        {/* Résultats */}
        <div className="space-y-6">
          {/* Workflows déployés */}
          {deployedWorkflows.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-3">
                ✅ Workflows déployés ({deployedWorkflows.length})
              </h3>
              <ul className="space-y-2">
                {deployedWorkflows.map((workflowId, index) => (
                  <li key={index} className="text-sm text-green-700">
                    <span className="font-mono bg-green-100 px-2 py-1 rounded">
                      {workflowId}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Erreurs */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-3">
                ❌ Erreurs ({errors.length})
              </h3>
              <ul className="space-y-2">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">
              📋 Instructions
            </h3>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li>Remplissez le formulaire avec vos informations email</li>
              <li>Le système créera automatiquement les credentials IMAP et SMTP</li>
              <li>Un workflow Email Summary sera déployé dans n8n</li>
              <li>Le workflow analysera vos emails quotidiennement</li>
              <li>Vous recevrez un résumé par email</li>
            </ol>
          </div>

          {/* Fonctionnalités */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              🔧 Fonctionnalités automatiques
            </h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li><strong>Credentials IMAP</strong> : Lecture automatique de vos emails</li>
              <li><strong>Credentials SMTP</strong> : Envoi depuis votre adresse</li>
              <li><strong>IA OpenRouter</strong> : Analyse intelligente des emails</li>
              <li><strong>Mémoire</strong> : Contexte entre les exécutions</li>
              <li><strong>Résumé HTML</strong> : Email formaté et professionnel</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestEmailSummaryDeployment;
