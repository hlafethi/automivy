// Export des instances des services pour maintenir la compatibilité
import { TemplateService } from './templateService';
import { WorkflowService } from './workflowService';
import { ApiKeyService } from './apiKeyService';
import { OAuthService } from './oauthService';
import { EmailCredentialService } from './emailCredentialService';

// Créer des instances pour maintenir la compatibilité avec l'ancien code
export const templateService = new TemplateService();
export const workflowService = new WorkflowService();
export const apiKeyService = new ApiKeyService();
export const oauthService = new OAuthService();
// EmailCredentialService utilise des méthodes statiques, donc on l'exporte directement
export { EmailCredentialService as emailCredentialService };

// Export des classes pour les nouveaux usages
export { TemplateService, WorkflowService, ApiKeyService, OAuthService, EmailCredentialService };
