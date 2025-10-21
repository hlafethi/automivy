import { apiClient } from '../lib/api';
import { ApiKey } from '../types';

export class ApiKeyService {
  async getApiKeys(): Promise<ApiKey[]> {
    return apiClient.getApiKeys();
  }

  async createApiKey(name: string, key: string, service: string): Promise<ApiKey> {
    return apiClient.createApiKey(name, key, service);
  }

  async deleteApiKey(id: string): Promise<void> {
    await apiClient.deleteApiKey(id);
  }

  // Méthodes de compatibilité
  async getApiKey(service: string): Promise<string> {
    const keys = await this.getApiKeys();
    // Chercher par service ou par nom
    const apiKey = keys.find(k => k.service === service || k.name === service);
    return apiKey?.key || '';
  }

  async getActiveApiKeys(): Promise<ApiKey[]> {
    return this.getApiKeys();
  }
}