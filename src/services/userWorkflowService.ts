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
   * Planifie un workflow utilisateur avec webhook unique
   */
  async scheduleUserWorkflowWithWebhook(
    userId: string,
    n8nWorkflowId: string,
    schedule: string,
    userWorkflowId: string
  ): Promise<void> {
    try {
      console.log('🔧 [UserWorkflowService] Planification avec webhook unique:', {
        userId,
        n8nWorkflowId,
        schedule,
        userWorkflowId
      });
      
      const response = await fetch('http://localhost:3004/api/schedule-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          userId,
          n8nWorkflowId,
          schedule,
          userWorkflowId // Passer l'ID du workflow utilisateur pour récupérer le webhook unique
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Schedule service error: ${error}`);
      }

      console.log('✅ [UserWorkflowService] Planification avec webhook unique réussie');
      
    } catch (error) {
      console.error('❌ [UserWorkflowService] Erreur planification avec webhook unique:', error);
      throw error;
    }
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
   * La suppression de la BDD se fait toujours, même si n8n retourne une erreur
   */
  async deleteUserWorkflow(workflowId: string): Promise<void> {
    try {
      console.log('🔧 [UserWorkflowService] Suppression workflow utilisateur:', workflowId);

      // 1. Récupérer les infos du workflow
      const userWorkflow = await apiClient.getUserWorkflow(workflowId);
      if (!userWorkflow) {
        throw new Error('User workflow not found');
      }

      // 2. Récupérer les credentials AVANT de supprimer le workflow n8n
      // (une fois le workflow supprimé, on ne peut plus récupérer ses nœuds)
      const credentialsToDelete = new Set<string>(); // Utiliser un Set pour éviter les doublons
      const credentialsWithInfo = new Map<string, { name: string; type: string }>(); // Stocker nom et type
      
      // 2a. Récupérer depuis workflow_credentials (PRIORITAIRE - contient les credentials créés pour ce workflow)
      try {
        const response = await fetch(`http://localhost:3004/api/user-workflows/${workflowId}/credentials`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const workflowCredentials = await response.json();
        if (workflowCredentials && Array.isArray(workflowCredentials) && workflowCredentials.length > 0) {
          console.log(`🔧 [UserWorkflowService] ${workflowCredentials.length} credential(s) trouvé(s) dans workflow_credentials`);
          for (const cred of workflowCredentials) {
            const credId = cred.credential_id || cred.id;
            if (credId) {
              credentialsToDelete.add(credId);
              // Stocker les infos du credential
              if (cred.credential_name || cred.name) {
                credentialsWithInfo.set(credId, {
                  name: cred.credential_name || cred.name || '',
                  type: cred.credential_type || cred.type || ''
                });
              }
            }
          }
        }
      } catch (credListError: any) {
        console.warn('⚠️ [UserWorkflowService] Impossible de récupérer les credentials depuis workflow_credentials:', credListError.message);
      }
      
      // 2b. Récupérer aussi depuis le workflow n8n AVANT de le supprimer (pour les credentials non enregistrés)
      if (userWorkflow.n8n_workflow_id) {
        try {
          const n8nWorkflow = await n8nService.getWorkflow(userWorkflow.n8n_workflow_id);
          if (n8nWorkflow && n8nWorkflow.nodes) {
            console.log(`🔧 [UserWorkflowService] Récupération des credentials depuis le workflow n8n (${n8nWorkflow.nodes.length} nœuds)`);
            for (const node of n8nWorkflow.nodes) {
              if (node.credentials) {
                for (const [credType, credValue] of Object.entries(node.credentials)) {
                  if (credValue && typeof credValue === 'object' && 'id' in credValue) {
                    const credId = (credValue as any).id;
                    if (credId && typeof credId === 'string' && credId.length > 0) {
                      // Ne pas ajouter si déjà dans la liste (depuis workflow_credentials)
                      if (!credentialsToDelete.has(credId)) {
                        const credName = (credValue as any).name || '';
                        // Ignorer les credentials admin partagés (OpenRouter, SMTP admin) qui ne doivent pas être supprimés
                        // Mais inclure les credentials spécifiques au workflow (ex: "OpenRouter - CV-Analysis-user@...")
                        const isSharedAdminCred = (credName.toLowerCase().includes('admin') || 
                                                   credName.toLowerCase().includes('openrouter account') ||
                                                   credName.toLowerCase().includes('header auth account 2')) &&
                                                   !credName.includes('-'); // Les credentials spécifiques ont un "-" dans le nom
                        
                        if (!isSharedAdminCred) {
                          credentialsToDelete.add(credId);
                          credentialsWithInfo.set(credId, { name: credName, type: credType });
                          console.log(`🔍 [UserWorkflowService] Credential trouvé dans nœud ${node.name}: ${credName} (${credId})`);
                        } else {
                          console.log(`ℹ️ [UserWorkflowService] Credential partagé/admin ignoré: ${credName} (${credId})`);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (n8nWorkflowError: any) {
          console.warn('⚠️ [UserWorkflowService] Impossible de récupérer le workflow n8n pour extraire les credentials:', n8nWorkflowError.message);
        }
      }

      // 3. Supprimer le workflow de n8n (ne pas bloquer si erreur 404 - workflow déjà supprimé)
      if (userWorkflow.n8n_workflow_id) {
        console.log('🔧 [UserWorkflowService] Suppression workflow n8n:', userWorkflow.n8n_workflow_id);
        try {
          await n8nService.deleteWorkflow(userWorkflow.n8n_workflow_id);
          console.log('✅ [UserWorkflowService] Workflow n8n supprimé');
        } catch (n8nError: any) {
          // Si le workflow n'existe plus sur n8n (404), continuer quand même
          if (n8nError.message?.includes('404') || n8nError.message?.includes('Not Found')) {
            console.warn('⚠️ [UserWorkflowService] Workflow n8n déjà supprimé ou introuvable (404), continuation...');
          } else {
            console.error('❌ [UserWorkflowService] Erreur suppression workflow n8n:', n8nError);
            // Ne pas bloquer, continuer quand même
          }
        }
      }

      // 4. Ajouter le credential principal (n8n_credential_id) à la liste si présent
      if (userWorkflow.n8n_credential_id) {
        credentialsToDelete.add(userWorkflow.n8n_credential_id);
        console.log('🔧 [UserWorkflowService] Credential n8n principal ajouté à la liste:', userWorkflow.n8n_credential_id);
      }
      
      // 5. Supprimer tous les credentials trouvés (sauf les credentials partagés)
      if (credentialsToDelete.size > 0) {
        console.log(`🔧 [UserWorkflowService] ${credentialsToDelete.size} credential(s) unique(s) à vérifier`);
        
        // ⚠️ PROTECTION: Ne jamais supprimer les credentials partagés
        // - "Header Auth account 2" (partagé par tous les workflows)
        // - IDs possibles: o7MztG7VAoDGoDSp (ancien), hgQk9lN7epSIRRcg (nouveau)
        // - Credentials avec "OpenRouter account" ou "Header Auth account 2" dans le nom (sans template/user spécifique)
        const SHARED_CREDENTIAL_IDS = ['o7MztG7VAoDGoDSp', 'hgQk9lN7epSIRRcg', 'DJ4JtAswl4vKWvdI'];
        
        // Récupérer les noms des credentials depuis n8n si pas déjà dans credentialsWithInfo
        for (const credId of credentialsToDelete) {
          if (!credentialsWithInfo.has(credId)) {
            try {
              const cred = await n8nService.getCredential(credId).catch(() => null);
              if (cred && cred.name) {
                credentialsWithInfo.set(credId, { name: cred.name, type: cred.type || '' });
              }
            } catch (e) {
              // Ignorer si on ne peut pas récupérer le nom
            }
          }
        }
        
        const credentialsToDeleteFiltered = Array.from(credentialsToDelete).filter(credId => {
          // Protéger les IDs partagés connus
          if (SHARED_CREDENTIAL_IDS.includes(credId)) {
            console.log(`⚠️ [UserWorkflowService] PROTECTION: Credential partagé ignoré (ne sera pas supprimé): ${credId}`);
            return false;
          }
          
          // Protéger les credentials avec des noms partagés (sans template/user spécifique)
          const credInfo = credentialsWithInfo.get(credId);
          const credName = credInfo?.name || '';
          
          // Un credential est partagé si :
          // - Il contient "Header Auth account 2" dans le nom
          // - Il contient "OpenRouter account" SANS "-" (les credentials spécifiques ont un "-" dans le nom)
          const isSharedName = credName.toLowerCase().includes('header auth account 2') ||
                              (credName.toLowerCase().includes('openrouter account') && 
                               !credName.includes('-') && // Les credentials spécifiques ont un "-" dans le nom
                               !credName.toLowerCase().includes('cv-analysis') &&
                               !credName.toLowerCase().includes('pdf-analysis') &&
                               !credName.toLowerCase().includes('gmail-tri'));
          
          if (isSharedName) {
            console.log(`⚠️ [UserWorkflowService] PROTECTION: Credential partagé ignoré (ne sera pas supprimé): ${credId} (${credName})`);
            return false;
          }
          
          // ✅ Supprimer les credentials spécifiques au workflow (ex: "OpenRouter - CV-Analysis-user@...")
          // Ces credentials ont un nom avec "-" et contiennent le template/user
          return true;
        });
        
        if (credentialsToDeleteFiltered.length > 0) {
          console.log(`🔧 [UserWorkflowService] ${credentialsToDeleteFiltered.length} credential(s) spécifique(s) au workflow à supprimer`);
          for (const credId of credentialsToDeleteFiltered) {
            try {
              const credInfo = credentialsWithInfo.get(credId);
              const credName = credInfo?.name || credId;
              await n8nService.deleteCredential(credId);
              console.log(`✅ [UserWorkflowService] Credential supprimé: ${credName} (${credId})`);
            } catch (credError: any) {
              if (credError.message?.includes('404') || credError.message?.includes('Not Found')) {
                console.warn(`⚠️ [UserWorkflowService] Credential déjà supprimé (404): ${credId}`);
              } else {
                console.error(`❌ [UserWorkflowService] Erreur suppression credential ${credId}:`, credError);
              }
            }
          }
        } else {
          console.log('ℹ️ [UserWorkflowService] Aucun credential spécifique au workflow à supprimer (uniquement des credentials partagés/admin)');
        }
      } else {
        console.log('ℹ️ [UserWorkflowService] Aucun credential utilisateur à supprimer (peut-être uniquement des credentials admin)');
      }

      // 6. Supprimer de la BDD (TOUJOURS faire, même si n8n a échoué)
      console.log('🔧 [UserWorkflowService] Suppression de la base de données...');
      await apiClient.deleteUserWorkflow(workflowId);
      console.log('✅ [UserWorkflowService] Workflow supprimé de la base de données');
      
      console.log('✅ [UserWorkflowService] Workflow utilisateur supprimé avec succès');

    } catch (error) {
      console.error('❌ [UserWorkflowService] Erreur suppression workflow:', error);
      // Si c'est une erreur de BDD, la lancer
      // Si c'est une erreur n8n, on a déjà géré ça plus haut
      throw error;
    }
  }

  /**
   * Nettoie les workflows orphelins (supprimés sur n8n mais encore en BDD)
   */
  async cleanupOrphanedWorkflows(): Promise<{ cleanedCount: number; errors?: any[] }> {
    try {
      console.log('🧹 [UserWorkflowService] Nettoyage des workflows orphelins...');
      
      const response = await fetch('http://localhost:3004/api/user-workflows/cleanup-orphaned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cleanup service error: ${error}`);
      }

      const result = await response.json();
      console.log('✅ [UserWorkflowService] Nettoyage terminé:', result);
      return result;
      
    } catch (error) {
      console.error('❌ [UserWorkflowService] Erreur nettoyage workflows orphelins:', error);
      throw error;
    }
  }

}

export const userWorkflowService = new UserWorkflowService();
