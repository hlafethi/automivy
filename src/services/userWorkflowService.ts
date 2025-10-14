import { apiClient } from '../lib/api';
import { n8nService } from './n8nService';

export interface UserWorkflow {
  id: string;
  userId: string;
  templateId: string;
  n8nWorkflowId: string;
  n8nCredentialId: string;
  name: string;
  description: string;
  schedule: string; // Format cron ou heure
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserWorkflowConfig {
  templateId: string;
  name: string;
  description: string;
  email: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  schedule: string; // Heure au format "14:30" ou cron
  userPreferences?: string;
}

class UserWorkflowService {
  /**
   * Crée un workflow personnalisé pour un utilisateur
   * 1. Récupère le template
   * 2. Crée le credential IMAP dans n8n
   * 3. Clone et personnalise le workflow
   * 4. Sauvegarde le mapping en BDD
   */
  async createUserWorkflow(config: UserWorkflowConfig, userId: string): Promise<UserWorkflow> {
    try {
      console.log('🔧 [UserWorkflowService] Création workflow utilisateur:', { userId, templateId: config.templateId });

      // 1. Récupérer le template depuis la BDD
      const template = await apiClient.getTemplate(config.templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // 2. Créer le credential IMAP dans n8n
      console.log('🔧 [UserWorkflowService] Création credential IMAP dans n8n...');
      const credentialData = {
        name: `IMAP-${userId}-${Date.now()}`,
        type: 'imap',
        data: {
          host: config.imapHost,
          port: config.imapPort,
          user: config.imapUser,
          password: config.imapPassword,
          secure: true
        }
      };

      const n8nCredential = await n8nService.createCredential(credentialData);
      console.log('✅ [UserWorkflowService] Credential créé:', n8nCredential.id);

      // 3. Cloner et personnaliser le workflow
      console.log('🔧 [UserWorkflowService] Clonage et personnalisation du workflow...');
      const personalizedWorkflow = await this.personalizeWorkflow(template, config, n8nCredential.id);
      
      // 4. Créer le workflow dans n8n
      const n8nWorkflow = await n8nService.createWorkflow(personalizedWorkflow);
      console.log('✅ [UserWorkflowService] Workflow créé dans n8n:', n8nWorkflow.id);

      // 5. Sauvegarder le mapping en BDD
      const userWorkflow = await apiClient.createUserWorkflow({
        userId,
        templateId: config.templateId,
        n8nWorkflowId: n8nWorkflow.id,
        n8nCredentialId: n8nCredential.id,
        name: config.name,
        description: config.description,
        schedule: config.schedule,
        isActive: true
      });

      console.log('✅ [UserWorkflowService] Workflow utilisateur créé avec succès');
      return userWorkflow;

    } catch (error) {
      console.error('❌ [UserWorkflowService] Erreur création workflow:', error);
      throw error;
    }
  }

  /**
   * Personnalise un workflow template pour un utilisateur spécifique
   */
  private async personalizeWorkflow(template: any, config: UserWorkflowConfig, credentialId: string): Promise<any> {
    // Le template.json est déjà un objet, pas besoin de JSON.parse
    const workflowData = typeof template.json === 'string' ? JSON.parse(template.json) : template.json;
    
    // 1. Remplacer les placeholders
    let workflowString = JSON.stringify(workflowData);
    
    // Remplacer les variables utilisateur
    workflowString = workflowString.replace(/\{\{USER_EMAIL\}\}/g, config.email);
    workflowString = workflowString.replace(/\{\{IMAP_SERVER\}\}/g, config.imapHost);
    workflowString = workflowString.replace(/\{\{IMAP_PASSWORD\}\}/g, config.imapPassword);
    workflowString = workflowString.replace(/\{\{USER_PREFERENCES\}\}/g, config.userPreferences || '');
    
    // 2. Personnaliser le nom
    const personalizedWorkflow = JSON.parse(workflowString);
    personalizedWorkflow.name = `${config.name} - ${config.email}`;

    // 3. Injecter le credential ID dans le node IMAP
    personalizedWorkflow.nodes.forEach((node: any) => {
      if (node.type === 'n8n-nodes-base.emailReadImap') {
        node.credentials = {
          imap: {
            id: credentialId,
            name: `IMAP-${config.email}`
          }
        };
      }
    });

    // 4. Personnaliser le scheduling
    this.personalizeSchedule(personalizedWorkflow, config.schedule);

    return personalizedWorkflow;
  }

  /**
   * Personnalise le déclencheur schedule selon les préférences utilisateur
   */
  private personalizeSchedule(workflow: any, schedule: string): void {
    const scheduleNode = workflow.nodes.find((node: any) => 
      node.type === 'n8n-nodes-base.scheduleTrigger'
    );

    if (scheduleNode && schedule) {
      // Convertir l'heure en format cron
      const [hours, minutes] = schedule.split(':').map(Number);
      scheduleNode.parameters.rule = {
        interval: [{
          field: 'cronExpression',
          cronExpression: `${minutes} ${hours} * * *` // Tous les jours à l'heure spécifiée
        }]
      };
    }
  }

  /**
   * Récupère tous les workflows d'un utilisateur
   */
  async getUserWorkflows(userId: string): Promise<UserWorkflow[]> {
    return apiClient.getUserWorkflows(userId);
  }

  /**
   * Active/désactive un workflow utilisateur
   */
  async toggleUserWorkflow(workflowId: string, active: boolean): Promise<UserWorkflow> {
    try {
      console.log(`🔧 [UserWorkflowService] Toggle workflow ${workflowId} to active: ${active}`);
      
      // 1. Récupérer le workflow pour obtenir l'ID n8n
      const userWorkflow = await apiClient.getUserWorkflow(workflowId);
      if (!userWorkflow) {
        throw new Error('User workflow not found');
      }

      // 2. Synchroniser avec n8n si l'ID n8n existe
      if (userWorkflow.n8n_workflow_id && userWorkflow.n8n_workflow_id.trim() !== '') {
        console.log(`🔧 [UserWorkflowService] Synchronisation avec n8n workflow ${userWorkflow.n8n_workflow_id}`);
        try {
          if (active) {
            await n8nService.activateWorkflow(userWorkflow.n8n_workflow_id);
            console.log('✅ [UserWorkflowService] Workflow activé sur n8n');
          } else {
            await n8nService.deactivateWorkflow(userWorkflow.n8n_workflow_id);
            console.log('✅ [UserWorkflowService] Workflow désactivé sur n8n');
          }
        } catch (n8nError) {
          console.error('❌ [UserWorkflowService] Erreur synchronisation n8n:', n8nError);
          // Continuer même si n8n échoue
        }
      } else {
        console.log('ℹ️ [UserWorkflowService] Pas d\'ID n8n, synchronisation BDD uniquement');
      }

      // 3. Mettre à jour en base de données
      const updatedWorkflow = await apiClient.toggleUserWorkflow(workflowId, active);
      console.log('✅ [UserWorkflowService] Workflow toggled in DB:', updatedWorkflow);
      return updatedWorkflow;
    } catch (error) {
      console.error('❌ [UserWorkflowService] Erreur lors du toggle workflow:', error);
      throw error;
    }
  }

  /**
   * Met à jour un workflow utilisateur
   */
  async updateUserWorkflow(workflowId: string, updates: Partial<UserWorkflow>): Promise<UserWorkflow> {
    console.log('🔧 [UserWorkflowService] Mise à jour workflow:', workflowId, updates);
    return apiClient.updateUserWorkflow(workflowId, updates);
  }

  /**
   * Planifie directement un webhook sans passer par n8n
   */
  async scheduleDirectWebhook(webhookUrl: string, schedule: string, userId: string): Promise<void> {
    try {
      console.log('🔧 [UserWorkflowService] Planification directe webhook:', { webhookUrl, schedule, userId });
      
      // Appeler le script de planification backend avec l'URL webhook directe
      const response = await fetch('http://localhost:3004/api/schedule-direct-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          userId,
          webhookUrl,
          schedule
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Schedule service error: ${error}`);
      }

      console.log('✅ [UserWorkflowService] Planification directe réussie');
      
    } catch (error) {
      console.error('❌ [UserWorkflowService] Erreur planification directe:', error);
      throw error;
    }
  }

  /**
   * Met à jour le schedule d'un workflow via webhook n8n
   */
  async updateN8nSchedule(n8nWorkflowId: string, schedule: string, userId: string): Promise<void> {
    try {
      console.log('🔧 [UserWorkflowService] Mise à jour schedule via webhook:', { n8nWorkflowId, schedule, userId });
      
      // Appeler le script de planification backend
      const response = await fetch('http://localhost:3004/api/schedule-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          userId,
          n8nWorkflowId,
          schedule
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Schedule service error: ${error}`);
      }

      console.log('✅ [UserWorkflowService] Schedule mis à jour via webhook');
      
    } catch (error) {
      console.error('❌ [UserWorkflowService] Erreur mise à jour schedule:', error);
      throw error;
    }
  }

