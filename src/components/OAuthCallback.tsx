import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { oauthService } from '../services';

export function OAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing OAuth parameters');
        }

        setMessage('Exchanging authorization code...');
        const credential = await oauthService.handleOAuthCallback(code, state);

        setStatus('success');
        setMessage(`Successfully connected ${credential.provider}!`);

        setTimeout(() => {
          window.close();

          if (window.opener) {
            window.opener.postMessage(
              { type: 'oauth_success', provider: credential.provider },
              window.location.origin
            );
          }
        }, 2000);
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');

        setTimeout(() => {
          window.close();

          if (window.opener) {
            window.opener.postMessage(
              { type: 'oauth_error', error: error instanceof Error ? error.message : 'Unknown error' },
              window.location.origin
            );
          }
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
