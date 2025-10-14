import React, { useState } from 'react';
import { api } from '../lib/api';

interface DeployEmailSummaryWorkflowProps {
  userId: string;
  onSuccess?: (workflowId: string) => void;
  onError?: (error: string) => void;
}

export const DeployEmailSummaryWorkflow: React.FC<DeployEmailSummaryWorkflowProps> = ({
  userId,
  onSuccess,
  onError
}) => {
  const [formData, setFormData] = useState({
    userEmail: '',
    userPassword: '',
    userImapServer: 'imap.gmail.com'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 Déploiement workflow Email Summary...', {
        userId,
        userEmail: formData.userEmail,
        userImapServer: formData.userImapServer
      });

      const response = await api.post('/n8n/deploy-email-summary', {
        userId,
        userEmail: formData.userEmail,
        userPassword: formData.userPassword,
        userImapServer: formData.userImapServer
      });

      if (response.data.success) {
        console.log('✅ Workflow déployé:', response.data.workflowId);
        onSuccess?.(response.data.workflowId);
        setFormData({ userEmail: '', userPassword: '', userImapServer: 'imap.gmail.com' });
      } else {
        throw new Error(response.data.error || 'Erreur inconnue');
      }

    } catch (error: any) {
      console.error('❌ Erreur déploiement:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erreur lors du déploiement';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">
        📬 Déployer Email Summary
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="userEmail"
            name="userEmail"
            value={formData.userEmail}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="votre@email.com"
          />
        </div>

        <div>
          <label htmlFor="userPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Mot de passe
          </label>
          <input
            type="password"
            id="userPassword"
            name="userPassword"
            value={formData.userPassword}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Votre mot de passe"
          />
        </div>

        <div>
          <label htmlFor="userImapServer" className="block text-sm font-medium text-gray-700 mb-1">
            Serveur IMAP
          </label>
          <select
            id="userImapServer"
            name="userImapServer"
            value={formData.userImapServer}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="imap.gmail.com">Gmail</option>
            <option value="imap-mail.outlook.com">Outlook</option>
            <option value="imap.mail.yahoo.com">Yahoo</option>
            <option value="imap.orange.fr">Orange</option>
            <option value="imap.free.fr">Free</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Déploiement...' : 'Déployer le workflow'}
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-600">
        <p className="font-semibold">Ce qui sera créé automatiquement :</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>✅ Credential IMAP pour lire vos emails</li>
          <li>✅ Credential SMTP pour envoyer le résumé</li>
          <li>✅ Workflow automatisé avec IA</li>
          <li>✅ Résumé quotidien par email</li>
        </ul>
      </div>
    </div>
  );
};

export default DeployEmailSummaryWorkflow;
