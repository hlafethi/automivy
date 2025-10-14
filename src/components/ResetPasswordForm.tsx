import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

interface ResetPasswordFormProps {
  token: string;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  token,
  onSuccess,
  onError
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  // Valider le token au chargement
  useEffect(() => {
    const validateToken = async () => {
      try {
        console.log('🔍 Validation du token:', token);
        
        const response = await apiClient.request(`/auth/validate-reset-token/${token}`);
        
        if (response.success && response.valid) {
          console.log('✅ Token valide pour:', response.email);
          setEmail(response.email);
          setIsValid(true);
        } else {
          throw new Error(response.error || 'Token invalide');
        }
      } catch (error: any) {
        console.error('❌ Erreur validation token:', error);
        const errorMessage = error.message || 'Token invalide ou expiré';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsValidating(false);
      }
    };

    if (token) {
      validateToken();
    } else {
      setError('Token manquant');
      setIsValidating(false);
    }
  }, [token, onError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation côté client
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔐 Réinitialisation du mot de passe pour:', email);

      const response = await apiClient.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          newPassword
        })
      });

      if (response.success) {
        console.log('✅ Mot de passe réinitialisé avec succès');
        setIsSuccess(true);
        onSuccess?.(response.message);
      } else {
        throw new Error(response.error || 'Erreur inconnue');
      }

    } catch (error: any) {
      console.error('❌ Erreur réinitialisation:', error);
      const errorMessage = error.message || 'Erreur lors de la réinitialisation';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Affichage de chargement
  if (isValidating) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">
            Validation du lien...
          </h2>
          <p className="text-gray-500 mt-2">
            Vérification de la validité du lien de réinitialisation
          </p>
        </div>
      </div>
    );
  }

  // Affichage de succès
  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-4 text-green-600">
            Mot de passe modifié !
          </h2>
          <p className="text-gray-600 mb-6">
            Votre mot de passe a été réinitialisé avec succès.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-2">🎉 Félicitations !</h3>
            <p className="text-sm text-green-700">
              Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  // Affichage d'erreur si token invalide
  if (!isValid) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-4 text-red-600">
            Lien invalide
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'Ce lien de réinitialisation n\'est pas valide ou a expiré.'}
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800 mb-2">💡 Solutions :</h3>
            <ul className="text-sm text-red-700 text-left space-y-1">
              <li>• Demandez un nouveau lien de réinitialisation</li>
              <li>• Vérifiez que le lien n'a pas déjà été utilisé</li>
              <li>• Le lien expire après 24 heures</li>
              <li>• Contactez le support si le problème persiste</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.href = '/forgot-password'}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Demander un nouveau lien
          </button>
        </div>
      </div>
    );
  }

  // Formulaire de réinitialisation
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <div className="text-center mb-6">
        <div className="text-4xl mb-4">🔐</div>
        <h2 className="text-2xl font-bold mb-2">
          Nouveau mot de passe
        </h2>
        <p className="text-gray-600">
          Créez un nouveau mot de passe pour <strong>{email}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Nouveau mot de passe
          </label>
          <input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Minimum 8 caractères"
            disabled={isLoading}
            minLength={8}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirmer le mot de passe
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Répétez le mot de passe"
            disabled={isLoading}
            minLength={8}
          />
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !newPassword || !confirmPassword}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
        </button>
      </form>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">🔒 Sécurité :</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Utilisez au moins 8 caractères</li>
          <li>• Mélangez lettres, chiffres et symboles</li>
          <li>• Évitez les mots de passe courants</li>
          <li>• Ne partagez jamais votre mot de passe</li>
        </ul>
      </div>
    </div>
  );
};

export default ResetPasswordForm;
