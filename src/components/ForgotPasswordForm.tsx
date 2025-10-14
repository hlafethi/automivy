import React, { useState } from 'react';
import { apiClient } from '../lib/api';

interface ForgotPasswordFormProps {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  onBackToLogin?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
  onError,
  onBackToLogin
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔐 Demande de réinitialisation pour:', email);

      const response = await apiClient.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      if (response.success) {
        console.log('✅ Email de réinitialisation envoyé');
        setIsSubmitted(true);
        onSuccess?.(response.message);
      } else {
        throw new Error(response.error || 'Erreur inconnue');
      }

    } catch (error: any) {
      console.error('❌ Erreur demande réinitialisation:', error);
      const errorMessage = error.message || 'Erreur lors de l\'envoi de l\'email';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    onBackToLogin?.();
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold mb-4 text-green-600">
            Email envoyé !
          </h2>
          <p className="text-gray-600 mb-6">
            Nous avons envoyé un lien de réinitialisation à <strong>{email}</strong>
          </p>
          
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">📋 Prochaines étapes :</h3>
            <ul className="text-sm text-blue-700 text-left space-y-1">
              <li>• Vérifiez votre boîte email</li>
              <li>• Cliquez sur le lien de réinitialisation</li>
              <li>• Créez votre nouveau mot de passe</li>
              <li>• Le lien expire dans 24 heures</li>
            </ul>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleBackToLogin}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Retour à la connexion
            </button>
            <button
              onClick={() => {
                setIsSubmitted(false);
                setEmail('');
                setError(null);
              }}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Envoyer un autre email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <div className="text-center mb-6">
        <div className="text-4xl mb-4">🔐</div>
        <h2 className="text-2xl font-bold mb-2">
          Mot de passe oublié ?
        </h2>
        <p className="text-gray-600">
          Entrez votre adresse email pour recevoir un lien de réinitialisation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Adresse email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="votre@email.com"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={handleBackToLogin}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Retour à la connexion
        </button>
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">💡 Conseils :</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Vérifiez votre dossier spam</li>
          <li>• Le lien est valide 24 heures</li>
          <li>• Il ne peut être utilisé qu'une fois</li>
          <li>• Contactez le support si nécessaire</li>
        </ul>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
