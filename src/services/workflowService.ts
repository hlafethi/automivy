import { apiClient } from '../lib/api';
import { Workflow } from '../types';
import { n8nService } from './n8nService';

export class WorkflowService {
  async getWorkflows(): Promise<Workflow[]> {
    return apiClient.getWorkflows();
  }

  async getWorkflow(id: string): Promise<Workflow> {
    return apiClient.getWorkflow(id);
  }

  async createWorkflow(name: string, description: string, workflowData: any, n8nWorkflowId?: string, templateId?: string): Promise<Workflow> {
    return apiClient.createWorkflow(name, description, workflowData, n8nWorkflowId, templateId);
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    return apiClient.updateWorkflow(id, updates);
  }

  async deleteWorkflow(id: string): Promise<void> {
    console.log('🔍 [WorkflowService] deleteWorkflow appelé avec ID:', id);
    try {
      await apiClient.deleteWorkflow(id);
      console.log('✅ [WorkflowService] deleteWorkflow terminé avec succès');
    } catch (error) {
      console.error('❌ [WorkflowService] Erreur dans deleteWorkflow:', error);
      throw error;
    }
  }

  // Méthodes de compatibilité
  async getUserWorkflows(): Promise<Workflow[]> {
    return this.getWorkflows();
  }

  async toggleWorkflow(id: string, active: boolean): Promise<Workflow> {
    // Récupérer le workflow pour obtenir l'ID n8n
    const workflow = await this.getWorkflow(id);
    
    // Mettre à jour en base de données
    const updatedWorkflow = await this.updateWorkflow(id, { active });
    
    // Synchroniser avec n8n si l'ID n8n existe et n'est pas vide
    if (workflow.n8n_workflow_id && workflow.n8n_workflow_id.trim() !== '') {
      try {
        console.log(`${active ? 'Activation' : 'Désactivation'} du workflow ${workflow.n8n_workflow_id} sur n8n...`);
        if (active) {
          await n8nService.activateWorkflow(workflow.n8n_workflow_id);
        } else {
          await n8nService.deactivateWorkflow(workflow.n8n_workflow_id);
        }
        console.log(`Workflow ${active ? 'activé' : 'désactivé'} sur n8n avec succès`);
      } catch (error) {
        console.error('Erreur lors de la synchronisation avec n8n:', error);
        // Ne pas faire échouer la mise à jour en base si n8n échoue
      }
    } else {
      console.log(`Workflow ${active ? 'activé' : 'désactivé'} en base de données uniquement (pas d'ID n8n associé)`);
    }
    
    return updatedWorkflow;
  }
}