import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export function OAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Finalisation de la connexion...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');
        const oauthError = params.get('oauth_error');
        const oauthSuccess = params.get('oauth_success');
        const email = params.get('email');

        // Le backend gère déjà le callback et redirige ici avec les paramètres
        if (oauthError) {
          let errorMessage = decodeURIComponent(oauthError);
          // Messages d'erreur plus clairs
          if (oauthError === 'code_expired') {
            errorMessage = 'Le code d\'autorisation a expiré. Veuillez réessayer en cliquant à nouveau sur "Connecter Microsoft Outlook".';
          } else if (oauthError === 'token_exchange_failed') {
            errorMessage = 'Échec de l\'échange du code d\'autorisation. Veuillez réessayer.';
          } else if (oauthError === 'config_missing') {
            errorMessage = 'Configuration OAuth manquante. Veuillez contacter l\'administrateur.';
          }
          throw new Error(errorMessage);
        }

        if (oauthSuccess) {
          setStatus('success');
          const provider = oauthSuccess; // oauthSuccess contient le nom du provider (gmail, google_sheets, google_drive, microsoft)
          const providerName = provider === 'microsoft' ? 'Microsoft Outlook' : 
                              provider === 'google' ? 'Google (tous services)' :
                              provider === 'google_sheets' ? 'Google Sheets' :
                              provider === 'google_drive' ? 'Google Drive' :
                              provider === 'google_docs' ? 'Google Docs' : 'Gmail';
          setMessage(`${providerName} connecté avec succès${email ? ` : ${decodeURIComponent(email)}` : ''} !`);
          
          setTimeout(() => {
            // Envoyer un message à la fenêtre parente si elle existe
            if (window.opener) {
              window.opener.postMessage(
                { type: 'oauth_success', provider: provider, email: email ? decodeURIComponent(email) : null },
                window.location.origin
              );
            }
            window.close();
          }, 2000);
          return;
        }

        // Si on a un code et un state, envoyer au backend pour traitement
        if (code && state) {
          setMessage('Traitement de l\'autorisation...');
          
          try {
            // Envoyer le code et le state au backend pour traitement
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3004/api'}/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            const data = await response.json();
            
            if (data.success && data.redirectUrl) {
              // Le backend a traité avec succès, rediriger vers l'URL fournie
              window.location.href = data.redirectUrl;
              return; // La redirection va changer l'URL et déclencher un nouveau rendu
            } else if (data.redirectUrl) {
              // Erreur, rediriger vers l'URL d'erreur
              window.location.href = data.redirectUrl;
              return;
            } else {
              throw new Error(data.error || 'Erreur lors du traitement OAuth');
            }
          } catch (fetchError) {
            console.error('Erreur lors de l\'appel au backend:', fetchError);
            throw fetchError;
          }
        } else {
          throw new Error('Paramètres OAuth manquants');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Échec de l\'authentification');

        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage(
              { type: 'oauth_error', error: error instanceof Error ? error.message : 'Erreur inconnue' },
              window.location.origin
            );
          }
          window.close();
        }, 3000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <h2 className="text-xl font-semibold text-slate-800">Authenticating</h2>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-600" />
              <h2 className="text-xl font-semibold text-slate-800">Success!</h2>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-600" />
              <h2 className="text-xl font-semibold text-slate-800">Error</h2>
            </>
          )}

          <p className="text-slate-600 text-center">{message}</p>

          {status !== 'loading' && (
            <p className="text-sm text-slate-500">This window will close automatically...</p>
          )}
        </div>
      </div>
    </div>
  );
}
