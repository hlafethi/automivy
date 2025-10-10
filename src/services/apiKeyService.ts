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
  async getApiKey(key: string): Promise<string> {
    const keys = await this.getApiKeys();
    const apiKey = keys.find(k => k.key === key);
    return apiKey?.key || '';
  }

  async getActiveApiKeys(): Promise<ApiKey[]> {
    return this.getApiKeys();
  }
}