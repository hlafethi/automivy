// import { db } from '../lib/database'; // TODO: Utiliser quand nécessaire
import { n8nService } from './n8nService';

interface ApiKeyConfig {
  n8nCredentialType: string;
  keyField: string;
  additionalFields?: Record<string, any>;
}

const API_KEY_CONFIGS: Record<string, ApiKeyConfig> = {
  openrouter: {
    n8nCredentialType: 'openRouterApi',
    keyField: 'apiKey',
  },
  openai: {
    n8nCredentialType: 'openAiApi',
    keyField: 'apiKey',
  },
  anthropic: {
    n8nCredentialType: 'anthropicApi',
    keyField: 'apiKey',
  },
};

class ApiKeyManagementService {
  async createOrUpdateApiKey(provider: string, apiKey: string): Promise<string> {
    const config = API_KEY_CONFIGS[provider];
    if (!config) {
      throw new Error(`Unknown API key provider: ${provider}`);
    }

    // TODO: Récupérer l'utilisateur depuis le contexte d'authentification
    // const user = { id: 'current-user-id' }; // Placeholder

    // TODO: Récupérer la clé existante depuis PostgreSQL
    const existingKey: any = null; // Placeholder

    let n8nCredentialId: string;

    if (existingKey?.n8n_credential_id) {
      try {
        await n8nService.updateCredential(existingKey.n8n_credential_id, {
          [config.keyField]: apiKey,
          ...config.additionalFields,
        });
        n8nCredentialId = existingKey.n8n_credential_id;
      } catch (error) {
        console.error('Failed to update n8n credential, creating new one:', error);
        const n8nCred = await this.createN8nCredential(provider, apiKey, config);
        n8nCredentialId = n8nCred.id;
      }
    } else {
      const n8nCred = await this.createN8nCredential(provider, apiKey, config);
      n8nCredentialId = n8nCred.id;
    }

    if (existingKey) {
      // TODO: Mettre à jour la clé API dans PostgreSQL
      // await db.updateApiKey(existingKey.id, { api_key, n8n_credential_id: n8nCredentialId });
    } else {
      // TODO: Créer la clé API dans PostgreSQL
      // await db.createApiKey(provider, apiKey, '', user.id);
    }

    return n8nCredentialId;
  }

  private async createN8nCredential(
    provider: string,
    apiKey: string,
    config: ApiKeyConfig
  ): Promise<{ id: string }> {
    // TODO: Récupérer l'utilisateur depuis le contexte d'authentification
    const userEmail = 'user@example.com'; // Placeholder

    return await n8nService.createCredential({
      name: `${provider} - ${userEmail}`,
      type: config.n8nCredentialType,
      data: {
        [config.keyField]: apiKey,
        ...config.additionalFields,
      },
    });
  }

  async getApiKey(_provider: string): Promise<string | null> {
    // TODO: Récupérer l'utilisateur depuis le contexte d'authentification
    // const user = { id: 'current-user-id' }; // Placeholder

    // TODO: Récupérer la clé API depuis PostgreSQL
    const data: any = null; // Placeholder

    return data?.encrypted_key || null;
  }

  async getN8nCredentialId(_provider: string): Promise<string | null> {
    // TODO: Récupérer l'utilisateur depuis le contexte d'authentification
    // const user = { id: 'current-user-id' }; // Placeholder

    // TODO: Récupérer l'ID de credential n8n depuis PostgreSQL
    const data: any = null; // Placeholder

    return data?.n8n_credential_id || null;
  }
}

export const apiKeyManagementService = new ApiKeyManagementService();
