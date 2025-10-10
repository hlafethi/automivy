import { apiClient } from '../lib/api';
import { OAuthCredential } from '../types';

export class OAuthService {
  async getOAuthCredentials(provider?: string): Promise<OAuthCredential[]> {
    return apiClient.getOAuthCredentials(provider);
  }

  async createOAuthCredential(
    provider: string,
    encryptedData: any,
    n8nCredentialId?: string,
    email?: string,
    expiresAt?: string
  ): Promise<OAuthCredential> {
    return apiClient.createOAuthCredential(provider, encryptedData, n8nCredentialId, email, expiresAt);
  }

  async deleteOAuthCredential(id: string): Promise<void> {
    await apiClient.deleteOAuthCredential(id);
  }

  // Méthodes pour l'authentification OAuth (à implémenter selon les besoins)
  async initiateOAuthFlow(provider: string): Promise<string> {
    // Cette méthode devrait rediriger vers le fournisseur OAuth
    // Pour l'instant, on retourne une URL de redirection
    const baseUrls = {
      google: 'https://accounts.google.com/oauth/authorize',
      microsoft_outlook: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      slack: 'https://slack.com/oauth/v2/authorize'
    };

    const clientIds = {
      google: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      microsoft_outlook: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
      slack: import.meta.env.VITE_SLACK_CLIENT_ID
    };

    const redirectUris = {
      google: `${window.location.origin}/oauth/callback`,
      microsoft_outlook: `${window.location.origin}/oauth/callback`,
      slack: `${window.location.origin}/oauth/callback`
    };

    const scopes = {
      google: 'openid email profile',
      microsoft_outlook: 'openid email profile offline_access',
      slack: 'channels:read chat:write'
    };

    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('oauth_provider', provider);

    const params = new URLSearchParams({
      client_id: clientIds[provider as keyof typeof clientIds] || '',
      redirect_uri: redirectUris[provider as keyof typeof redirectUris],
      scope: scopes[provider as keyof typeof scopes],
      response_type: 'code',
      state: state
    });

    return `${baseUrls[provider as keyof typeof baseUrls]}?${params.toString()}`;
  }

  async handleOAuthCallback(code: string, state: string): Promise<OAuthCredential> {
    const storedState = localStorage.getItem('oauth_state');
    const provider = localStorage.getItem('oauth_provider');

    if (state !== storedState || !provider) {
      throw new Error('Invalid OAuth state');
    }

    // Ici, vous devriez échanger le code contre un token
    // Pour l'instant, on simule avec des données factices
    const mockTokens = {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      scope: 'mock_scope',
      token_type: 'Bearer'
    };

    const mockUserInfo = {
      email: 'user@example.com',
      name: 'User Name'
    };

    // Créer la credential OAuth
    return this.createOAuthCredential(
      provider,
      mockTokens,
      undefined,
      mockUserInfo.email,
      new Date(Date.now() + 3600000).toISOString() // 1 heure
    );
  }

  // Méthodes de compatibilité
  async getN8nCredentialId(provider: string): Promise<string> {
    const credentials = await this.getOAuthCredentials(provider);
    return credentials[0]?.n8n_credential_id || '';
  }
}