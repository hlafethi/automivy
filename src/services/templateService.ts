import { apiClient } from '../lib/api';
import { Template } from '../types';

export class TemplateService {
  async getTemplates(): Promise<Template[]> {
    return apiClient.getTemplates();
  }

  async getTemplate(id: string): Promise<Template> {
    return apiClient.getTemplate(id);
  }

  async createTemplate(name: string, description: string, workflowData: any): Promise<Template> {
    return apiClient.createTemplate(name, description, workflowData);
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template> {
    return apiClient.updateTemplate(id, updates);
  }

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.deleteTemplate(id);
  }

  async getVisibleTemplates(): Promise<Template[]> {
    return apiClient.getVisibleTemplates();
  }

  async updateTemplateVisibility(id: string, visible: boolean): Promise<Template> {
    return apiClient.updateTemplateVisibility(id, visible);
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template> {
    return apiClient.updateTemplate(id, updates);
  }

  // Méthodes de compatibilité
  async getAllTemplates(): Promise<Template[]> {
    return this.getTemplates();
  }
}