import { apiClient } from '../lib/api';

export interface CredentialField {
  name: string;
  label: string;
  type: 'email' | 'password' | 'text' | 'number' | 'oauth' | 'time';
  required: boolean;
  placeholder?: string;
  defaultValue?: any;
  provider?: string; // Pour les champs OAuth (gmail, google_sheets, etc.)
}

export interface CredentialConfig {
  type: string;
  name: string;
  description: string;
  fields: CredentialField[];
}

export interface FormConfig {
  title: string;
  description: string;
  sections: Array<{
    title: string;
    description: string;
    fields: CredentialField[];
  }>;
  submitText: string;
}

export interface WorkflowInfo {
  id: string;
  name: string;
  n8n_workflow_id: string;
}

export interface AnalyzeResponse {
  success: boolean;
  workflow: WorkflowInfo;
  requiredCredentials: CredentialConfig[];
  formConfig: FormConfig;
}

export interface DeployResponse {
  success: boolean;
  message: string;
  workflow: {
    id: string;
    name: string;
    n8n_workflow_id: string;
    status: string;
  };
}

export interface WorkflowListItem {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface WorkflowsResponse {
  success: boolean;
  workflows: WorkflowListItem[];
}

export const smartDeployService = {
  /**
   * Analyser un workflow et obtenir le formulaire dynamique
   */
  async analyzeWorkflow(workflowId: string): Promise<AnalyzeResponse> {
    console.log('🔍 [SmartDeployService] Analyse du workflow:', workflowId);
    
    try {
      const response = await apiClient.request('/smart-deploy/analyze', {
        method: 'POST',
        body: { workflowId }
      });
      
      console.log('✅ [SmartDeployService] Analyse terminée');
      return response;
    } catch (error) {
      console.error('❌ [SmartDeployService] Erreur analyse:', error);
      throw error;
    }
  },

  /**
   * Déployer un workflow avec injection automatique des credentials
   */
  async deployWorkflow(workflowId: string, credentials: Record<string, any>): Promise<DeployResponse> {
    console.log('🚀 [SmartDeployService] Déploiement du workflow:', workflowId);
    console.log('🚀 [SmartDeployService] Credentials:', Object.keys(credentials));
    
    try {
      const response = await apiClient.request('/smart-deploy/deploy', {
        method: 'POST',
        body: { workflowId, credentials }
      });
      
      console.log('✅ [SmartDeployService] Déploiement terminé');
      return response;
    } catch (error) {
      console.error('❌ [SmartDeployService] Erreur déploiement:', error);
      throw error;
    }
  },

  /**
   * Obtenir la liste des workflows disponibles
   */
  async getAvailableWorkflows(): Promise<WorkflowsResponse> {
    console.log('🔍 [SmartDeployService] Récupération des workflows disponibles');
    
    try {
      const response = await apiClient.request('/smart-deploy/workflows', {
        method: 'GET'
      });
      
      console.log('✅ [SmartDeployService] Workflows récupérés:', response.workflows.length);
      return response;
    } catch (error) {
      console.error('❌ [SmartDeployService] Erreur récupération workflows:', error);
      throw error;
    }
  }
};
