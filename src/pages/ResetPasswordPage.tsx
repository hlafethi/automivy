import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ResetPasswordForm from '../components/ResetPasswordForm';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const handleSuccess = (message: string) => {
    console.log('✅ Réinitialisation réussie:', message);
  };

  const handleError = (error: string) => {
    console.error('❌ Erreur réinitialisation:', error);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚀 Automivy
          </h1>
          <p className="text-gray-600">
            Réinitialisation de mot de passe
          </p>
        </div>

        {token ? (
          <ResetPasswordForm
            token={token}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        ) : (
          <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold mb-4 text-red-600">
                Token manquant
              </h2>
              <p className="text-gray-600 mb-6">
                Le lien de réinitialisation ne contient pas de token valide.
              </p>
              <button
                onClick={() => window.location.href = '/forgot-password'}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Demander un nouveau lien
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
