import React, { useState } from 'react';
import ForgotPasswordForm from '../components/ForgotPasswordForm';

const ForgotPasswordPage: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);

  const handleSuccess = (message: string) => {
    console.log('✅ Email envoyé:', message);
  };

  const handleError = (error: string) => {
    console.error('❌ Erreur envoi email:', error);
  };

  const handleBackToLogin = () => {
    setShowLogin(true);
    // Rediriger vers la page de login
    window.location.href = '/login';
  };

  if (showLogin) {
    return null; // La redirection se fait via window.location.href
  }

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

        <ForgotPasswordForm
          onSuccess={handleSuccess}
          onError={handleError}
          onBackToLogin={handleBackToLogin}
        />

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Vous vous souvenez de votre mot de passe ?{' '}
            <a
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Se connecter
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