  /**
   * Supprime un workflow utilisateur (cascade n8n + BDD)
   */
  async deleteUserWorkflow(workflowId: string): Promise<void> {
    try {
      console.log('🔧 [UserWorkflowService] Suppression workflow utilisateur:', workflowId);

      // 1. Récupérer les infos du workflow
      const userWorkflow = await apiClient.getUserWorkflow(workflowId);
      if (!userWorkflow) {
        throw new Error('User workflow not found');
      }

      // 2. Supprimer le workflow de n8n
      if (userWorkflow.n8n_workflow_id) {
        console.log('🔧 [UserWorkflowService] Suppression workflow n8n:', userWorkflow.n8n_workflow_id);
        await n8nService.deleteWorkflow(userWorkflow.n8n_workflow_id);
      }

      // 3. Supprimer le credential de n8n
      if (userWorkflow.n8n_credential_id) {
        console.log('🔧 [UserWorkflowService] Suppression credential n8n:', userWorkflow.n8n_credential_id);
        await n8nService.deleteCredential(userWorkflow.n8n_credential_id);
      }

      // 4. Supprimer de la BDD
      await apiClient.deleteUserWorkflow(workflowId);
      
      console.log('✅ [UserWorkflowService] Workflow utilisateur supprimé avec succès');

    } catch (error) {
      console.error('❌ [UserWorkflowService] Erreur suppression workflow:', error);
      throw error;
    }
  }

}

export const userWorkflowService = new UserWorkflowService();
